-- Global rebuild of store_inventory from purchase orders (received and pending)
-- 1) Resolve item IDs for all PO lines using item_id (UUID) or fallback SKU mapping
WITH resolved_po AS (
  SELECT 
    CASE 
      WHEN poi.item_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN poi.item_id::uuid
      ELSE i.id
    END AS item_id,
    po.store_id,
    GREATEST(poi.received_quantity, 0) AS received_qty,
    GREATEST(poi.quantity - poi.received_quantity, 0) AS pending_qty
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.po_id = poi.po_id
  LEFT JOIN items i ON i.sku = poi.sku
  WHERE po.store_id IS NOT NULL
),
received_by_store AS (
  SELECT item_id, store_id, SUM(received_qty)::int AS total_received
  FROM resolved_po
  WHERE item_id IS NOT NULL
  GROUP BY item_id, store_id
),
pending_by_store AS (
  SELECT item_id, store_id, SUM(pending_qty)::int AS pending_qty
  FROM resolved_po
  WHERE item_id IS NOT NULL
  GROUP BY item_id, store_id
),
all_pairs AS (
  SELECT item_id, store_id FROM received_by_store
  UNION
  SELECT item_id, store_id FROM pending_by_store
  UNION
  SELECT si.item_id, si.store_id FROM store_inventory si
)
-- 2) Upsert store_inventory with recomputed totals
INSERT INTO store_inventory (item_id, store_id, quantity, qty_on_order)
SELECT 
  p.item_id,
  p.store_id,
  COALESCE(r.total_received, 0) AS quantity,
  COALESCE(pg.pending_qty, 0) AS qty_on_order
FROM all_pairs p
LEFT JOIN received_by_store r ON r.item_id = p.item_id AND r.store_id = p.store_id
LEFT JOIN pending_by_store pg ON pg.item_id = p.item_id AND pg.store_id = p.store_id
WHERE p.item_id IS NOT NULL
ON CONFLICT (item_id, store_id)
DO UPDATE SET 
  quantity = EXCLUDED.quantity,
  qty_on_order = EXCLUDED.qty_on_order;