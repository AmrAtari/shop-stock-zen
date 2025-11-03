/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application.
 * FIX: Renamed 'description' to 'item_description' to match component usage
 * and cleaned up syntax to resolve TS1443, TS1005, and TS1160 errors.
 */

// --- Base Entity Type ---
export interface BaseEntity {
  id: string; // The bigint ID from Supabase, used for routing
}

// --- Store Type ---
export interface Store extends BaseEntity {
  name: string;
}
export interface ItemWithDetails {
  id: string; // match your DB type
  name: string;
  sku?: string;
  category?: string;
  quantity: number;
  price?: number;
}

export interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export interface ProductDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: ItemWithDetails;
}

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

// --- Purchase Order Item Type (Resolves most PurchaseOrderDetail.tsx errors) ---
export interface PurchaseOrderItem extends BaseEntity {
  po_id: number; // Foreign key linking to PurchaseOrder.po_id (integer PK)
  item_id: string; // Foreign key to the actual inventory item

  // Properties accessed by the component (based on your errors)
  sku: string;
  item_name: string;
  // FIX: Renamed to item_description to resolve TS2551 error
  item_description: string;
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

  // Property 'notes'
  notes: string | null;
}
