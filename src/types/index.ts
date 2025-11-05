/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application.
 */

import { DateRange } from "react-day-picker";

// --- Base Entity Type ---
export interface BaseEntity {
  id: string;
  po_id?: number;
}

// --- Store Type ---
export interface Store extends BaseEntity {
  name: string;
  location?: string | null;
}

// --- Generic Item Types for PO creation and inventory ---
export interface Item {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  cost: number;
}

export interface SelectedItemForPO {
  item: Item;
  quantity: number;
  price: number;
}

// --- Supplier Type ---
export interface Supplier extends BaseEntity {
  name: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

// --- Purchase Order Item Type ---
export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  sku: string;
  item_name: string;
  item_description: string | null;
  color: string | null;
  size: string | null;
  model_number: string | null;
  quantity: number;
  cost_price: number;
  received_quantity: number;
  unit: string;
}

// --- Purchase Order Type ---
export interface PurchaseOrder extends BaseEntity {
  po_id: number;
  supplier_id: string;
  store_id: string | null;
  store: Store | null;
  supplier: Supplier | null;
  approved_by: string | null;
  exchange_rate: number | null;
  currency: string;
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
  supplier_contact_person: string | null;
  total_items: number | null;
  total_cost: number;
  shipping_charges: number;
  tax_amount: number;
  subtotal: number;
  special_instructions: string | null;
  fob_terms: string | null;
  shipping_method: string | null;
  payment_terms: string | null;
  notes: string | null;
}

// --- Component Props ---
export interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  onImportSuccess: (data: any) => void;
  isLoading: boolean;
  acceptedFileTypes?: string[];
}

export interface ProductDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  isOpen: boolean;
  onClose: () => void;
  initialProductData?: any;
  onSubmit: (productData: any) => void;
}

// --- Approval History ---
export interface POApprovalHistory {
  approved_by: string;
  approved_at: string;
  status: "pending" | "approved" | "rejected" | string;
  comments?: string;
}

// --- Utility Types ---
export type DateRangeType = DateRange | undefined;
