-- Enhance execute_sql function with better security protections
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  sql_upper TEXT;
  protected_tables TEXT[] := ARRAY['user_roles', 'auth.users'];
  protected_table TEXT;
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  sql_upper := UPPER(sql);
  
  -- Block operations on security-critical tables
  FOREACH protected_table IN ARRAY protected_tables LOOP
    IF sql_upper ~ UPPER(protected_table) AND 
       sql_upper ~ '(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)' THEN
      RAISE EXCEPTION 'Cannot modify security-critical table: %', protected_table;
    END IF;
  END LOOP;
  
  -- Block dangerous operations
  IF sql_upper ~ '(DROP\s+(DATABASE|SCHEMA|FUNCTION|TRIGGER)|ALTER\s+(DATABASE|SCHEMA)|GRANT|REVOKE)' THEN
    RAISE EXCEPTION 'Operation not permitted';
  END IF;
  
  -- Execute the SQL
  EXECUTE sql;
  
  RETURN jsonb_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;