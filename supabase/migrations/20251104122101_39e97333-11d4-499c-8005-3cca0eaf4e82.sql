-- Create view for store stock levels with item details
CREATE OR REPLACE VIEW v_store_stock_levels AS
SELECT 
  si.id,
  si.item_id,
  si.store_id,
  si.quantity,
  COALESCE(i.min_stock, 0) as min_stock,
  i.last_restocked,
  i.sku,
  i.name as item_name,
  s.name as store_name,
  COALESCE(cat.name, '') as category,
  COALESCE(b.name, '') as brand,
  i.unit
FROM store_inventory si
INNER JOIN items i ON si.item_id = i.id
INNER JOIN stores s ON si.store_id = s.id
LEFT JOIN categories cat ON i.category = cat.id
LEFT JOIN brands b ON i.supplier = b.id
ORDER BY i.name, s.name;