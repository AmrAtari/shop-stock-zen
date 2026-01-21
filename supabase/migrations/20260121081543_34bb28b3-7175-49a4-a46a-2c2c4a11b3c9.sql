-- Add cashier_name column to sales table for storing the cashier identifier (string)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cashier_name text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_cashier_name ON public.sales(cashier_name);