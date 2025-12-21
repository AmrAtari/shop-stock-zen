-- Phase 3: Budgeting, Multi-Currency & Integration Layer

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency_id UUID REFERENCES public.currency_(id),
  to_currency_id UUID REFERENCES public.currency_(id),
  rate DECIMAL(18, 8) NOT NULL,
  effective_date DATE NOT NULL,
  source VARCHAR(100) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_currency_id, to_currency_id, effective_date)
);

-- Budget Periods
CREATE TABLE IF NOT EXISTS public.budget_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(fiscal_year, name)
);

-- Budget Lines (per account per period)
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_period_id UUID NOT NULL REFERENCES public.budget_periods(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  store_id UUID REFERENCES public.stores(id),
  budgeted_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  variance DECIMAL(15, 2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(budget_period_id, account_id, store_id)
);

-- Budget Adjustments Log
CREATE TABLE IF NOT EXISTS public.budget_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_line_id UUID NOT NULL REFERENCES public.budget_lines(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'transfer')),
  amount DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Integration Configurations
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_name VARCHAR(100) NOT NULL UNIQUE,
  integration_type VARCHAR(50) NOT NULL,
  config JSONB DEFAULT '{}',
  credentials_encrypted TEXT,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Integration Sync Logs
CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integration_configs(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'failed', 'partial')),
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  details JSONB
);

-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret_key TEXT,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- API Keys for external access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  permissions TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for all new tables
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view exchange rates" ON public.exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage exchange rates" ON public.exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view budget periods" ON public.budget_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage budget periods" ON public.budget_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view budget lines" ON public.budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage budget lines" ON public.budget_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view budget adjustments" ON public.budget_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage budget adjustments" ON public.budget_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view integrations" ON public.integration_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage integrations" ON public.integration_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view sync logs" ON public.integration_sync_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync logs" ON public.integration_sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view webhooks" ON public.webhook_endpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage webhooks" ON public.webhook_endpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view webhook deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage webhook deliveries" ON public.webhook_deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view api keys" ON public.api_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage api keys" ON public.api_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to update budget actuals from journal entries
CREATE OR REPLACE FUNCTION public.update_budget_actuals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update actual amounts in budget lines when journal entries are posted
  UPDATE public.budget_lines bl
  SET actual_amount = (
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    JOIN public.budget_periods bp ON bp.id = bl.budget_period_id
    WHERE jel.account_id = bl.account_id
    AND je.status = 'posted'
    AND je.entry_date BETWEEN bp.start_date AND bp.end_date
    AND (bl.store_id IS NULL OR jel.store_id = bl.store_id)
  ),
  updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM public.budget_periods bp
    WHERE bp.id = bl.budget_period_id
    AND NEW.entry_date BETWEEN bp.start_date AND bp.end_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update budget actuals when journal entries are posted
CREATE TRIGGER update_budget_on_journal_post
AFTER INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
WHEN (NEW.status = 'posted')
EXECUTE FUNCTION public.update_budget_actuals();