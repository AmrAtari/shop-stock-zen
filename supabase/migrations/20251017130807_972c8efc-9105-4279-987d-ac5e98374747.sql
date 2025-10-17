-- Create physical inventory sessions table
CREATE TABLE public.physical_inventory_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create physical inventory counts table
CREATE TABLE public.physical_inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.physical_inventory_sessions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  system_quantity INTEGER NOT NULL,
  counted_quantity INTEGER NOT NULL,
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  variance_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN system_quantity > 0 THEN ((counted_quantity - system_quantity)::NUMERIC / system_quantity * 100)
      ELSE 0
    END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.physical_inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_inventory_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for physical_inventory_sessions
CREATE POLICY "Authenticated users can view sessions"
ON public.physical_inventory_sessions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users with permissions can create sessions"
ON public.physical_inventory_sessions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'inventory_man'::app_role)
);

CREATE POLICY "Admins and supervisors can update sessions"
ON public.physical_inventory_sessions
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Admins can delete sessions"
ON public.physical_inventory_sessions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for physical_inventory_counts
CREATE POLICY "Authenticated users can view counts"
ON public.physical_inventory_counts
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users with permissions can insert counts"
ON public.physical_inventory_counts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'inventory_man'::app_role)
);

CREATE POLICY "Admins and supervisors can update counts"
ON public.physical_inventory_counts
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Admins can delete counts"
ON public.physical_inventory_counts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate session number
CREATE OR REPLACE FUNCTION public.generate_pi_session_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_sequence INTEGER;
  next_sequence INTEGER;
  year_part TEXT;
  session_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN session_number ~ ('^PI-' || year_part || '-[0-9]+$')
        THEN CAST(SUBSTRING(session_number FROM LENGTH('PI-' || year_part || '-') + 1) AS INTEGER)
        ELSE 0
      END
    ),
    0
  ) INTO last_sequence
  FROM physical_inventory_sessions
  WHERE session_number LIKE 'PI-' || year_part || '-%';
  
  next_sequence := last_sequence + 1;
  
  RETURN 'PI-' || year_part || '-' || LPAD(next_sequence::TEXT, 4, '0');
END;
$$;