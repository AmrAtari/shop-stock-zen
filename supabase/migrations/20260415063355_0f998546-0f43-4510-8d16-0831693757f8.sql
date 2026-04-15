CREATE OR REPLACE FUNCTION public.execute_readonly_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  upper_query text;
BEGIN
  upper_query := UPPER(TRIM(query));
  
  -- Only allow SELECT or WITH statements
  IF NOT (upper_query LIKE 'SELECT%' OR upper_query LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Block dangerous keywords
  IF upper_query ~ '(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE)\s' THEN
    RAISE EXCEPTION 'Query contains prohibited operations';
  END IF;
  
  -- Execute and return as JSON array
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query || ') t'
  INTO result;
  
  RETURN result;
END;
$$;