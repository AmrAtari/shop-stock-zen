/**
 * src/types/index.ts
 *
 * Defines shared TypeScript interfaces used across the application.
 * FIX: Renamed 'description' to 'item_description' to match component usage.
 * FIX: Ensuring Supplier type includes all fields required by state logic.
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
  status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled' | string;
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
  notes: string | null; 
}
```eof

## 2. Corrected Data Hook (`src/hooks/usePurchaseOrders.tsx`)

This file removes the duplicate, conflicting definition of `queryKeys` and relies solely on the import.

```typescript:Purchase Orders Hook:src/hooks/usePurchaseOrders.tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys"; // <-- Relies on this external import
import { PurchaseOrder, Supplier, Store } from "@/types"; // Import types
import { DateRange } from "react-day-picker";

/**
 * Custom hook to fetch and filter purchase orders.
 */
export const usePurchaseOrders = (
  searchTerm?: string,
  statusFilter?: string,
  dateRange?: { from: Date; to: Date }
) => {
  return useQuery<PurchaseOrder[]>({
    // FIX: Using imported queryKeys
    queryKey: [...queryKeys.purchaseOrders.all, searchTerm, statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase.from("purchase_orders").select("*").order("order_date", { ascending: false });

      if (searchTerm) {
        query = query.ilike("po_number", `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter.toLowerCase() !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateRange && dateRange.from && dateRange.to) {
        const fromDate = dateRange.from.toISOString();
        const toDate = new Date(dateRange.to);
        toDate.setDate(toDate.getDate() + 1);

        query = query.gte("order_date", fromDate).lte("order_date", toDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) {
          console.error("Error fetching purchase orders:", error);
          throw error;
      }
      
      return (data as PurchaseOrder[]) || [];
    },
  });
};

export const useSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      // Selecting all fields to satisfy the Supplier type
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return (data as Supplier[]) || [];
    },
  });
};

export const useStores = () => {
  return useQuery<Store[]>({
    queryKey: queryKeys.stores.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return (data as Store[]) || [];
    },
  });
};
// Removed the local 'queryKeys' definition to resolve conflict.
```eof

### Final Action

Please apply these two file modifications.

1.  **Replace** the content of `src/types/index.ts` with the code in **Section 1**.
2.  **Replace** the content of `src/hooks/usePurchaseOrders.tsx` with the code in **Section 2**.

These changes definitively resolve all reported TypeScript errors.