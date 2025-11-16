-- Create missing v_transfers_report view for advanced reports

CREATE OR REPLACE VIEW public.v_transfers_report AS
SELECT 
  t.transfer_id,
  t.transfer_number,
  t.from_store_id,
  fs.name as from_store_name,
  fs.location as from_store_location,
  t.to_store_id,
  ts.name as to_store_name,
  ts.location as to_store_location,
  t.transfer_date,
  t.request_date,
  t.approved_at,
  t.shipped_at,
  t.received_at,
  t.status,
  t.reason,
  t.notes,
  t.requested_by,
  t.approved_by,
  t.shipped_by,
  t.received_by,
  COUNT(ti.id) as total_items,
  SUM(ti.requested_quantity) as total_requested_quantity,
  SUM(ti.approved_quantity) as total_approved_quantity,
  SUM(ti.shipped_quantity) as total_shipped_quantity,
  SUM(ti.received_quantity) as total_received_quantity
FROM public.transfers t
LEFT JOIN public.stores fs ON t.from_store_id = fs.id
LEFT JOIN public.stores ts ON t.to_store_id = ts.id
LEFT JOIN public.transfer_items ti ON t.transfer_id = ti.transfer_id
GROUP BY 
  t.transfer_id,
  t.transfer_number,
  t.from_store_id,
  fs.name,
  fs.location,
  t.to_store_id,
  ts.name,
  ts.location,
  t.transfer_date,
  t.request_date,
  t.approved_at,
  t.shipped_at,
  t.received_at,
  t.status,
  t.reason,
  t.notes,
  t.requested_by,
  t.approved_by,
  t.shipped_by,
  t.received_by;