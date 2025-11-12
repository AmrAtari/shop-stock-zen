-- Create item lifecycle report view
CREATE OR REPLACE VIEW v_item_lifecycle_report AS
SELECT 
  i.id as item_id,
  i.sku,
  i.name as item_name,
  i.item_number as model_number,
  i.created_at as date_added,
  i.cost as original_cost,
  i.price as original_price,
  
  -- Purchase Order data
  po.order_date as last_po_date,
  po.po_number as last_po_number,
  poi.cost_price as last_po_cost,
  poi.quantity as last_po_quantity,
  
  -- Stock movement data
  si.store_id,
  s.name as store_name,
  si.quantity as current_stock,
  
  -- Sales data
  t.created_at as last_sale_date,
  t.transaction_id as last_transaction_id,
  t.quantity as last_sale_quantity,
  t.price as last_sale_price,
  t.amount as last_sale_amount,
  
  -- Summary stats
  (SELECT COUNT(*) FROM transactions WHERE item_id = i.id AND is_refund = false) as total_transactions,
  (SELECT COALESCE(SUM(quantity), 0) FROM transactions WHERE item_id = i.id AND is_refund = false) as total_quantity_sold,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE item_id = i.id AND is_refund = false) as total_revenue,
  
  -- Brands and categories
  b.name as brand,
  c.name as category
FROM items i
LEFT JOIN store_inventory si ON i.id = si.item_id
LEFT JOIN stores s ON si.store_id = s.id
LEFT JOIN purchase_order_items poi ON i.sku = poi.sku
LEFT JOIN purchase_orders po ON poi.po_id = po.po_id
LEFT JOIN transactions t ON i.id = t.item_id
LEFT JOIN main_groups b ON i.main_group = b.id
LEFT JOIN categories c ON i.category = c.id
ORDER BY i.created_at DESC;