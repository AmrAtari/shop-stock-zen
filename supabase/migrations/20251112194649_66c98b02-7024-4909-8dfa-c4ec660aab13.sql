-- Create trigger to automatically update store_inventory when PO items are received
CREATE OR REPLACE FUNCTION update_inventory_on_po_receive()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
  v_item_id_uuid UUID;
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
    WHERE sku = NEW.item_id;
  END;

  -- Skip if item not found
  IF v_item_id_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate the quantity change
  DECLARE
    v_quantity_change INTEGER;
  BEGIN
    v_quantity_change := NEW.received_quantity - COALESCE(OLD.received_quantity, 0);
    
    -- Only update if there's an actual change
    IF v_quantity_change != 0 THEN
      -- Update or insert into store_inventory
      INSERT INTO store_inventory (item_id, store_id, quantity, last_restocked)
      VALUES (v_item_id_uuid, v_store_id, v_quantity_change, NOW())
      ON CONFLICT (item_id, store_id)
      DO UPDATE SET 
        quantity = store_inventory.quantity + v_quantity_change,
        last_restocked = NOW();
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_inventory_on_po_receive ON purchase_order_items;

-- Create the trigger
CREATE TRIGGER trigger_update_inventory_on_po_receive
AFTER INSERT OR UPDATE OF received_quantity ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_po_receive();