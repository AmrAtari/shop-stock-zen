-- 1. Add approval workflow columns to purchase_orders
ALTER TABLE public.purchase_orders 
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_decided_by uuid,
  ADD COLUMN IF NOT EXISTS approval_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Add approval workflow columns to transfers
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_decided_by uuid,
  ADD COLUMN IF NOT EXISTS approval_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Update PO insert-time trigger: do NOT touch qty_on_order while awaiting_approval/rejected
CREATE OR REPLACE FUNCTION public.handle_po_item_insert_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    po_store_id uuid;
    po_status text;
    v_item_id uuid;
BEGIN
    SELECT store_id, status INTO po_store_id, po_status
    FROM public.purchase_orders WHERE po_id = NEW.po_id;

    -- Block inventory side-effects until PO is past approval gate
    IF po_status IN ('awaiting_approval', 'rejected', 'cancelled') THEN
        RETURN NEW;
    END IF;

    v_item_id := NULL;
    IF NEW.item_id IS NOT NULL AND NEW.item_id <> '' THEN
        BEGIN
            v_item_id := NEW.item_id::uuid;
        EXCEPTION WHEN others THEN
            v_item_id := NULL;
        END;
    END IF;

    IF v_item_id IS NULL THEN
        SELECT id INTO v_item_id FROM public.items WHERE sku = NEW.sku LIMIT 1;
    END IF;

    IF v_item_id IS NULL OR po_store_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.store_inventory (item_id, store_id, quantity, qty_on_order)
    VALUES (v_item_id, po_store_id, 0, NEW.quantity - NEW.received_quantity)
    ON CONFLICT (item_id, store_id)
    DO UPDATE SET 
        qty_on_order = public.store_inventory.qty_on_order + (NEW.quantity - NEW.received_quantity);

    RETURN NEW;
END;
$function$;

-- 4. Update PO receive trigger: ignore receives while awaiting_approval/rejected
CREATE OR REPLACE FUNCTION public.update_inventory_on_po_receive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_store_id UUID;
  v_status TEXT;
  v_item_id_uuid UUID;
  v_quantity_change INTEGER;
BEGIN
  SELECT store_id, status INTO v_store_id, v_status
  FROM purchase_orders WHERE po_id = NEW.po_id;

  IF v_status IN ('awaiting_approval', 'rejected', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF v_store_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_item_id_uuid := NEW.item_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    SELECT id INTO v_item_id_uuid FROM items WHERE sku = NEW.sku;
  END;

  IF v_item_id_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  v_quantity_change := NEW.received_quantity - COALESCE(OLD.received_quantity, 0);

  IF v_quantity_change != 0 THEN
    INSERT INTO store_inventory (item_id, store_id, quantity, qty_on_order)
    VALUES (v_item_id_uuid, v_store_id, v_quantity_change, -v_quantity_change)
    ON CONFLICT (item_id, store_id)
    DO UPDATE SET 
      quantity = store_inventory.quantity + v_quantity_change,
      qty_on_order = GREATEST(0, store_inventory.qty_on_order - v_quantity_change);
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. When a PO transitions FROM awaiting_approval to an active status,
--    backfill qty_on_order for its items (since the insert trigger was a no-op then).
CREATE OR REPLACE FUNCTION public.apply_po_approval_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  v_item_id uuid;
BEGIN
  IF OLD.status = 'awaiting_approval' AND NEW.status NOT IN ('awaiting_approval','rejected','cancelled') THEN
    FOR rec IN
      SELECT * FROM public.purchase_order_items WHERE po_id = NEW.po_id
    LOOP
      v_item_id := NULL;
      IF rec.item_id IS NOT NULL AND rec.item_id <> '' THEN
        BEGIN
          v_item_id := rec.item_id::uuid;
        EXCEPTION WHEN others THEN
          v_item_id := NULL;
        END;
      END IF;
      IF v_item_id IS NULL THEN
        SELECT id INTO v_item_id FROM public.items WHERE sku = rec.sku LIMIT 1;
      END IF;
      IF v_item_id IS NULL OR NEW.store_id IS NULL THEN CONTINUE; END IF;

      INSERT INTO public.store_inventory (item_id, store_id, quantity, qty_on_order)
      VALUES (v_item_id, NEW.store_id, 0, rec.quantity - COALESCE(rec.received_quantity,0))
      ON CONFLICT (item_id, store_id)
      DO UPDATE SET qty_on_order = public.store_inventory.qty_on_order + (rec.quantity - COALESCE(rec.received_quantity,0));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_apply_po_approval_inventory ON public.purchase_orders;
CREATE TRIGGER trg_apply_po_approval_inventory
AFTER UPDATE OF status ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.apply_po_approval_inventory();

-- 6. Block transfers from progressing past 'awaiting_approval' without admin approval.
--    handle_transfer_receive() already only fires on status='received', so as long
--    as a non-admin cannot move a transfer to 'received', stock won't change.
--    Add a guard: prevent transitions OUT of awaiting_approval except by admins.
CREATE OR REPLACE FUNCTION public.guard_transfer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'awaiting_approval' AND NEW.status <> 'awaiting_approval' THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can approve or reject transfers awaiting approval';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_transfer_status ON public.transfers;
CREATE TRIGGER trg_guard_transfer_status
BEFORE UPDATE OF status ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.guard_transfer_status_change();

-- 7. Same guard on purchase_orders
CREATE OR REPLACE FUNCTION public.guard_po_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'awaiting_approval' AND NEW.status <> 'awaiting_approval' THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can approve or reject purchase orders awaiting approval';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_po_status ON public.purchase_orders;
CREATE TRIGGER trg_guard_po_status
BEFORE UPDATE OF status ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_po_status_change();