import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
// Import the complete types defined in src/types/index.ts
import { PurchaseOrder, PurchaseOrderItem } from "@/types";

/**
 * Custom hook to fetch a single purchase order and its associated items.
 * @param id The ID (bigint) from the URL used for routing.
 */
export const usePurchaseOrderDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: async () => {
      // 1. Fetch the Purchase Order record using the URL 'id' (bigint)
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id) // Filters by the 'id' (bigint) column from the URL
        .maybeSingle();

      if (poError) {
        console.error("Error fetching PO (by external ID):", poError);
        throw poError;
      }
      if (!po) {
        throw new Error("Purchase order not found");
      }

      // Cast the result to the full PurchaseOrder type to access po_id
      const purchaseOrder = po as PurchaseOrder;

      // 2. Fetch the Purchase Order Items using the PO's internal po_id (integer PK)
      // FIX: This step resolves the issue where items were missing for some POs
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", purchaseOrder.po_id) // Filters by the PO's internal primary key
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Error fetching PO items:", itemsError);
        throw itemsError;
      }

      // Return the PO object along with its items list
      return {
        po: purchaseOrder,
        items: (items as PurchaseOrderItem[]) || [],
      };
    },
    enabled: !!id,
  });
};
