-- Add customer_id column to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES public.customers(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);