export interface Store {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  color_id: string | null;
  item_color_code: string | null;
  gender: string | null;
  season: string | null;
  unit: string;
  quantity: number;
  min_stock: number;
  location: string | null;
  supplier: string | null;
  department: string | null;
  main_group: string | null;
  origin: string | null;
  theme: string | null;
  item_number: string | null;
  pos_description: string | null;
  description: string | null;
  tax: number | null;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceLevel {
  id: string;
  item_id: string;
  cost_price: number;
  selling_price: number;
  wholesale_price: number | null;
  is_current: boolean;
  effective_date: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  store_id: string | null;
  supplier: string;
  status: string;
  total_items: number;
  total_cost: number;
  expected_delivery: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string | null;
  sku: string;
  item_name: string;
  quantity: number;
  cost_price: number;
  received_quantity: number;
  created_at: string;
}

export interface ImportLog {
  id: string;
  file_name: string;
  import_type: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  duplicates_found: number;
  status: string;
  error_details: any;
  created_at: string;
}

export interface DuplicateComparison {
  id: string;
  import_log_id: string;
  sku: string;
  existing_data: any;
  new_data: any;
  differences: any;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  item_id: string;
  previous_quantity: number;
  new_quantity: number;
  adjustment: number;
  reason: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  transfer_number: string;
  from_store_id: string | null;
  to_store_id: string | null;
  status: string;
  total_items: number;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  received_by: string | null;
  approved_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  item_id: string | null;
  sku: string;
  item_name: string;
  quantity: number;
  created_at: string;
}
