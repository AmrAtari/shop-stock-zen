-- Fix trigger to remove non-existent updated_at column reference
CREATE OR REPLACE FUNCTION public.handle_po_item_insert_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    po_store_id uuid;
    v_item_id uuid;
BEGIN
    -- Fetch the store_id from the parent purchase_orders using correct key
    SELECT store_id INTO po_store_id FROM public.purchase_orders WHERE po_id = NEW.po_id;  

    -- Resolve item UUID safely
    v_item_id := NULL;

    -- Try to cast NEW.item_id to UUID when provided and valid (column is TEXT in current schema)
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

    -- If we can't resolve item or store, skip inventory update gracefully
    IF v_item_id IS NULL OR po_store_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update or Insert the store_inventory record (qty_on_order only)
    INSERT INTO public.store_inventory (item_id, store_id, qty_on_order)
    VALUES (v_item_id, po_store_id, NEW.quantity)
    ON CONFLICT (item_id, store_id)
    DO UPDATE SET 
        qty_on_order = public.store_inventory.qty_on_order + EXCLUDED.qty_on_order;

    RETURN NEW;
END;
$$;