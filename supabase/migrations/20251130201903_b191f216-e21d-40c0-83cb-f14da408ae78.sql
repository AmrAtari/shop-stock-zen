-- Drop and recreate missing report views
DROP VIEW IF EXISTS v_items_sold_report CASCADE;
DROP VIEW IF EXISTS v_sales_report CASCADE;

-- Create v_items_sold_report view
CREATE VIEW v_items_sold_report AS
SELECT 
  i.id as item_id,
  i.sku,
  i.name as item_name,
  i.item_number as model_number,
  c.name as category,
  mg.name as brand,
  MIN(t.created_at) as first_sale_date,
  MAX(t.created_at) as last_sale_date,
  SUM(t.quantity) as total_quantity_sold,
  SUM(t.amount) as total_revenue,
  COUNT(DISTINCT t.transaction_id) as total_transactions,
  AVG(t.price) as avg_selling_price,
  si.quantity as current_stock,
  s.id as store_id,
  s.name as store_name
FROM items i
LEFT JOIN transactions t ON i.id = t.item_id AND t.is_refund = false
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
LEFT JOIN store_inventory si ON i.id = si.item_id
LEFT JOIN stores s ON si.store_id = s.id
GROUP BY i.id, i.sku, i.name, i.item_number, c.name, mg.name, si.quantity, s.id, s.name;

-- Create v_sales_report view for transaction details
CREATE VIEW v_sales_report AS
SELECT 
  t.id,
  t.transaction_id,
  t.created_at,
  t.item_id,
  i.sku,
  i.name as item_name,
  c.name as category,
  mg.name as brand,
  t.quantity,
  t.price,
  t.amount,
  t.discount_fixed,
  t.discount_percent,
  t.payment_method,
  t.cashier_id,
  t.is_refund
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN main_groups mg ON i.main_group = mg.id
WHERE t.is_refund = false;