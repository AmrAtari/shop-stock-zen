import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
// Import the complete types defined in src/types/index.ts
import { PurchaseOrder, PurchaseOrderItem } from "@/types"; 

/**
 * Custom hook to fetch a single purchase order and its associated items.
 * The ID passed is the 'id' (bigint) from the URL.
 * Items are then fetched using the PO's primary key, 'po_id', which resolves
 * the issue of missing items for older or manually created POs.
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

      if (poError) throw poError;
      if (!po) throw new Error("Purchase order not found");

      // Cast the result to the full PurchaseOrder type to access po_id
      const purchaseOrder = po as PurchaseOrder;

      // 2. Fetch the Purchase Order Items using the PO's internal po_id (integer PK)
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*") 
        // FIX: Use the fetched PO's internal po_id (integer) for the item foreign key
        .eq("po_id", purchaseOrder.po_id) 
        .order("created_at", { ascending: true }); 

      if (itemsError) throw itemsError;

      // Return the PO object along with its items list
      return { 
        po: purchaseOrder, 
        items: (items as PurchaseOrderItem[]) || [] 
      };
    },
    enabled: !!id,
  });
};
```eof

### Why This Fix Works

The problem was that the code was using the URL parameter `id` (a `bigint` field) for both queries:

* **PO Fetch:** `eq("id", id)` (Correct)
* **Item Fetch:** `eq("po_id", id)` (Incorrect)

By fetching the parent PO first, extracting its internal primary key **`po_id`**, and then using **`eq("po_id", purchaseOrder.po_id)`** to fetch the items, we ensure the correct foreign key relationship is utilized, which should solve the item visibility problem for all your Purchase Orders.