
-- Phase 2: Advanced Inventory, Enhanced PO, Notifications, BI Dashboard

-- Batch/Lot tracking
CREATE TABLE IF NOT EXISTS public.item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  batch_number VARCHAR(100) NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  quantity INTEGER DEFAULT 0,
  cost_price DECIMAL(15,2),
  store_id UUID REFERENCES stores(id),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Serial number tracking
CREATE TABLE IF NOT EXISTS public.item_serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  batch_id UUID REFERENCES item_batches(id),
  status VARCHAR(50) DEFAULT 'in_stock',
  store_id UUID REFERENCES stores(id),
  sold_transaction_id UUID,
  purchase_date DATE,
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse bin locations
CREATE TABLE IF NOT EXISTS public.bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  bin_code VARCHAR(50) NOT NULL,
  aisle VARCHAR(20),
  rack VARCHAR(20),
  shelf VARCHAR(20),
  bin VARCHAR(20),
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item-bin assignments
CREATE TABLE IF NOT EXISTS public.item_bin_locations (
  item_id UUID REFERENCES items(id),
  bin_id UUID REFERENCES bin_locations(id),
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  max_quantity INTEGER,
  PRIMARY KEY (item_id, bin_id)
);

-- Reorder rules
CREATE TABLE IF NOT EXISTS public.reorder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  store_id UUID REFERENCES stores(id),
  reorder_point INTEGER NOT NULL,
  reorder_quantity INTEGER NOT NULL,
  preferred_supplier_id UUID REFERENCES suppliers(id),
  lead_time_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PO Receiving records
CREATE TABLE IF NOT EXISTS public.po_receiving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id INTEGER,
  receiving_number VARCHAR(50) UNIQUE NOT NULL,
  receiving_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'draft',
  received_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.po_receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id UUID REFERENCES po_receiving(id),
  po_item_id UUID REFERENCES purchase_order_items(id),
  received_quantity INTEGER NOT NULL,
  accepted_quantity INTEGER,
  rejected_quantity INTEGER DEFAULT 0,
  rejection_reason TEXT,
  batch_number VARCHAR(100),
  qc_status VARCHAR(50) DEFAULT 'pending',
  qc_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PO Amendments tracking
CREATE TABLE IF NOT EXISTS public.po_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id INTEGER,
  amendment_number INTEGER NOT NULL,
  amendment_date DATE DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  changes JSONB NOT NULL,
  approved_by UUID,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor performance metrics
CREATE TABLE IF NOT EXISTS public.vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  evaluation_period VARCHAR(20),
  period_start DATE,
  period_end DATE,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  late_deliveries INTEGER DEFAULT 0,
  quality_pass_rate DECIMAL(5,2),
  avg_lead_time_days DECIMAL(5,1),
  total_value DECIMAL(15,2),
  defect_rate DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Notification templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(255),
  body_template TEXT NOT NULL,
  sms_template VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhance notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- KPI definitions
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  calculation_formula TEXT,
  target_value DECIMAL(15,2),
  unit VARCHAR(50),
  frequency VARCHAR(20) DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPI history
CREATE TABLE IF NOT EXISTS public.kpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES kpi_definitions(id),
  period_date DATE NOT NULL,
  actual_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  variance DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard configurations
CREATE TABLE IF NOT EXISTS public.dashboard_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  config_name VARCHAR(100) DEFAULT 'default',
  widgets JSONB NOT NULL,
  layout JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_bin_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can manage item_batches" ON public.item_batches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage item_serial_numbers" ON public.item_serial_numbers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage bin_locations" ON public.bin_locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage item_bin_locations" ON public.item_bin_locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage reorder_rules" ON public.reorder_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage po_receiving" ON public.po_receiving FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage po_receiving_items" ON public.po_receiving_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage po_amendments" ON public.po_amendments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage vendor_performance" ON public.vendor_performance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage notification_preferences" ON public.notification_preferences FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view notification_templates" ON public.notification_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage kpi_definitions" ON public.kpi_definitions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage kpi_history" ON public.kpi_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own dashboard_configurations" ON public.dashboard_configurations FOR ALL USING (auth.uid() = user_id);
