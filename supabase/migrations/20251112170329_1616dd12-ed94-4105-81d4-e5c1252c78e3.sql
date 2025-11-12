-- Add more comprehensive views for reporting

-- View: POS Receipts with full transaction details
CREATE OR REPLACE VIEW v_pos_receipts_report AS
SELECT 
  cs.id as session_id,
  cs.cashier_id,
  cs.open_at,
  cs.close_at,
  cs.start_cash,
  cs.end_cash,
  t.id as transaction_id,
  t.transaction_id as receipt_number,
  t.created_at as transaction_date,
  t.item_id,
  t.sku,
  t.quantity,
  t.price,
  t.discount_fixed,
  t.discount_percent,
  t.amount,
  t.payment_method,
  t.is_refund,
  i.name as item_name,
  i.cost as cost_price,
  mg.name as brand,
  c.name as category
FROM cash_sessions cs
LEFT JOIN transactions t ON t.session_id = cs.id
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
ORDER BY t.created_at DESC;

-- RLS for v_pos_receipts_report
ALTER VIEW v_pos_receipts_report SET (security_invoker = true);

-- View: Items sold from POS with aggregation
CREATE OR REPLACE VIEW v_items_sold_report AS
SELECT 
  i.id as item_id,
  i.sku,
  i.name as item_name,
  mg.name as brand,
  c.name as category,
  s.name as supplier,
  COUNT(t.id) as total_transactions,
  SUM(t.quantity) as total_quantity_sold,
  SUM(t.amount) as total_sales_amount,
  AVG(t.price) as avg_selling_price,
  i.cost as cost_price,
  SUM(t.amount) - (i.cost * SUM(t.quantity)) as total_profit,
  MIN(t.created_at) as first_sale_date,
  MAX(t.created_at) as last_sale_date
FROM items i
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN suppliers s ON i.supplier = s.id
GROUP BY i.id, i.sku, i.name, mg.name, c.name, s.name, i.cost;

-- RLS for v_items_sold_report
ALTER VIEW v_items_sold_report SET (security_invoker = true);

-- View: Transfer Report with full details
CREATE OR REPLACE VIEW v_transfers_report AS
SELECT 
  t.transfer_id,
  t.transfer_date,
  t.status,
  t.from_store_id,
  t.to_store_id,
  fs.name as from_store_name,
  fs.location as from_store_location,
  ts.name as to_store_name,
  ts.location as to_store_location,
  ti.variant_id,
  ti.quantity as transfer_quantity
FROM transfers t
LEFT JOIN stores fs ON t.from_store_id = fs.id
LEFT JOIN stores ts ON t.to_store_id = ts.id
LEFT JOIN transfer_items ti ON ti.transfer_id = t.transfer_id;

-- RLS for v_transfers_report
ALTER VIEW v_transfers_report SET (security_invoker = true);

-- View: Stock movement summary (all sources)
CREATE OR REPLACE VIEW v_stock_movement_summary AS
SELECT 
  'SALE' as movement_type,
  t.created_at as movement_date,
  t.item_id,
  i.sku,
  i.name as item_name,
  -t.quantity as quantity_change,
  NULL as from_store,
  NULL as to_store,
  mg.name as brand,
  c.name as category
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
WHERE t.is_refund = false

UNION ALL

SELECT 
  'REFUND' as movement_type,
  t.created_at as movement_date,
  t.item_id,
  i.sku,
  i.name as item_name,
  t.quantity as quantity_change,
  NULL as from_store,
  NULL as to_store,
  mg.name as brand,
  c.name as category
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
WHERE t.is_refund = true

UNION ALL

SELECT 
  'PURCHASE_ORDER' as movement_type,
  poi.created_at as movement_date,
  poi.item_id::uuid as item_id,
  poi.sku,
  poi.item_name,
  poi.received_quantity as quantity_change,
  NULL as from_store,
  st.name as to_store,
  NULL as brand,
  NULL as category
FROM purchase_order_items poi
LEFT JOIN purchase_orders po ON poi.po_id = po.po_id
LEFT JOIN stores st ON po.store_id = st.id
WHERE poi.received_quantity > 0;

-- RLS for v_stock_movement_summary
ALTER VIEW v_stock_movement_summary SET (security_invoker = true);

-- View: Inventory turnover analysis
CREATE OR REPLACE VIEW v_inventory_turnover_report AS
SELECT 
  i.id as item_id,
  i.sku,
  i.name as item_name,
  i.quantity as current_stock,
  i.cost as cost_price,
  i.price as selling_price,
  mg.name as brand,
  c.name as category,
  COALESCE(SUM(t.quantity), 0) as total_sold,
  COALESCE(AVG(i.quantity), 0) as avg_inventory,
  CASE 
    WHEN COALESCE(AVG(i.quantity), 0) > 0 
    THEN COALESCE(SUM(t.quantity), 0) / AVG(i.quantity)
    ELSE 0 
  END as turnover_ratio,
  i.created_at as item_created_date
FROM items i
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
GROUP BY i.id, i.sku, i.name, i.quantity, i.cost, i.price, mg.name, c.name, i.created_at;

-- RLS for v_inventory_turnover_report
ALTER VIEW v_inventory_turnover_report SET (security_invoker = true);

-- View: Profit margin analysis
CREATE OR REPLACE VIEW v_profit_margin_report AS
SELECT 
  i.id as item_id,
  i.sku,
  i.name as item_name,
  i.cost as cost_price,
  i.price as selling_price,
  i.price - i.cost as profit_per_unit,
  CASE 
    WHEN i.price > 0 
    THEN ((i.price - i.cost) / i.price) * 100
    ELSE 0 
  END as profit_margin_percent,
  mg.name as brand,
  c.name as category,
  COALESCE(SUM(t.quantity), 0) as units_sold,
  COALESCE(SUM(t.amount), 0) as total_revenue,
  COALESCE(SUM(t.quantity * i.cost), 0) as total_cost,
  COALESCE(SUM(t.amount) - SUM(t.quantity * i.cost), 0) as total_profit
FROM items i
LEFT JOIN transactions t ON t.item_id = i.id AND t.is_refund = false
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN categories c ON i.category = c.id
GROUP BY i.id, i.sku, i.name, i.cost, i.price, mg.name, c.name;

-- RLS for v_profit_margin_report
ALTER VIEW v_profit_margin_report SET (security_invoker = true);