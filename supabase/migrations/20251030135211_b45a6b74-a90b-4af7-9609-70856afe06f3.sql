-- Step 1: Add comprehensive RLS policies for items table
-- Items table currently has RLS enabled but NO policies, blocking all operations

-- Allow authenticated users to view items
CREATE POLICY "Authenticated users can view items"
ON public.items
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow admins and inventory managers to insert items
CREATE POLICY "Admins and inventory managers can insert items"
ON public.items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'inventory_man'::app_role)
);

-- Allow admins and inventory managers to update items
CREATE POLICY "Admins and inventory managers can update items"
ON public.items
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'inventory_man'::app_role)
);

-- Allow admins to delete items
CREATE POLICY "Admins can delete items"
ON public.items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 2: Add RLS policies to other critical tables

-- Purchase Orders table
CREATE POLICY "Authenticated users can view purchase orders"
ON public.purchase_orders
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage purchase orders"
ON public.purchase_orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Transfers table
CREATE POLICY "Authenticated users can view transfers"
ON public.transfers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and inventory managers can manage transfers"
ON public.transfers
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'inventory_man'::app_role)
);

-- Transfer Items table
CREATE POLICY "Authenticated users can view transfer items"
ON public.transfer_items
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and inventory managers can manage transfer items"
ON public.transfer_items
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'inventory_man'::app_role)
);

-- Sale Sessions table
CREATE POLICY "Authenticated users can view sale sessions"
ON public.sale_sessions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and cashiers can manage sale sessions"
ON public.sale_sessions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role)
);

-- Sales table
CREATE POLICY "Authenticated users can view sales"
ON public.sales
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and cashiers can manage sales"
ON public.sales
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role)
);

-- Customers table
CREATE POLICY "Authenticated users can view customers"
ON public.customers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage customers"
ON public.customers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Stock on Hand table
CREATE POLICY "Authenticated users can insert stock on hand"
ON public.stock_on_hand
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock on hand"
ON public.stock_on_hand
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete stock on hand"
ON public.stock_on_hand
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));