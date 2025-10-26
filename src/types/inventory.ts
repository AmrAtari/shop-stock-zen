// src/types/inventory.ts

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  supplier: string;
  lastRestocked: string;
  location: string;
}

export interface StockAdjustment {
  id: string;
  itemId: string;
  itemName: string;
  previousQty: number;
  newQty: number;
  adjustment: number;
  reason: string;
  date: string;
  user: string;
}

// Real-time stock
export interface RealTimeStock {
  item_id: string;
  location_id: string | null;
  current_stock: number;
  item_name: string;
  location_name: string;
  sku: string;
}

export interface InventoryMovement {
  transfer_id: string;
  transaction_date: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  movement_type: "INBOUND" | "OUTBOUND";
  status: string;
  transfer_number: string;
}

// ======= Physical Inventory Types =======

// Each counted item in a physical inventory session
export interface PhysicalInventoryCount {
  id?: string;
  session_id: string;
  item_id: string;
  sku: string;
  item_name: string;
  system_quantity: number;
  counted_quantity: number;
  status?: "pending" | "approved" | "rejected";
  notes?: string;
  variance?: number;
  variance_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

// Physical inventory session
export interface PhysicalInventorySession {
  id: string;
  store_id: string;
  store_name?: string;
  session_number: string;
  created_at: string;
  updated_at: string;
  status: "pending" | "completed";
  counts?: PhysicalInventoryCount[];
}
