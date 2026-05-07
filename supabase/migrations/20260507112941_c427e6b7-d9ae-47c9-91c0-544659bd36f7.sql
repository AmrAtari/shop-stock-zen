
-- Enums
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft','scheduled','active','paused','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE campaign_type AS ENUM (
    'general','seasonal','client_specific','project_based','category','brand',
    'quantity_based','bundle','clearance','special_approval'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_method AS ENUM (
    'fixed','percentage','category','brand','attribute','quantity_tier',
    'value_tier','bundle','client_specific','manual_approval'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('not_required','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type campaign_type NOT NULL DEFAULT 'general',
  status campaign_status NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  internal_notes TEXT,
  discount_method discount_method NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(14,4) NOT NULL DEFAULT 0,
  tier_config JSONB,
  max_discount_amount NUMERIC(14,2),
  max_discount_percentage NUMERIC(6,2),
  minimum_quotation_value NUMERIC(14,2),
  minimum_quantity INTEGER,
  usage_limit INTEGER,
  usage_per_client INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  campaign_budget NUMERIC(14,2),
  consumed_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  can_combine BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  auto_apply BOOLEAN NOT NULL DEFAULT true,
  discount_account_code TEXT,
  cost_center TEXT,
  applies_to_scope TEXT NOT NULL DEFAULT 'all',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON public.campaigns(start_date,end_date);

-- campaign_rules (visual rule builder rows)
CREATE TABLE IF NOT EXISTS public.campaign_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  condition_group INTEGER NOT NULL DEFAULT 1,
  field_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  field_value JSONB,
  logical_operator TEXT NOT NULL DEFAULT 'AND',
  action_type TEXT,
  action_value JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_rules_campaign ON public.campaign_rules(campaign_id);

-- campaign_products eligibility
CREATE TABLE IF NOT EXISTS public.campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID,
  category_id UUID,
  brand_id UUID,
  attribute_filters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign ON public.campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product ON public.campaign_products(product_id);

-- transaction_discounts (applied discount records)
CREATE TABLE IF NOT EXISTS public.transaction_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'pos', -- 'pos' | 'sales_order'
  source_id TEXT NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(14,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  applied_to TEXT,
  approval_status approval_status NOT NULL DEFAULT 'not_required',
  approved_by UUID,
  approval_comment TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_txn_discounts_source ON public.transaction_discounts(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_txn_discounts_campaign ON public.transaction_discounts(campaign_id);

-- discount_approvals
CREATE TABLE IF NOT EXISTS public.discount_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'pos',
  source_id TEXT NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  requested_by UUID,
  approved_by UUID,
  status approval_status NOT NULL DEFAULT 'pending',
  original_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  margin_impact NUMERIC(14,2),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_discount_approvals_status ON public.discount_approvals(status);

-- campaign_usage log
CREATE TABLE IF NOT EXISTS public.campaign_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'pos',
  source_id TEXT NOT NULL,
  customer_id INTEGER,
  salesperson_id UUID,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  transaction_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_usage_campaign ON public.campaign_usage(campaign_id);

-- Updated_at triggers
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discount_approvals_updated_at BEFORE UPDATE ON public.discount_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Set created_by triggers
CREATE TRIGGER trg_campaigns_set_created_by BEFORE INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
CREATE TRIGGER trg_txn_discounts_set_created_by BEFORE INSERT ON public.transaction_discounts
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_usage ENABLE ROW LEVEL SECURITY;

-- Campaigns: read for any authenticated, write for admins
CREATE POLICY "campaigns_select_auth" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaigns_admin_all" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "campaign_rules_select_auth" ON public.campaign_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_rules_admin_all" ON public.campaign_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "campaign_products_select_auth" ON public.campaign_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_products_admin_all" ON public.campaign_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Transaction discounts: any authenticated can read & insert; only admin can update/delete
CREATE POLICY "txn_disc_select" ON public.transaction_discounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "txn_disc_insert" ON public.transaction_discounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "txn_disc_admin_mod" ON public.transaction_discounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "txn_disc_admin_del" ON public.transaction_discounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- Discount approvals: read for authenticated, insert for any auth (request), update only admin
CREATE POLICY "disc_app_select" ON public.discount_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "disc_app_insert" ON public.discount_approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "disc_app_admin_upd" ON public.discount_approvals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "disc_app_admin_del" ON public.discount_approvals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- Campaign usage: read for authenticated, insert for any auth, mod for admin
CREATE POLICY "campaign_usage_select" ON public.campaign_usage FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_usage_insert" ON public.campaign_usage FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaign_usage_admin_mod" ON public.campaign_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
