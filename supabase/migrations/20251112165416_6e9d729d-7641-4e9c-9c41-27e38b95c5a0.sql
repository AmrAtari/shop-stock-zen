-- Create comprehensive database views for reporting with proper RLS

-- View: Items with full attributes for reporting
CREATE OR REPLACE VIEW v_items_report AS
SELECT 
  i.id,
  i.sku,
  i.name,
  i.quantity as global_quantity,
  i.price as selling_price,
  i.cost as cost_price,
  i.min_stock,
  i.unit,
  i.created_at,
  i.last_restocked,
  s.name as supplier_name,
  s.id as supplier_id,
  g.name as gender,
  mg.name as brand,
  mg.id as brand_id,
  c.name as category,
  c.id as category_id,
  o.name as origin,
  se.name as season,
  sz.name as size,
  cl.name as color
FROM items i
LEFT JOIN suppliers s ON i.supplier = s.id
LEFT JOIN genders g ON i.gender = g.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN origins o ON i.origin = o.id
LEFT JOIN seasons se ON i.season = se.id
LEFT JOIN sizes sz ON i.size = sz.id
LEFT JOIN colors cl ON i.color = cl.id;

-- RLS for v_items_report
ALTER VIEW v_items_report SET (security_invoker = true);

-- View: Store inventory with item details
CREATE OR REPLACE VIEW v_store_inventory_report AS
SELECT 
  si.id,
  si.item_id,
  si.store_id,
  si.quantity as store_quantity,
  si.qty_on_order,
  si.created_at,
  st.name as store_name,
  st.location as store_location,
  i.sku,
  i.name as item_name,
  i.price as selling_price,
  i.cost as cost_price,
  i.min_stock,
  i.unit,
  s.name as supplier_name,
  mg.name as brand,
  c.name as category
FROM store_inventory si
JOIN stores st ON si.store_id = st.id
JOIN items i ON si.item_id = i.id
LEFT JOIN suppliers s ON i.supplier = s.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id;

-- RLS for v_store_inventory_report
ALTER VIEW v_store_inventory_report SET (security_invoker = true);

-- View: Sales transactions with full details
CREATE OR REPLACE VIEW v_sales_report AS
SELECT 
  t.id,
  t.transaction_id,
  t.session_id,
  t.cashier_id,
  t.item_id,
  t.sku,
  t.quantity,
  t.price,
  t.discount_fixed,
  t.discount_percent,
  t.amount,
  t.payment_method,
  t.is_refund,
  t.is_refunded,
  t.created_at,
  i.name as item_name,
  i.cost as cost_price,
  mg.name as brand,
  c.name as category,
  cs.cashier_id as session_cashier_id
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN cash_sessions cs ON t.session_id = cs.id;

-- RLS for v_sales_report
ALTER VIEW v_sales_report SET (security_invoker = true);

-- View: Purchase orders with details
CREATE OR REPLACE VIEW v_po_report AS
SELECT 
  po.id,
  po.po_number,
  po.po_id,
  po.store_id,
  po.supplier_id,
  po.order_date,
  po.expected_delivery_date,
  po.status,
  po.total_items,
  po.total_cost,
  po.subtotal,
  po.shipping_charges,
  po.tax_amount,
  po.currency,
  s.name as supplier_name,
  st.name as store_name,
  st.location as store_location
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id::text
LEFT JOIN stores st ON po.store_id = st.id;

-- RLS for v_po_report
ALTER VIEW v_po_report SET (security_invoker = true);