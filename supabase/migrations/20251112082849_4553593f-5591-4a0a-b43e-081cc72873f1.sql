-- Add foreign key constraint between transactions.item_id and items.id

-- First, ensure any NULL item_id values won't break the constraint
-- (optional: could clean up orphaned records if needed)

-- Add foreign key constraint with ON DELETE SET NULL
-- This allows transactions to remain even if an item is deleted
ALTER TABLE transactions
ADD CONSTRAINT transactions_item_id_fkey 
FOREIGN KEY (item_id) 
REFERENCES items(id) 
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);

-- Similarly, add foreign key for purchase_order_items if not already present
-- Check if constraint exists first to avoid errors
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_order_items_item_id_fkey'
    AND table_name = 'purchase_order_items'
  ) THEN
    -- Note: purchase_order_items.item_id is TEXT, so we can't add FK directly
    -- This is intentional as PO items can reference items that don't exist yet
    NULL;
  END IF;
END $$;