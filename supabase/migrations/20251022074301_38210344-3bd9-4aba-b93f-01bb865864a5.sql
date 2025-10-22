-- Create cash_sessions table for POS session management
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_cash NUMERIC NOT NULL DEFAULT 0,
  end_cash NUMERIC,
  open_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  close_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for POS sales
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  discount_fixed NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL,
  is_refund BOOLEAN NOT NULL DEFAULT false,
  is_refunded BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refunds table for tracking refunds
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  refunded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  refund_reason TEXT,
  refund_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_sessions
CREATE POLICY "Authenticated users can view cash sessions"
ON public.cash_sessions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create cash sessions"
ON public.cash_sessions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND cashier_id = auth.uid());

CREATE POLICY "Admins and session owners can update cash sessions"
ON public.cash_sessions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR cashier_id = auth.uid());

CREATE POLICY "Admins can delete cash sessions"
ON public.cash_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for transactions
CREATE POLICY "Authenticated users can view transactions"
ON public.transactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update transactions"
ON public.transactions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transactions"
ON public.transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for refunds
CREATE POLICY "Authenticated users can view refunds"
ON public.refunds FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and supervisors can create refunds"
ON public.refunds FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can delete refunds"
ON public.refunds FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RPC function for calculating expected cash in session
CREATE OR REPLACE FUNCTION public.pos_session_expected_cash(session_id_param uuid)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_cash NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_cash
  FROM transactions
  WHERE session_id = session_id_param
    AND payment_method = 'cash'
    AND is_refund = false;
  
  RETURN total_cash;
END;
$$;

-- Create index for better query performance
CREATE INDEX idx_transactions_session ON public.transactions(session_id);
CREATE INDEX idx_transactions_cashier ON public.transactions(cashier_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at);
CREATE INDEX idx_cash_sessions_cashier ON public.cash_sessions(cashier_id);