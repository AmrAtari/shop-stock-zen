-- Drop existing policies that don't allow admin access
DROP POLICY IF EXISTS "delete_journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "update_journal_entries" ON journal_entries;

-- Create new DELETE policy with admin exception
CREATE POLICY "delete_journal_entries"
ON journal_entries
FOR DELETE
TO public
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins can delete anything
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Non-admins can only delete their own drafts and reversed entries
    (created_by = auth.uid() AND (status = 'draft' OR status = 'reversed'))
  )
);

-- Create new UPDATE policy with admin exception
CREATE POLICY "update_journal_entries"
ON journal_entries
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Admins can update anything
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Non-admins can update their own drafts or posted entries
    (created_by = auth.uid() AND (status = 'draft' OR status = 'posted'))
  )
);