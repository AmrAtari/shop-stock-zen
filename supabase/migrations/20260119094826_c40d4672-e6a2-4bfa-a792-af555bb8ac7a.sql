-- Step 1: Drop all policies on transactions table
DROP POLICY IF EXISTS "Store users can view their store transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;

-- Step 2: Drop foreign key constraints
ALTER TABLE public.cash_sessions DROP CONSTRAINT IF EXISTS cash_sessions_cashier_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_cashier_id_fkey;

-- Step 3: Change cashier_id from UUID to TEXT
ALTER TABLE public.cash_sessions 
  ALTER COLUMN cashier_id TYPE text USING cashier_id::text;

ALTER TABLE public.transactions 
  ALTER COLUMN cashier_id TYPE text USING cashier_id::text;

-- Step 4: Recreate policies for transactions (without cashier_id = auth.uid() check)
CREATE POLICY "Authenticated users can view transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transactions" 
ON public.transactions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 5: Recreate policies for cash_sessions
CREATE POLICY "Authenticated users can view cash sessions" 
ON public.cash_sessions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    store_id = get_user_store_id(auth.uid())
  )
);

CREATE POLICY "Authenticated users can create cash sessions" 
ON public.cash_sessions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    store_id = get_user_store_id(auth.uid())
  )
);

CREATE POLICY "Users can update cash sessions" 
ON public.cash_sessions 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    store_id = get_user_store_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete cash sessions" 
ON public.cash_sessions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));