-- Create function to list public tables (admin only)
CREATE OR REPLACE FUNCTION list_public_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT t.tablename::TEXT
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;

-- Create function to execute SQL (admin only, restricted operations)
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Block dangerous operations
  IF sql ~* '(DROP\s+DATABASE|ALTER\s+DATABASE|DROP\s+SCHEMA|CREATE\s+SCHEMA)' THEN
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

-- Grant execute permissions to authenticated users (but function checks admin role)
GRANT EXECUTE ON FUNCTION list_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;