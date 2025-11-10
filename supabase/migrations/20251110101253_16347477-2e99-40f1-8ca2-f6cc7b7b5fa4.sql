-- Convert purchase_orders.store_id from text to uuid and add foreign key constraint

-- Step 1: Convert the column type from text to uuid
-- This is safe because existing values are valid UUID strings
ALTER TABLE purchase_orders 
  ALTER COLUMN store_id TYPE uuid USING store_id::uuid;

-- Step 2: Add the foreign key constraint
ALTER TABLE purchase_orders 
  ADD CONSTRAINT purchase_orders_store_id_fkey 
  FOREIGN KEY (store_id) 
  REFERENCES stores(id) 
  ON DELETE SET NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_store_id 
  ON purchase_orders(store_id);