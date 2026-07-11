
-- ============================================================================
-- 1. Drop dev-only test table
-- ============================================================================
DROP TABLE IF EXISTS public.test CASCADE;

-- ============================================================================
-- 2. Enable RLS + admin policies on unprotected tables
-- ============================================================================

-- audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_admin_all" ON public.audit_log;
CREATE POLICY "audit_log_admin_all" ON public.audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_read" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_read" ON public.system_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "system_settings_admin_write" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- supplier_pricing
ALTER TABLE public.supplier_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_pricing_admin_all" ON public.supplier_pricing;
CREATE POLICY "supplier_pricing_admin_all" ON public.supplier_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- po_approvers
ALTER TABLE public.po_approvers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_approvers_admin_all" ON public.po_approvers;
CREATE POLICY "po_approvers_admin_all" ON public.po_approvers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bank_statement_imports
ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_statement_imports_admin_all" ON public.bank_statement_imports;
CREATE POLICY "bank_statement_imports_admin_all" ON public.bank_statement_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bank_transactions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_transactions_admin_all" ON public.bank_transactions;
CREATE POLICY "bank_transactions_admin_all" ON public.bank_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- suppliers (was RLS off with public policies)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public read access on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_read_auth" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_write" ON public.suppliers;
CREATE POLICY "suppliers_read_auth" ON public.suppliers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_admin_write" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bank_account_categories
ALTER TABLE public.bank_account_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_account_categories_read" ON public.bank_account_categories;
DROP POLICY IF EXISTS "bank_account_categories_admin_write" ON public.bank_account_categories;
CREATE POLICY "bank_account_categories_read" ON public.bank_account_categories FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "bank_account_categories_admin_write" ON public.bank_account_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bill_line_items
ALTER TABLE public.bill_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bill_line_items_auth_all" ON public.bill_line_items;
CREATE POLICY "bill_line_items_auth_all" ON public.bill_line_items FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- company_codes
ALTER TABLE public.company_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_codes_read" ON public.company_codes;
DROP POLICY IF EXISTS "company_codes_admin_write" ON public.company_codes;
CREATE POLICY "company_codes_read" ON public.company_codes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "company_codes_admin_write" ON public.company_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warehouses_read" ON public.warehouses;
DROP POLICY IF EXISTS "warehouses_admin_write" ON public.warehouses;
CREATE POLICY "warehouses_read" ON public.warehouses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "warehouses_admin_write" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- tax_jurisdictions
ALTER TABLE public.tax_jurisdictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_jurisdictions_read" ON public.tax_jurisdictions;
DROP POLICY IF EXISTS "tax_jurisdictions_admin_write" ON public.tax_jurisdictions;
CREATE POLICY "tax_jurisdictions_read" ON public.tax_jurisdictions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "tax_jurisdictions_admin_write" ON public.tax_jurisdictions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- tax_rates
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_rates_read" ON public.tax_rates;
DROP POLICY IF EXISTS "tax_rates_admin_write" ON public.tax_rates;
CREATE POLICY "tax_rates_read" ON public.tax_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "tax_rates_admin_write" ON public.tax_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- tax_settings
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_settings_read" ON public.tax_settings;
DROP POLICY IF EXISTS "tax_settings_admin_write" ON public.tax_settings;
CREATE POLICY "tax_settings_read" ON public.tax_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "tax_settings_admin_write" ON public.tax_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure GRANTs
GRANT SELECT ON public.audit_log, public.system_settings, public.supplier_pricing, public.po_approvers,
  public.bank_statement_imports, public.bank_transactions, public.suppliers, public.bank_account_categories,
  public.bill_line_items, public.company_codes, public.warehouses, public.tax_jurisdictions, public.tax_rates, public.tax_settings
  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.audit_log, public.system_settings, public.supplier_pricing, public.po_approvers,
  public.bank_statement_imports, public.bank_transactions, public.suppliers, public.bank_account_categories,
  public.bill_line_items, public.company_codes, public.warehouses, public.tax_jurisdictions, public.tax_rates, public.tax_settings
  TO authenticated;

-- ============================================================================
-- 3. Remove anon read on purchase_orders
-- ============================================================================
DROP POLICY IF EXISTS "TEMP: Allow anon to read all POs" ON public.purchase_orders;
REVOKE SELECT ON public.purchase_orders FROM anon;

-- ============================================================================
-- 4. Tighten customer/user/api_keys/customer_contacts policies
-- ============================================================================

-- customers: only admin/supervisor/cashier (needed at POS) can read
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "customers_authorized_read" ON public.customers;
CREATE POLICY "customers_authorized_read" ON public.customers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'cashier')
    OR public.has_role(auth.uid(), 'inventory_man')
  );

-- customer_contacts: same restriction
DROP POLICY IF EXISTS "Allow all access to customer_contacts for authenticated" ON public.customer_contacts;
DROP POLICY IF EXISTS "customer_contacts_authorized_read" ON public.customer_contacts;
DROP POLICY IF EXISTS "customer_contacts_admin_write" ON public.customer_contacts;
CREATE POLICY "customer_contacts_authorized_read" ON public.customer_contacts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'cashier')
  );
CREATE POLICY "customer_contacts_admin_write" ON public.customer_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- user_profiles: own row or admin
DROP POLICY IF EXISTS "Allow authenticated full select on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_read" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_read" ON public.user_profiles;
CREATE POLICY "user_profiles_own_read" ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_profiles_admin_read" ON public.user_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- api_keys: admin only
DROP POLICY IF EXISTS "Authenticated users can manage api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Authenticated users can view api keys" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_admin_all" ON public.api_keys;
CREATE POLICY "api_keys_admin_all" ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. Lookup tables: replace "Anyone can view" USING(true) with authenticated-only
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brands','colors','currency_','departments','genders','main_groups','origins','themes','sizes','seasons','units','categories']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can view %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_read_auth" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_read_auth" ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 6. Revoke dangerous SQL functions from anon/authenticated
-- ============================================================================
REVOKE ALL ON FUNCTION public.execute_sql(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_readonly_sql(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_foreign_key(text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rename_column(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_table_columns(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_public_tables() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_attribute_table(text,text,text) FROM PUBLIC, anon, authenticated;

-- Drop legacy dangerous helpers if they exist
DROP FUNCTION IF EXISTS public.execute_raw_sql(text) CASCADE;
DROP FUNCTION IF EXISTS public.run_sql_query(text) CASCADE;

-- ============================================================================
-- 7. Fix functions missing search_path
-- ============================================================================
ALTER FUNCTION public.generate_transfer_number() SET search_path = public;
ALTER FUNCTION public.handle_transfer_receive() SET search_path = public;
ALTER FUNCTION public.update_inventory_on_po_receive() SET search_path = public;
ALTER FUNCTION public.update_shipped_quantities(integer) SET search_path = public;
ALTER FUNCTION public.handle_po_item_insert_inventory() SET search_path = public;
ALTER FUNCTION public.handle_po_item_update() SET search_path = public;
ALTER FUNCTION public.next_journal_entry_number() SET search_path = public;
ALTER FUNCTION public.set_bill_balance() SET search_path = public;
ALTER FUNCTION public.post_vendor_bill_entry() SET search_path = public;
ALTER FUNCTION public.post_customer_invoice_entry() SET search_path = public;
ALTER FUNCTION public.post_bill_payment_entry() SET search_path = public;
ALTER FUNCTION public.post_invoice_payment_entry() SET search_path = public;
ALTER FUNCTION public.update_vendor_bill_paid_amount() SET search_path = public;
ALTER FUNCTION public.update_customer_invoice_received_amount() SET search_path = public;
ALTER FUNCTION public.update_physical_inventory_counts_updated_at() SET search_path = public;
ALTER FUNCTION public.is_po_approver(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.has_role(app_role) SET search_path = public;

-- ============================================================================
-- 8. Recreate any SECURITY DEFINER views as SECURITY INVOKER (PG15+)
-- ============================================================================
DO $$
DECLARE v record;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='v'
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
