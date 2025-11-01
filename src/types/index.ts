/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application.
 * FIX: Cleaned up syntax and ensured all required fields for components are present.
 */

// --- Base Entity Type ---
export interface BaseEntity {
  id: string; // The bigint ID from Supabase, used for routing
}

// --- Store Type ---
export interface Store extends BaseEntity {
  name: string;
}

// --- Supplier Type (Fixes PurchaseOrderNew.tsx type error) ---
export interface Supplier extends BaseEntity {
  name: string;
  address: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

// --- Purchase Order Item Type (Fixes item_description errors) ---
export interface PurchaseOrderItem extends BaseEntity {
  po_id: number;
  item_id: string;

  sku: string;
  item_name: string;
  // FIX: Using 'item_description' to resolve TS2551 error
  item_description: string;
  color: string | null;
  size: string | null;
  unit: string | null;
  cost_price: number;

  quantity: number;
}

// --- Purchase Order Type ---
export interface PurchaseOrder extends BaseEntity {
  po_id: number;
  supplier_id: string;
  store_id: string | null;
  currency_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  status: "draft" | "pending" | "approved" | "completed" | "cancelled" | string;
  po_number: string | null;
  authorized_by: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  buyer_address: string | null;
  buyer_contact: string | null;
  buyer_company_name: string | null;
  total_items: number | null;
  total_cost: number;
  shipping_charges: number | null;
  tax_amount: number | null;
  subtotal: number | null;
  special_instructions: string | null;
  fob_terms: string | null;
  shipping_method: string | null;
  payment_terms: string | null;
  supplier_contact_person: string | null;
  currency: string | null;
  expected_delivery: string | null;
  supplier: string | null;
  created_by: string | null;
  updated_by: string | null;
  // Included 'notes' property
  notes: string | null;
}
