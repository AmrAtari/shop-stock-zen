import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export const usePurchaseOrderDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: async () => {
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (poError) throw poError;
      if (!po) throw new Error("Purchase order not found");

      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", id)
        .order("created_at");

      if (itemsError) throw itemsError;

      return { po, items: items || [] };
    },
    enabled: !!id,
  });
};
