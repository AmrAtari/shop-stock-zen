-- Drop existing views if they exist
DROP VIEW IF EXISTS v_store_inventory_report CASCADE;
DROP VIEW IF EXISTS v_po_report CASCADE;
DROP VIEW IF EXISTS v_pos_receipts_report CASCADE;
DROP VIEW IF EXISTS v_stock_movement_summary CASCADE;

-- Create v_store_inventory_report view (fixed columns)
CREATE VIEW v_store_inventory_report AS
SELECT 
  si.id,
  si.item_id,
  i.sku,
  i.name as item_name,
  si.store_id,
  s.name as store_name,
  s.location as store_location,
  si.quantity as store_quantity,
  si.qty_on_order,
  i.cost as cost_price,
  i.price as selling_price,
  i.min_stock,
  c.name as category,
  mg.name as brand,
  si.created_at,
  i.updated_at
FROM store_inventory si
LEFT JOIN items i ON si.item_id = i.id
LEFT JOIN stores s ON si.store_id = s.id
LEFT JOIN categories c ON i.category = c.id
LEFT JOIN main_groups mg ON i.main_group = mg.id;

-- Create v_po_report view
CREATE VIEW v_po_report AS
SELECT 
  po.po_id,
  po.po_number,
  po.order_date,
  po.expected_delivery_date,
  po.status,
  po.store_id,
  s.name as store_name,
  po.supplier_id,
  sup.name as supplier_name,
  po.total_items,
  po.total_cost,
  po.subtotal,
  po.tax_amount,
  po.shipping_charges,
  po.currency_id,
  po.payment_terms,
  po.created_by,
  po.approved_by
FROM purchase_orders po
LEFT JOIN stores s ON po.store_id = s.id
LEFT JOIN suppliers sup ON po.supplier_id::uuid = sup.id;

-- Create v_pos_receipts_report view
CREATE VIEW v_pos_receipts_report AS
SELECT 
  t.transaction_id,
  t.created_at,
  t.cashier_id,
  t.payment_method,
  SUM(t.amount) as total_amount,
  t.session_id,
  cs.start_cash,
  cs.end_cash,
  COUNT(DISTINCT t.id) as line_items
FROM transactions t
LEFT JOIN cash_sessions cs ON t.session_id = cs.id
WHERE t.is_refund = false
GROUP BY t.transaction_id, t.created_at, t.cashier_id, t.payment_method, t.session_id, cs.start_cash, cs.end_cash;

-- Create v_stock_movement_summary view  
CREATE VIEW v_stock_movement_summary AS
SELECT 
  t.transfer_id,
  t.transfer_number,
  t.transfer_date as movement_date,
  t.status,
  t.from_store_id,
  fs.name as from_store_name,
  t.to_store_id,
  ts.name as to_store_name,
  ti.item_id,
  i.sku,
  i.name as item_name,
  ti.requested_quantity,
  ti.approved_quantity,
  ti.shipped_quantity,
  ti.received_quantity,
  'TRANSFER' as movement_type
FROM transfers t
LEFT JOIN stores fs ON t.from_store_id = fs.id
LEFT JOIN stores ts ON t.to_store_id = ts.id
LEFT JOIN transfer_items ti ON t.transfer_id = ti.transfer_id
LEFT JOIN items i ON ti.item_id = i.id;