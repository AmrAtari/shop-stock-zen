-- Add missing columns to the sales table for POS checkout
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sku text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_quantity ON public.sales(quantity);
CREATE INDEX IF NOT EXISTS idx_sales_sku ON public.sales(sku);