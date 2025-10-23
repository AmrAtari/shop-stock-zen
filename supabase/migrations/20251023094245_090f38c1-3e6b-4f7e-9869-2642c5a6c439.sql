-- Create attribute_types table to track all attribute tables
CREATE TABLE IF NOT EXISTS public.attribute_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'Tag',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attribute_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view attribute types"
ON public.attribute_types
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage attribute types"
ON public.attribute_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert existing attribute types
INSERT INTO public.attribute_types (name, table_name, label, icon) VALUES
  ('category', 'categories', 'Categories', 'Boxes'),
  ('unit', 'units', 'Units', 'Ruler'),
  ('color', 'colors', 'Colors', 'Tags'),
  ('gender', 'genders', 'Genders', 'User'),
  ('department', 'departments', 'Departments', 'Building'),
  ('supplier', 'suppliers', 'Suppliers', 'Package'),
  ('season', 'seasons', 'Seasons', 'CloudSun'),
  ('location', 'locations', 'Locations', 'MapPin'),
  ('size', 'sizes', 'Sizes', 'Ruler'),
  ('brand', 'brands', 'Brands', 'Tag'),
  ('main_group', 'main_groups', 'Main Groups', 'Package'),
  ('origin', 'origins', 'Origins', 'MapPin'),
  ('theme', 'themes', 'Themes', 'Eye')
ON CONFLICT (table_name) DO NOTHING;

-- Create function to create new attribute tables
CREATE OR REPLACE FUNCTION public.create_attribute_table(
  p_table_name TEXT,
  p_label TEXT,
  p_icon TEXT DEFAULT 'Tag'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validate table name (only lowercase letters and underscores)
  IF p_table_name !~ '^[a-z_]+$' THEN
    RAISE EXCEPTION 'Invalid table name. Use only lowercase letters and underscores.';
  END IF;

  -- Check if table already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RAISE EXCEPTION 'Table % already exists', p_table_name;
  END IF;

  -- Create the new attribute table
  EXECUTE format('
    CREATE TABLE public.%I (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )', p_table_name);

  -- Enable RLS
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);

  -- Create view policy
  EXECUTE format('
    CREATE POLICY "Anyone can view %I"
    ON public.%I
    FOR SELECT
    USING (true)', p_table_name, p_table_name);

  -- Create admin policies
  EXECUTE format('
    CREATE POLICY "Admins can insert %I"
    ON public.%I
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), ''admin''::app_role))', p_table_name, p_table_name);

  EXECUTE format('
    CREATE POLICY "Admins can update %I"
    ON public.%I
    FOR UPDATE
    USING (has_role(auth.uid(), ''admin''::app_role))', p_table_name, p_table_name);

  EXECUTE format('
    CREATE POLICY "Admins can delete %I"
    ON public.%I
    FOR DELETE
    USING (has_role(auth.uid(), ''admin''::app_role))', p_table_name, p_table_name);

  -- Insert into attribute_types
  INSERT INTO public.attribute_types (name, table_name, label, icon)
  VALUES (regexp_replace(p_table_name, '_', ' ', 'g'), p_table_name, p_label, p_icon);

  v_result := json_build_object(
    'success', true,
    'message', 'Attribute table created successfully',
    'table_name', p_table_name
  );

  RETURN v_result;
END;
$$;