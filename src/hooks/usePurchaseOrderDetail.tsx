import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { PurchaseOrder } from "@/types"; // Import the PO type

// Define a type for purchase order items if not already defined (assuming minimal structure)
interface PurchaseOrderItem {
  id: string;
  po_id: number; // Linked to po_id (integer PK) on the PO table
  description: string;
  quantity: number;
  unit_cost: number;
  // ... other item fields
}

/**
 * Custom hook to fetch a single purchase order and its associated items.
 * The ID passed is the 'id' (bigint) from the URL, used to fetch the parent PO record.
 * Items are then fetched using the PO's primary key, 'po_id'.
 */
export const usePurchaseOrderDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: async () => {
      // 1. Fetch the Purchase Order record using the URL 'id' (bigint)
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id) // Filters by the 'id' (bigint) column
        .maybeSingle();

      if (poError) throw poError;
      if (!po) throw new Error("Purchase order not found");

      // We need to use the PO's primary key (po_id) to link items.
      const poPrimaryId = (po as PurchaseOrder).po_id;

      // 2. Fetch the Purchase Order Items using the po_id (integer PK)
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*, po_id") // Ensure po_id is selected if needed, but the important part is the filter
        .eq("po_id", poPrimaryId) // FIX: Use the fetched PO's internal po_id (integer) for the item foreign key
        .order("created_at", { ascending: true }); // Ensure ascending is set for order

      if (itemsError) throw itemsError;

      // Return the PO object along with its items list
      return { po: po as PurchaseOrder, items: (items as PurchaseOrderItem[]) || [] };
    },
    enabled: !!id,
  });
};
