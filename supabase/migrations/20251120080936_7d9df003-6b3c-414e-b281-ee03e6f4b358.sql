-- =====================================================
-- ENABLE RLS ON TABLES WITH POLICIES
-- =====================================================

-- Enable RLS on tables that have policies but RLS is not enabled
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on all critical tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;