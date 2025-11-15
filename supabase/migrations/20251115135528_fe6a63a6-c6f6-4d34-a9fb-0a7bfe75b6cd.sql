-- Ensure unique constraint for upserts on store_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_inventory_item_store_unique'
  ) THEN
    ALTER TABLE public.store_inventory
    ADD CONSTRAINT store_inventory_item_store_unique UNIQUE (item_id, store_id);
  END IF;
END $$;

-- Trigger: when PO items are received, update store inventory
DROP TRIGGER IF EXISTS trg_po_item_receive_inventory ON public.purchase_order_items;
CREATE TRIGGER trg_po_item_receive_inventory
AFTER INSERT OR UPDATE OF received_quantity ON public.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_on_po_receive();

-- Trigger: keep items.quantity in sync with store_inventory totals
DROP TRIGGER IF EXISTS trg_store_inventory_update_items ON public.store_inventory;
CREATE TRIGGER trg_store_inventory_update_items
AFTER INSERT OR UPDATE OR DELETE ON public.store_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_global_inventory();