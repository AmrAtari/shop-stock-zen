-- Add professional metadata columns to physical_inventory_sessions table
ALTER TABLE physical_inventory_sessions 
ADD COLUMN store_id uuid REFERENCES stores(id),
ADD COLUMN count_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN count_type text NOT NULL DEFAULT 'full' CHECK (count_type IN ('full', 'partial', 'cycle')),
ADD COLUMN responsible_person text,
ADD COLUMN department text,
ADD COLUMN purpose text,
ADD COLUMN expected_items integer,
ADD COLUMN location_filter text;

-- Add comment for documentation
COMMENT ON COLUMN physical_inventory_sessions.count_type IS 'Type of inventory count: full, partial, or cycle';
COMMENT ON COLUMN physical_inventory_sessions.purpose IS 'Purpose of count: Annual Count, Monthly Reconciliation, Variance Investigation, Pre-Audit, Other';