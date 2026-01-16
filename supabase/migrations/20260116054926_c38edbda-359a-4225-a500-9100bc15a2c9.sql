-- Add store_id column to cash_sessions to properly track which store the session is for
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cash_sessions_store_id ON public.cash_sessions(store_id);