import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
// Ensure these types are correctly defined in your src/types/index.ts file
import { PurchaseOrder, PurchaseOrderItem } from "@/types";

/**
 * Custom hook to fetch a single purchase order and its associated items.
 * @param id The ID (bigint) from the URL used for routing.
 * * FIX: This hook resolves the missing items bug by first fetching the PO's internal
 * primary key (po_id) and then using that key to query the items, with a fallback.
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

      // 2. Fetch the Purchase Order Items with resolved color and size names
      const { data: rawItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Error fetching PO items:", itemsError);
        throw itemsError;
      }

      // Resolve color and size UUIDs to names
      const items = await Promise.all(
        (rawItems || []).map(async (item) => {
          let colorName = item.color;
          let sizeName = item.size;

          // Check if color is a UUID and resolve it
          if (item.color && item.color.length === 36 && item.color.includes('-')) {
            const { data: colorData } = await supabase
              .from("colors")
              .select("name")
              .eq("id", item.color)
              .maybeSingle();
            if (colorData) colorName = colorData.name;
          }

          // Check if size is a UUID and resolve it
          if (item.size && item.size.length === 36 && item.size.includes('-')) {
            const { data: sizeData } = await supabase
              .from("sizes")
              .select("name")
              .eq("id", item.size)
              .maybeSingle();
            if (sizeData) sizeName = sizeData.name;
          }

          return {
            ...item,
            color: colorName,
            size: sizeName,
          };
        })
      );

      // Return the PO object along with its items list
      return {
        po: purchaseOrder,
        items: (items as PurchaseOrderItem[]) || [],
      };
    },
    enabled: !!id,
  });
};
