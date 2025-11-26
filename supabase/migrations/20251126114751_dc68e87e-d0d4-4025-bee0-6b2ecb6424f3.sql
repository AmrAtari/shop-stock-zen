-- Fix RLS policies for system_settings table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view system settings
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Allow admins to insert system settings (for initial setup)
CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR NOT EXISTS (SELECT 1 FROM public.system_settings) -- Allow insert if table is empty
);

-- Allow admins to update system settings
CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));