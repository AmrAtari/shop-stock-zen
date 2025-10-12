-- Fix critical security issues in RLS policies

-- 1. Fix items table: Require authentication for SELECT, role-based for modifications
DROP POLICY IF EXISTS "Anyone can view items" ON public.items;
DROP POLICY IF EXISTS "Admins can insert items" ON public.items;
DROP POLICY IF EXISTS "Admins can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

CREATE POLICY "Authenticated users can view items" ON public.items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert items" ON public.items
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update items" ON public.items
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete items" ON public.items
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix operational tables: Replace "Allow all operations" with proper role-based policies

-- Purchase Orders
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders" ON public.purchase_orders
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert purchase orders" ON public.purchase_orders
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update purchase orders" ON public.purchase_orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete purchase orders" ON public.purchase_orders
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Purchase Order Items
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.purchase_order_items;

CREATE POLICY "Authenticated users can view PO items" ON public.purchase_order_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert PO items" ON public.purchase_order_items
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update PO items" ON public.purchase_order_items
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete PO items" ON public.purchase_order_items
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Price Levels
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.price_levels;

CREATE POLICY "Authenticated users can view price levels" ON public.price_levels
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert price levels" ON public.price_levels
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update price levels" ON public.price_levels
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete price levels" ON public.price_levels
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Stock Adjustments (make immutable - only INSERT and SELECT allowed)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.stock_adjustments;

CREATE POLICY "Authenticated users can view stock adjustments" ON public.stock_adjustments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert stock adjustments" ON public.stock_adjustments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Stores
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.stores;

CREATE POLICY "Authenticated users can view stores" ON public.stores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert stores" ON public.stores
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update stores" ON public.stores
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete stores" ON public.stores
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Import Logs (make immutable - only INSERT and SELECT allowed)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.import_logs;

CREATE POLICY "Authenticated users can view import logs" ON public.import_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert import logs" ON public.import_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Duplicate Comparisons (make immutable - only INSERT and SELECT allowed)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.duplicate_comparisons;

CREATE POLICY "Authenticated users can view duplicate comparisons" ON public.duplicate_comparisons
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert duplicate comparisons" ON public.duplicate_comparisons
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);