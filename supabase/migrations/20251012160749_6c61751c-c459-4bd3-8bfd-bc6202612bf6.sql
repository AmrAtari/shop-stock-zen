-- Add new attribute tables
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.main_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.origins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add color_id to colors table
ALTER TABLE public.colors ADD COLUMN IF NOT EXISTS color_id TEXT UNIQUE;

-- Update items table with new fields
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS pos_description TEXT,
  ADD COLUMN IF NOT EXISTS item_number TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS main_group TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS color_id TEXT,
  ADD COLUMN IF NOT EXISTS item_color_code TEXT,
  ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;

-- Create index on item_number for better search performance
CREATE INDEX IF NOT EXISTS idx_items_item_number ON public.items(item_number);

-- Enable RLS on new tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.main_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for departments
CREATE POLICY "Anyone can view departments" ON public.departments
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert departments" ON public.departments
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update departments" ON public.departments
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete departments" ON public.departments
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for main_groups
CREATE POLICY "Anyone can view main_groups" ON public.main_groups
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert main_groups" ON public.main_groups
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update main_groups" ON public.main_groups
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete main_groups" ON public.main_groups
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for origins
CREATE POLICY "Anyone can view origins" ON public.origins
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert origins" ON public.origins
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update origins" ON public.origins
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete origins" ON public.origins
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for themes
CREATE POLICY "Anyone can view themes" ON public.themes
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert themes" ON public.themes
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update themes" ON public.themes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete themes" ON public.themes
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));