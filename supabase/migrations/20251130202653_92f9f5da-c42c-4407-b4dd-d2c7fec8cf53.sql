-- Create POS-specific report views

-- 1. Cash Sessions Report
DROP VIEW IF EXISTS v_cash_sessions_report CASCADE;
CREATE VIEW v_cash_sessions_report AS
SELECT 
  cs.id,
  cs.cashier_id,
  up.username as cashier_name,
  s.name as store_name,
  cs.open_at,
  cs.close_at,
  cs.start_cash,
  cs.end_cash,
  cs.notes,
  COALESCE(SUM(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) as total_cash_sales,
  COALESCE(SUM(CASE WHEN t.payment_method = 'card' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) as total_card_sales,
  COALESCE(SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END), 0) as total_sales,
  COALESCE(SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END), 0) as total_refunds,
  COUNT(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id END) as transaction_count,
  COUNT(DISTINCT CASE WHEN t.is_refund THEN t.transaction_id END) as refund_count,
  (cs.end_cash - cs.start_cash) as cash_difference,
  ((cs.end_cash - cs.start_cash) - COALESCE(SUM(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN t.payment_method = 'cash' AND t.is_refund THEN t.amount ELSE 0 END), 0)) as variance
FROM cash_sessions cs
LEFT JOIN user_profiles up ON cs.cashier_id = up.user_id
LEFT JOIN stores s ON up.store_id = s.id
LEFT JOIN transactions t ON t.session_id = cs.id
GROUP BY cs.id, cs.cashier_id, up.username, s.name, cs.open_at, cs.close_at, cs.start_cash, cs.end_cash, cs.notes;

-- 2. Refunds Report
DROP VIEW IF EXISTS v_refunds_report CASCADE;
CREATE VIEW v_refunds_report AS
SELECT 
  r.id as refund_id,
  r.refund_reason,
  r.refund_amount,
  r.created_at as refund_date,
  t.transaction_id,
  t.created_at as original_transaction_date,
  i.sku,
  i.name as item_name,
  t.quantity,
  t.price as original_price,
  t.payment_method,
  up_refunded.username as refunded_by_name,
  up_cashier.username as original_cashier_name,
  s.name as store_name,
  c.name as category,
  mg.name as brand
FROM refunds r
INNER JOIN transactions t ON r.transaction_id = t.id
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN user_profiles up_refunded ON r.refunded_by = up_refunded.user_id
LEFT JOIN user_profiles up_cashier ON t.cashier_id = up_cashier.user_id
LEFT JOIN stores s ON up_cashier.store_id = s.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN main_groups mg ON i.main_group = mg.id;

-- 3. Payment Methods Report
DROP VIEW IF EXISTS v_payment_methods_report CASCADE;
CREATE VIEW v_payment_methods_report AS
SELECT 
  t.payment_method,
  s.id as store_id,
  s.name as store_name,
  DATE(t.created_at) as transaction_date,
  COUNT(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id END) as transaction_count,
  SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END) as total_sales,
  SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END) as total_refunds,
  SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END) as net_amount,
  AVG(CASE WHEN NOT t.is_refund THEN t.amount END) as avg_transaction_value
FROM transactions t
LEFT JOIN cash_sessions cs ON t.session_id = cs.id
LEFT JOIN user_profiles up ON cs.cashier_id = up.user_id
LEFT JOIN stores s ON up.store_id = s.id
GROUP BY t.payment_method, s.id, s.name, DATE(t.created_at);

-- 4. Cashier Performance Report
DROP VIEW IF EXISTS v_cashier_performance_report CASCADE;
CREATE VIEW v_cashier_performance_report AS
SELECT 
  up.user_id as cashier_id,
  up.username as cashier_name,
  s.id as store_id,
  s.name as store_name,
  DATE(t.created_at) as transaction_date,
  COUNT(DISTINCT cs.id) as sessions_worked,
  COUNT(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id END) as total_transactions,
  COUNT(DISTINCT CASE WHEN t.is_refund THEN t.transaction_id END) as total_refunds,
  SUM(CASE WHEN NOT t.is_refund THEN t.quantity ELSE 0 END) as items_sold,
  SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END) as total_sales,
  SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END) as total_refund_amount,
  SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END) as net_sales,
  AVG(CASE WHEN NOT t.is_refund THEN t.amount END) as avg_transaction_value,
  SUM(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN t.payment_method = 'card' AND NOT t.is_refund THEN t.amount ELSE 0 END) as card_sales
FROM user_profiles up
LEFT JOIN stores s ON up.store_id = s.id
LEFT JOIN cash_sessions cs ON cs.cashier_id = up.user_id
LEFT JOIN transactions t ON t.cashier_id = up.user_id
WHERE up.user_id IN (SELECT DISTINCT cashier_id FROM cash_sessions WHERE cashier_id IS NOT NULL)
GROUP BY up.user_id, up.username, s.id, s.name, DATE(t.created_at);

-- 5. Daily POS Summary Report
DROP VIEW IF EXISTS v_daily_pos_summary CASCADE;
CREATE VIEW v_daily_pos_summary AS
SELECT 
  s.id as store_id,
  s.name as store_name,
  DATE(t.created_at) as sales_date,
  COUNT(DISTINCT cs.id) as sessions_count,
  COUNT(DISTINCT t.cashier_id) as active_cashiers,
  COUNT(DISTINCT CASE WHEN NOT t.is_refund THEN t.transaction_id END) as total_transactions,
  COUNT(DISTINCT CASE WHEN t.is_refund THEN t.transaction_id END) as total_refunds,
  SUM(CASE WHEN NOT t.is_refund THEN t.quantity ELSE 0 END) as items_sold,
  SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END) as gross_sales,
  SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END) as refund_amount,
  SUM(CASE WHEN NOT t.is_refund THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.is_refund THEN t.amount ELSE 0 END) as net_sales,
  SUM(CASE WHEN t.payment_method = 'cash' AND NOT t.is_refund THEN t.amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN t.payment_method = 'card' AND NOT t.is_refund THEN t.amount ELSE 0 END) as card_sales,
  AVG(CASE WHEN NOT t.is_refund THEN t.amount END) as avg_transaction_value
FROM stores s
LEFT JOIN user_profiles up ON up.store_id = s.id
LEFT JOIN cash_sessions cs ON cs.cashier_id = up.user_id
LEFT JOIN transactions t ON t.cashier_id = up.user_id AND DATE(t.created_at) = DATE(cs.open_at)
GROUP BY s.id, s.name, DATE(t.created_at);