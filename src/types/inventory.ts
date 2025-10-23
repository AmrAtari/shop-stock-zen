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

// ADD these new types for real-time stock calculations
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
