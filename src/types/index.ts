/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application.
 * FIX: Renamed 'description' to 'item_description' to match component usage
 * and ensured all necessary fields for PO items and POs are included.
 */

// --- Base Entity Type ---
export interface BaseEntity {
  // The bigint ID from Supabase, used for routing and detail pages
  id: string;
  // This is the internal primary key if different (e.g., a number sequence)
  po_id?: number;
}

// --- Store Type ---
export interface Store extends BaseEntity {
  name: string;
}

// --- Generic Item Types for PO creation and inventory ---
export interface Item {
  id: string; // UUID from the items table
  sku: string;
  name: string;
  quantity: number; // Stock level
  cost: number; // Current cost from the inventory table
}

export interface SelectedItemForPO {
  item: Item;
  quantity: number;
  price: number; // Price/Cost the PO is purchasing it at
}

// --- Supplier Type ---
export interface Supplier extends BaseEntity {
  name: string;
  address: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

// --- Purchase Order Item Type (As stored in purchase_order_items table) ---
export interface PurchaseOrderItem extends BaseEntity {
  po_id: number; // Foreign key to purchase_orders.po_id (integer PK)
  item_id: string; // Foreign key to the actual inventory item (UUID)

  // Properties denormalized from the Item/Variant table (or used for display)
  sku: string;
  item_name: string;
  item_description: string | null;
  color: string | null; // This will hold the RESOLVED name or the UUID
  size: string | null; // This will hold the RESOLVED name or the UUID
  unit: string | null;
  cost_price: number; // The individual item cost on this PO line
  quantity: number; // The quantity ordered
  received_quantity: number; // New: Quantity received
}

// --- Purchase Order Type ---
export interface PurchaseOrder extends BaseEntity {
  po_id: number; // Internal sequenced ID (PK)
  supplier_id: string; // FK to suppliers table (UUID)
  store_id: string | null; // FK to stores table (UUID)
  currency: string; // New: Currency code (e.g., USD, EUR)
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
  shipping_charges: number; // Set to number (was number | null)
  tax_amount: number; // Set to number (was number | null)
  subtotal: number; // Set to number (was number | null)
  special_instructions: string | null;
  fob_terms: string | null;
  shipping_method: string | null;
  payment_terms: string | null;
  notes: string | null; // Internal notes/comments
}

// --- Utility Types ---
import { DateRange } from "react-day-picker";
export type DateRangeType = DateRange | undefined;
