/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application
 * to ensure type safety, particularly when interacting with Supabase data.
 */

// --- Base Entity Type ---
// Assuming all primary entities have a string or number ID
export interface BaseEntity {
  id: string; // Using string as the primary ID type for consistency
}

// --- Store Type ---
// Used by useStores
export interface Store extends BaseEntity {
  name: string;
}

// --- Supplier Type ---
// The error in PurchaseOrderNew.tsx required this to be fully defined.
export interface Supplier extends BaseEntity {
  // Fields included to satisfy type-checking requirements in PurchaseOrderNew.tsx
  name: string;
  address: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  created_at: string; 
  // Add other required fields if necessary
}

// --- Purchase Order Type (Based on 'Column Structure purchase_orders' CSV) ---
// Used by usePurchaseOrders
export interface PurchaseOrder extends BaseEntity {
  // Note: 'id' (bigint) is used as the primary identifier in the UI components
  // 'po_id' (integer) is present as PK in the schema but often shadowed by 'id' in RLS-enabled Supabase views.
  po_id: number;

  supplier_id: string; // Foreign Key to Supplier
  store_id: string | null; // Foreign Key to Store
  currency_id: string | null;
  
  order_date: string; // Date string (e.g., 'YYYY-MM-DD')
  expected_delivery_date: string | null;
  
  status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled' | string; // character varying
  po_number: string | null; // Unique PO Identifier
  
  authorized_by: string | null; 
  
  billing_address: string | null;
  shipping_address: string | null;
  
  // Buyer Details
  buyer_address: string | null;
  buyer_contact: string | null;
  buyer_company_name: string | null;
  
  // Cost/Item Summary
  total_items: number | null; // integer
  total_cost: number; // numeric (using 'number' for TypeScript, assuming it's not nullable for display)
  shipping_charges: number | null;
  tax_amount: number | null;
  subtotal: number | null;
  
  // Terms & Instructions
  special_instructions: string | null;
  fob_terms: string | null;
  shipping_method: string | null;
  payment_terms: string | null;

  supplier_contact_person: string | null;
  currency: string | null;
  expected_delivery: string | null; // timestamp
  supplier: string | null; // Denormalized supplier name for listing
  
  created_by: string | null;
  updated_by: string | null;
}
