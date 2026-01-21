-- Add the missing item_id column to the sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS item_id text;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_sales_item_id ON public.sales(item_id);