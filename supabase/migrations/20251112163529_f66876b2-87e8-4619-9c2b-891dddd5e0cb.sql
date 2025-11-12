-- Add RLS policies to system_settings table for security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read system settings
CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can update system settings
CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert system settings
CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));