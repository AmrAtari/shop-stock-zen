-- Create sales table for POS system
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sku text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Policies for sales
CREATE POLICY "Authenticated users can view sales"
ON public.sales
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sales"
ON public.sales
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for better performance
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);