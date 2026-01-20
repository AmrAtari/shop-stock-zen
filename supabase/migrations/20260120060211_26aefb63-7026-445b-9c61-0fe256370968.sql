-- Drop the unique constraint on transaction_id since multiple items can share the same transaction_id
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transaction_id_key;

-- Add a non-unique index for performance on transaction_id lookups
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON public.transactions(transaction_id);