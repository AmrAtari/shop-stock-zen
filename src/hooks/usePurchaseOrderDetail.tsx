import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { PurchaseOrder, PurchaseOrderItem } from "@/types"; // Import new types

/**
 * Custom hook to fetch a single purchase order and its associated items.
 * The ID passed is the 'id' (bigint) from the URL, used to fetch the parent PO record.
 * Items are then fetched using the PO's primary key, 'po_id', resolving the missing items issue.
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
        .select("*") // Select all columns defined in PurchaseOrderItem
        .eq("po_id", poPrimaryId) // FIX: Use the fetched PO's internal po_id (integer) for the item foreign key
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      // Return the PO object along with its items list
      return { po: po as PurchaseOrder, items: (items as PurchaseOrderItem[]) || [] };
    },
    enabled: !!id,
  });
};
