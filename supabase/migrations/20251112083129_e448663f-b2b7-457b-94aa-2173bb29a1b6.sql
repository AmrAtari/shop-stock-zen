-- Create relationship between purchase_order_items.po_id and purchase_orders.po_id

-- Step 1: Remove NOT NULL constraint from purchase_order_items.po_id temporarily
ALTER TABLE purchase_order_items 
ALTER COLUMN po_id DROP NOT NULL;

-- Step 2: Convert po_id from TEXT to INTEGER (to match purchase_orders.po_id which is the primary key)
ALTER TABLE purchase_order_items 
ALTER COLUMN po_id TYPE INTEGER USING NULL;

-- Step 3: Add foreign key constraint to reference purchase_orders.po_id (the actual primary key)
ALTER TABLE purchase_order_items
ADD CONSTRAINT purchase_order_items_po_id_fkey
FOREIGN KEY (po_id)
REFERENCES purchase_orders(po_id)
ON DELETE CASCADE;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(po_id);