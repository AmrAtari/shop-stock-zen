-- Create workflow_rules table for document approval workflows
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'purchase_order', 'transfer', 'invoice'
  condition_type TEXT NOT NULL, -- 'value_threshold', 'always'
  threshold_value NUMERIC,
  required_approver_role app_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workflow_rules
CREATE POLICY "Authenticated users can view workflow rules"
ON public.workflow_rules
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage workflow rules"
ON public.workflow_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default workflow rules
INSERT INTO public.workflow_rules (name, document_type, condition_type, threshold_value, required_approver_role, is_active)
VALUES 
  ('PO Above $5000 Requires Admin', 'purchase_order', 'value_threshold', 5000, 'admin', true),
  ('All Transfers Require Supervisor', 'transfer', 'always', NULL, 'supervisor', true)
ON CONFLICT DO NOTHING;