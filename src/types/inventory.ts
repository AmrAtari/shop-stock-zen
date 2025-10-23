export interface RealTimeStock {
  item_id: string;
  location_id: string;
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
