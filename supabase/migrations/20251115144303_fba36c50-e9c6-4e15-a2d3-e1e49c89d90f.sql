-- Fix RLS policies for stores table
DROP POLICY IF EXISTS "Authenticated users can view stores" ON public.stores;
CREATE POLICY "Authenticated users can view stores"
ON public.stores FOR SELECT
USING (true);

-- Fix RLS policies for store_inventory
DROP POLICY IF EXISTS "Authenticated users can view store inventory" ON public.store_inventory;
CREATE POLICY "Authenticated users can view store inventory"
ON public.store_inventory FOR SELECT
USING (auth.uid() IS NOT NULL);