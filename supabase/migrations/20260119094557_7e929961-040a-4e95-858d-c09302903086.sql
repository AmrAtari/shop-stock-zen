-- First drop ALL policies that depend on cashier_id
DROP POLICY IF EXISTS "Admins and session owners can update cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Admins can delete cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Authenticated users can create cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Store users can view their store cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Authenticated users can view cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Users can update cash sessions" ON public.cash_sessions;

-- Drop the view that depends on cashier_id
DROP VIEW IF EXISTS v_cash_sessions_report;