-- Fix journal entries RLS for viewing
-- Allow all authenticated users to view all journal entries

DROP POLICY IF EXISTS "Users can view all journal entries" ON public.journal_entries;

CREATE POLICY "Users can view all journal entries"
ON public.journal_entries FOR SELECT
TO authenticated
USING (true);

-- Also ensure user_profiles can be viewed by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.user_profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);