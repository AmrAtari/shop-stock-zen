-- Recalculate qty_on_order for ALL items based on actual PO data

-- First, reset qty_on_order to 0 for all items
UPDATE store_inventory SET qty_on_order = 0;

-- Then, recalculate qty_on_order for each item based on pending PO items
WITH item_mapping AS (
  SELECT 
    CASE 
      WHEN poi.item_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN poi.item_id::uuid
      ELSE i.id
    END as resolved_item_id,
    po.store_id,
    (poi.quantity - poi.received_quantity) as pending_qty
  FROM purchase_order_items poi
  JOIN purchase_orders po ON poi.po_id = po.po_id
  LEFT JOIN items i ON i.sku = poi.sku
  WHERE poi.quantity > poi.received_quantity
    AND po.store_id IS NOT NULL
),
pending_orders AS (
  SELECT 
    resolved_item_id as item_id,
    store_id,
    SUM(pending_qty) as pending_qty
  FROM item_mapping
  WHERE resolved_item_id IS NOT NULL
  GROUP BY resolved_item_id, store_id
)
UPDATE store_inventory si
SET qty_on_order = pending_orders.pending_qty
FROM pending_orders
WHERE si.item_id = pending_orders.item_id
  AND si.store_id = pending_orders.store_id;