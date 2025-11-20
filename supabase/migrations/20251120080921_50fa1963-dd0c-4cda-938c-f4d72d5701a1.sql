-- =====================================================
-- COMPREHENSIVE RLS SETUP - POLICIES ONLY
-- =====================================================

-- 1. TRIGGERS FOR AUTO-SETTING created_by
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'created_by'
    AND table_name NOT LIKE 'v_%'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_created_by_trigger ON public.%I;
      CREATE TRIGGER set_created_by_trigger
      BEFORE INSERT ON public.%I
      FOR EACH ROW
      EXECUTE FUNCTION public.set_created_by();
    ', tbl_name, tbl_name);
  END LOOP;
END $$;

-- 2. USER_PROFILES - Admin full access + users own profile
-- =====================================================

DROP POLICY IF EXISTS "Admin can select all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin full access to user_profiles" ON public.user_profiles;

CREATE POLICY "Admin full access to user_profiles"
ON public.user_profiles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. USER_ROLES - Admin full access + users view own role
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin full access to user_roles" ON public.user_roles;

CREATE POLICY "Admin full access to user_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. NOTIFICATIONS - Admin full access + users own notifications
-- =====================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin full access to notifications" ON public.notifications;

CREATE POLICY "Admin full access to notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. JOURNAL_ENTRIES - Admin full access + users own entries
-- =====================================================

DROP POLICY IF EXISTS "Admin can select all journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admin can update all entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admin can delete all entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admins can manage journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can create journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete own draft entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admin full access to journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view all journal entries" ON public.journal_entries;

CREATE POLICY "Admin full access to journal_entries"
ON public.journal_entries FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view all journal entries"
ON public.journal_entries FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create journal entries"
ON public.journal_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own draft entries"
ON public.journal_entries FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND status = 'draft');

-- 6. JOURNAL_ENTRY_LINES - Admin full access + users manage own
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage journal entry lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Users can manage journal entry lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Admin full access to journal_entry_lines" ON public.journal_entry_lines;

CREATE POLICY "Admin full access to journal_entry_lines"
ON public.journal_entry_lines FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage journal entry lines"
ON public.journal_entry_lines FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND je.created_by = auth.uid()
    AND je.status = 'draft'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND je.created_by = auth.uid()
    AND je.status = 'draft'
  )
);

-- 7. VENDOR_BILLS - Admin full access + authenticated view/create
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Users can view vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Users can create vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Admin full access to vendor_bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Authenticated users can view vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Authenticated users can create vendor bills" ON public.vendor_bills;

CREATE POLICY "Admin full access to vendor_bills"
ON public.vendor_bills FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view vendor bills"
ON public.vendor_bills FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create vendor bills"
ON public.vendor_bills FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. CUSTOMER_INVOICES - Admin full access + authenticated view/create
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Users can view customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Users can create customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Admin full access to customer_invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Authenticated users can view customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Authenticated users can create customer invoices" ON public.customer_invoices;

CREATE POLICY "Admin full access to customer_invoices"
ON public.customer_invoices FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view customer invoices"
ON public.customer_invoices FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create customer invoices"
ON public.customer_invoices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 9. IMPORT_LOGS - Admin full access + authenticated view
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Users can view import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Admin full access to import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "Authenticated users can view import logs" ON public.import_logs;

CREATE POLICY "Admin full access to import_logs"
ON public.import_logs FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view import logs"
ON public.import_logs FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 10. AUDIT_LOG - Admin full access + authenticated insert
-- =====================================================

DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admin full access to audit_log" ON public.audit_log;

CREATE POLICY "Admin full access to audit_log"
ON public.audit_log FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);