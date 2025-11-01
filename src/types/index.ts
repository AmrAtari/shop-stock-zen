/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application.
 * Updated to include missing properties for PurchaseOrder and PurchaseOrderItem
 * to satisfy component usage (e.g., sku, item_name, cost_price, notes).
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

// --- Purchase Order Item Type (Fixes most PurchaseOrderDetail.tsx errors) ---
export interface PurchaseOrderItem extends BaseEntity {
  po_id: number; // Foreign key linking to PurchaseOrder.po_id (integer PK)
  item_id: string; // Foreign key to the actual inventory item

  // Properties accessed by the component (based on your errors)
  sku: string;
  item_name: string;
  description: string; // Assuming 'description' is the correct column (instead of item_description)
  // If your column is indeed item_description, change 'description' here to 'item_description'.
  color: string | null;
  size: string | null;
  unit: string | null;
  cost_price: number; // The individual item cost

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

  // FIX for TS2339: Property 'notes' does not exist
  notes: string | null;
}
