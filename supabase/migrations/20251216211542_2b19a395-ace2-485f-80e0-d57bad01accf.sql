-- =============================================
-- PHASE 1: CRM, SALES ORDERS, DOCUMENTS, AUDIT
-- =============================================

-- Enhance existing customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'retail';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID;

-- Customer contacts (multiple contacts per customer)
CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer groups for segmentation
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link customers to groups
CREATE TABLE IF NOT EXISTS customer_group_members (
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  group_id UUID REFERENCES customer_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, group_id)
);

-- Enable RLS on customer tables
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_contacts
CREATE POLICY "Allow all access to customer_contacts for authenticated" ON customer_contacts
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS policies for customer_groups
CREATE POLICY "Allow all access to customer_groups for authenticated" ON customer_groups
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS policies for customer_group_members
CREATE POLICY "Allow all access to customer_group_members for authenticated" ON customer_group_members
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- SALES ORDERS MODULE
-- =============================================

-- Sales Orders (B2B sales, not POS)
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  store_id UUID REFERENCES stores(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  status VARCHAR(50) DEFAULT 'draft',
  order_type VARCHAR(50) DEFAULT 'sales_order',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_terms VARCHAR(50),
  shipping_address TEXT,
  billing_address TEXT,
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  sku VARCHAR(100),
  item_name VARCHAR(255),
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(15,2),
  shipped_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery Notes (for partial shipments)
CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id),
  delivery_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'pending',
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(100),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
  sales_order_item_id UUID REFERENCES sales_order_items(id),
  quantity_shipped INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sales tables
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all access to sales_orders for authenticated" ON sales_orders
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all access to sales_order_items for authenticated" ON sales_order_items
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all access to delivery_notes for authenticated" ON delivery_notes
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow all access to delivery_note_items for authenticated" ON delivery_note_items
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- DOCUMENT MANAGEMENT
-- =============================================

-- Document attachments (for PO, invoices, etc.)
CREATE TABLE IF NOT EXISTS document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON document_attachments(entity_type, entity_id);

ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to document_attachments for authenticated" ON document_attachments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- ENHANCED AUDIT LOG
-- =============================================

-- Enhance existing audit_log table
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action_type, new_data, user_id, timestamp)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid(), NOW());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action_type, old_data, new_data, user_id, timestamp)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NOW());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action_type, old_data, user_id, timestamp)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid(), NOW());
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach audit triggers to key tables
DROP TRIGGER IF EXISTS audit_sales_orders ON sales_orders;
CREATE TRIGGER audit_sales_orders AFTER INSERT OR UPDATE OR DELETE ON sales_orders 
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_customers ON customers;
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers 
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_items ON items;
CREATE TRIGGER audit_items AFTER INSERT OR UPDATE OR DELETE ON items 
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();