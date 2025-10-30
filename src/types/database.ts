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
  color_id_code: string | null; // ADDED: Resolves error in FileImport.tsx
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
  // NEW: Added price and cost to align with FileImport component
  price: number | null;
  cost: number | null;
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

export interface Supplier {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "staff" | "viewer";
  phone_number: string | null;
  last_login: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  created_at: string;
  expected_delivery_date: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string;
  sku: string;
  name: string;
  size: string | null;
  model_number: string | null;
  unit: string;
  quantity: number;
  cost_price: number;
  received_quantity: number;
  created_at: string;
}

// ADDED: Resolves error in useTransferDetail.tsx
export interface TransferItem {
  id: string;
  transfer_id: string;
  item_id: string;
  sku: string;
  name: string;
  // NEW: Added item_name to resolve the TransferDetail.tsx errors
  item_name: string;
  size: string | null;
  quantity: number;
  status: "pending" | "sent" | "received"; // Status of the item within the transfer
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
  created_at: string;
}
