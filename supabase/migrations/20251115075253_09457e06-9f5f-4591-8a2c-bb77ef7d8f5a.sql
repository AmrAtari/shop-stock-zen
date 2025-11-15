
-- Drop existing triggers and functions with CASCADE
DROP FUNCTION IF EXISTS public.update_inventory_on_po_receive() CASCADE;
DROP FUNCTION IF EXISTS public.handle_po_item_insert_inventory() CASCADE;

-- Create improved function to handle PO receiving
CREATE OR REPLACE FUNCTION public.update_inventory_on_po_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
  v_item_id_uuid UUID;
  v_quantity_change INTEGER;
BEGIN
  -- Get the store_id from the purchase order
  SELECT store_id INTO v_store_id
  FROM purchase_orders
  WHERE po_id = NEW.po_id;

  -- Skip if no store_id
  IF v_store_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convert item_id to UUID if it's text
  BEGIN
    v_item_id_uuid := NEW.item_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- If item_id is a SKU, look up the UUID
    SELECT id INTO v_item_id_uuid
    FROM items
    WHERE sku = NEW.sku;
  END;

  -- Skip if item not found
  IF v_item_id_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate the quantity change (what was just received)
  v_quantity_change := NEW.received_quantity - COALESCE(OLD.received_quantity, 0);
  
  -- Only update if there's an actual change
  IF v_quantity_change != 0 THEN
    -- Update store_inventory: increase quantity, decrease qty_on_order
    INSERT INTO store_inventory (item_id, store_id, quantity, qty_on_order)
    VALUES (v_item_id_uuid, v_store_id, v_quantity_change, -v_quantity_change)
    ON CONFLICT (item_id, store_id)
    DO UPDATE SET 
      quantity = store_inventory.quantity + v_quantity_change,
      qty_on_order = GREATEST(0, store_inventory.qty_on_order - v_quantity_change);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for updates
CREATE TRIGGER update_inventory_on_po_receive_trigger
AFTER UPDATE ON purchase_order_items
FOR EACH ROW
WHEN (NEW.received_quantity IS DISTINCT FROM OLD.received_quantity)
EXECUTE FUNCTION public.update_inventory_on_po_receive();

-- Create function for PO item inserts
CREATE OR REPLACE FUNCTION public.handle_po_item_insert_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    po_store_id uuid;
    v_item_id uuid;
BEGIN
    -- Fetch the store_id from the parent purchase_orders
    SELECT store_id INTO po_store_id FROM public.purchase_orders WHERE po_id = NEW.po_id;  

    -- Resolve item UUID
    v_item_id := NULL;

    IF NEW.item_id IS NOT NULL AND NEW.item_id <> '' THEN
        BEGIN
            v_item_id := NEW.item_id::uuid;
        EXCEPTION WHEN others THEN
            v_item_id := NULL;
        END;
    END IF;

    -- If still NULL, try to look up by SKU
    IF v_item_id IS NULL THEN
        SELECT id INTO v_item_id FROM public.items WHERE sku = NEW.sku LIMIT 1;
    END IF;

    -- Skip if we can't resolve item or store
    IF v_item_id IS NULL OR po_store_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update or Insert the store_inventory record (qty_on_order only)
    INSERT INTO public.store_inventory (item_id, store_id, quantity, qty_on_order)
    VALUES (v_item_id, po_store_id, 0, NEW.quantity - NEW.received_quantity)
    ON CONFLICT (item_id, store_id)
    DO UPDATE SET 
        qty_on_order = public.store_inventory.qty_on_order + (NEW.quantity - NEW.received_quantity);

    RETURN NEW;
END;
$$;

-- Create trigger for inserts
CREATE TRIGGER handle_po_item_insert_inventory_trigger
AFTER INSERT ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_po_item_insert_inventory();

-- Now fix the existing incorrect data for item 8684112600147
UPDATE store_inventory
SET 
  quantity = 2,
  qty_on_order = 0
WHERE item_id = '5f398eb6-9016-400b-ac58-bc8fbc9ecaa1'
  AND store_id = 'd0223c13-45d0-46c5-b737-3ded952b24cb';
