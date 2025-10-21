-- Fix sales table RLS policies

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;

-- Create role-based SELECT policies
CREATE POLICY "Admins and supervisors view all sales"
ON public.sales FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Users view own sales"
ON public.sales FOR SELECT
USING (auth.uid() = user_id);

-- Add UPDATE policy for admins (for corrections)
CREATE POLICY "Admins can update sales"
ON public.sales FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins (for refunds/corrections)
CREATE POLICY "Admins can delete sales"
ON public.sales FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));