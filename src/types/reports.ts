// src/types/reports.ts

export interface Store {
  id: string;
  name: string;
  location: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  location: string;
  category: string;
  brand: string;
  store_id?: string;
  store_name?: string;
  created_at?: string;
  date?: string;
  sale_date?: string;
  [key: string]: any; // For dynamic properties
}

export interface InventoryValuation {
  id: string;
  name: string;
  quantity: number;
  value: number;
  location: string;
  category: string;
  brand: string;
}

export interface LowStock {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  location: string;
  category: string;
  brand: string;
}

export interface InventoryAging {
  id: string;
  name: string;
  quantity: number;
  age_days: number;
  location: string;
  category: string;
  brand: string;
}

export interface StockMovement {
  id: string;
  name: string;
  movement_type: string;
  quantity: number;
  date: string;
  location: string;
  category: string;
  brand: string;
}

export interface ABCAnalysis {
  id: string;
  name: string;
  category: string;
  value: number;
  classification: 'A' | 'B' | 'C';
  location: string;
}

export interface SalesPerformance {
  id: string;
  name: string;
  sales: number;
  quantity: number;
  date: string;
  location: string;
  category: string;
  brand: string;
}

export interface COGS {
  id: string;
  name: string;
  cost_of_goods_sold: number;
  revenue: number;
  date: string;
  location: string;
  category: string;
}

export interface StockMovementTransaction {
  id: string;
  name: string;
  transaction_type: string;
  quantity: number;
  date: string;
  location: string;
  category: string;
  brand: string;
}

export interface Adjustment {
  id: string;
  name: string;
  adjustment_type: string;
  quantity: number;
  reason: string;
  date: string;
  location: string;
  category: string;
  brand: string;
}

export interface PivotData {
  rowField: string;
  columns: Record<string, {
    qty: number;
    sales: number;
    cost: number;
    refund: number;
    count: number;
  }>;
  totalQty: number;
  totalSales: number;
  totalCost: number;
  totalRefund: number;
  brands: Record<string, any>;
}
