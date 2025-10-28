-- Function to get detailed column information including foreign keys
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name_param text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  is_primary_key boolean,
  is_foreign_key boolean,
  foreign_table text,
  foreign_column text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    COALESCE(
      EXISTS(
        SELECT 1 FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc 
          ON kcu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND kcu.table_name = table_name_param
          AND kcu.column_name = c.column_name
          AND kcu.table_schema = 'public'
      ), false
    ) as is_primary_key,
    COALESCE(
      EXISTS(
        SELECT 1 FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc 
          ON kcu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.table_name = table_name_param
          AND kcu.column_name = c.column_name
          AND kcu.table_schema = 'public'
      ), false
    ) as is_foreign_key,
    (
      SELECT ccu.table_name::text
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = table_name_param
        AND kcu.column_name = c.column_name
        AND kcu.table_schema = 'public'
      LIMIT 1
    ) as foreign_table,
    (
      SELECT ccu.column_name::text
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = table_name_param
        AND kcu.column_name = c.column_name
        AND kcu.table_schema = 'public'
      LIMIT 1
    ) as foreign_column
  FROM information_schema.columns c
  WHERE c.table_name = table_name_param
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$;

-- Function to rename a column
CREATE OR REPLACE FUNCTION public.rename_column(
  table_name_param text,
  old_column_name text,
  new_column_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Validate new column name
  IF new_column_name !~ '^[a-z_][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid column name. Use only lowercase letters, numbers, and underscores.';
  END IF;
  
  EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', 
    table_name_param, old_column_name, new_column_name);
  
  RETURN jsonb_build_object('success', true, 'message', 'Column renamed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to add a foreign key constraint
CREATE OR REPLACE FUNCTION public.add_foreign_key(
  table_name_param text,
  column_name_param text,
  foreign_table_param text,
  foreign_column_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  constraint_name text;
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Generate constraint name
  constraint_name := table_name_param || '_' || column_name_param || '_fkey';
  
  EXECUTE format(
    'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I)',
    table_name_param, constraint_name, column_name_param, 
    foreign_table_param, foreign_column_param
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Foreign key added successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;