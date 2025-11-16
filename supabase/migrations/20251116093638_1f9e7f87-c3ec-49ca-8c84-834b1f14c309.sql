-- Create security definer function to get user's assigned store
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id
  FROM public.user_profiles
  WHERE user_id = _user_id
$$;

-- Update RLS policies for store_inventory to filter by store
DROP POLICY IF EXISTS "Authenticated users can view store inventory" ON public.store_inventory;
CREATE POLICY "Store users can view their store inventory"
ON public.store_inventory
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR store_id = get_user_store_id(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can manage store inventory" ON public.store_inventory;
CREATE POLICY "Store users can manage their store inventory"
ON public.store_inventory
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    store_id = get_user_store_id(auth.uid())
    AND (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'inventory_man'::app_role))
  )
);

-- Update RLS policies for transactions to filter by store through cash_sessions
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
CREATE POLICY "Store users can view their store transactions"
ON public.transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR cashier_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.cash_sessions cs
    WHERE cs.id = transactions.session_id
    AND cs.cashier_id IN (
      SELECT user_id FROM public.user_profiles
      WHERE store_id = get_user_store_id(auth.uid())
    )
  )
);

-- Update RLS policies for purchase_orders to filter by store
DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON public.purchase_orders;
CREATE POLICY "Store users can view their store purchase orders"
ON public.purchase_orders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR store_id = get_user_store_id(auth.uid())
);

-- Update RLS policies for transfers to filter by store
DROP POLICY IF EXISTS "Users can view transfer items" ON public.transfer_items;
DROP POLICY IF EXISTS "Users can manage transfer items" ON public.transfer_items;

CREATE POLICY "Store users can view their store transfers"
ON public.transfer_items
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.transfers t
      WHERE t.transfer_id = transfer_items.transfer_id
      AND (t.from_store_id = get_user_store_id(auth.uid()) OR t.to_store_id = get_user_store_id(auth.uid()))
    )
  )
);

CREATE POLICY "Store users can manage their store transfers"
ON public.transfer_items
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'inventory_man'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
      AND EXISTS (
        SELECT 1 FROM public.transfers t
        WHERE t.transfer_id = transfer_items.transfer_id
        AND (t.from_store_id = get_user_store_id(auth.uid()) OR t.to_store_id = get_user_store_id(auth.uid()))
      )
    )
  )
);

-- Update RLS policies for physical_inventory_sessions to filter by store
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.physical_inventory_sessions;
CREATE POLICY "Store users can view their store inventory sessions"
ON public.physical_inventory_sessions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR store_id = get_user_store_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users with permissions can create sessions" ON public.physical_inventory_sessions;
CREATE POLICY "Store users can create their store inventory sessions"
ON public.physical_inventory_sessions
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'inventory_man'::app_role))
  AND (has_role(auth.uid(), 'admin'::app_role) OR store_id = get_user_store_id(auth.uid()))
);

DROP POLICY IF EXISTS "Admins and supervisors can update sessions" ON public.physical_inventory_sessions;
CREATE POLICY "Store users can update their store inventory sessions"
ON public.physical_inventory_sessions
FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
  AND (has_role(auth.uid(), 'admin'::app_role) OR store_id = get_user_store_id(auth.uid()))
);

-- Update RLS policies for cash_sessions to filter by store
DROP POLICY IF EXISTS "Authenticated users can view cash sessions" ON public.cash_sessions;
CREATE POLICY "Store users can view their store cash sessions"
ON public.cash_sessions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR cashier_id IN (
      SELECT user_id FROM public.user_profiles
      WHERE store_id = get_user_store_id(auth.uid())
    )
  )
);