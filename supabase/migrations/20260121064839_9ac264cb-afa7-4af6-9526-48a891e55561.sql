-- Add the missing price column to the sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS price numeric;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_sales_price ON public.sales(price);