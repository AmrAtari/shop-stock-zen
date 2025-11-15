-- Create physical_inventory_counts table for storing individual item counts
CREATE TABLE IF NOT EXISTS public.physical_inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES physical_inventory_sessions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  system_quantity numeric NOT NULL DEFAULT 0,
  counted_quantity numeric NOT NULL DEFAULT 0,
  variance numeric GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  variance_percentage numeric GENERATED ALWAYS AS (
    CASE 
      WHEN system_quantity > 0 THEN ((counted_quantity - system_quantity) / system_quantity) * 100
      ELSE 0
    END
  ) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  counted_by uuid REFERENCES auth.users(id),
  counted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_physical_inventory_counts_session ON physical_inventory_counts(session_id);
CREATE INDEX idx_physical_inventory_counts_item ON physical_inventory_counts(item_id);
CREATE INDEX idx_physical_inventory_counts_status ON physical_inventory_counts(status);

-- Enable RLS
ALTER TABLE physical_inventory_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view counts"
  ON physical_inventory_counts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users with permissions can create counts"
  ON physical_inventory_counts
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'inventory_man'::app_role)
  );

CREATE POLICY "Users with permissions can update counts"
  ON physical_inventory_counts
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'inventory_man'::app_role)
  );

CREATE POLICY "Admins can delete counts"
  ON physical_inventory_counts
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_physical_inventory_counts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_physical_inventory_counts_updated_at
  BEFORE UPDATE ON physical_inventory_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_physical_inventory_counts_updated_at();