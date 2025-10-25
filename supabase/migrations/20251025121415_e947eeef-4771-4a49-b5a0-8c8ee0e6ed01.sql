-- Migrate data from completed PO PO-COLINS-0011 to store_inventory
-- This PO delivered to Ramallah Store (c546e7d0-3249-4290-a5de-f26f4b69a2d5)

DO $$
DECLARE
  po_record RECORD;
  po_item RECORD;
  item_record RECORD;
  existing_store_inv RECORD;
BEGIN
  -- Get the PO
  SELECT * INTO po_record 
  FROM purchase_orders 
  WHERE po_number = 'PO-COLINS-0011' 
  AND store_id IS NOT NULL
  LIMIT 1;

  IF po_record.id IS NOT NULL THEN
    -- Loop through PO items
    FOR po_item IN 
      SELECT * FROM purchase_order_items WHERE po_id = po_record.id
    LOOP
      -- Find the item
      SELECT * INTO item_record 
      FROM items 
      WHERE id = po_item.item_id OR sku = po_item.sku
      LIMIT 1;

      IF item_record.id IS NOT NULL THEN
        -- Check if store_inventory exists
        SELECT * INTO existing_store_inv
        FROM store_inventory
        WHERE item_id = item_record.id AND store_id = po_record.store_id;

        IF existing_store_inv.id IS NOT NULL THEN
          -- Update existing
          UPDATE store_inventory
          SET 
            quantity = quantity + po_item.quantity,
            last_restocked = po_record.created_at
          WHERE id = existing_store_inv.id;
        ELSE
          -- Insert new
          INSERT INTO store_inventory (item_id, store_id, quantity, min_stock, last_restocked)
          VALUES (item_record.id, po_record.store_id, po_item.quantity, 0, po_record.created_at);
        END IF;

        -- Create stock adjustment if not exists
        IF NOT EXISTS (
          SELECT 1 FROM stock_adjustments 
          WHERE item_id = item_record.id 
          AND store_id = po_record.store_id
          AND reference_number = po_record.po_number
        ) THEN
          INSERT INTO stock_adjustments (
            item_id, 
            store_id, 
            previous_quantity, 
            new_quantity, 
            adjustment, 
            reason, 
            reference_number
          ) VALUES (
            item_record.id,
            po_record.store_id,
            COALESCE(existing_store_inv.quantity, 0),
            COALESCE(existing_store_inv.quantity, 0) + po_item.quantity,
            po_item.quantity,
            'PO Receipt: ' || po_record.po_number,
            po_record.po_number
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;