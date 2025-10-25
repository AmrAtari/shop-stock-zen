import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { RealTimeStock } from "@/types/inventory";

export const useInventoryCalculations = (storeId?: string) => {
  const {
    data: stockLevels,
    isLoading: stockLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inventory", "stock-levels", storeId],
    queryFn: async (): Promise<RealTimeStock[]> => {
      console.log("Fetching store inventory levels...");

      try {
        // Query store_inventory table directly
        let query = supabase
          .from("store_inventory")
          .select(`
            id,
            item_id,
            store_id,
            quantity,
            items!inner(sku, name),
            stores!inner(name)
          `);

        if (storeId) {
          query = query.eq("store_id", storeId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching store inventory:", error);
          throw error;
        }

        const stockLevels: RealTimeStock[] = (data || []).map((item: any) => ({
          item_id: item.item_id,
          location_id: item.store_id,
          current_stock: item.quantity,
          item_name: item.items.name,
          location_name: item.stores.name,
          sku: item.items.sku,
        }));

        console.log(`Received ${stockLevels.length} stock level records`);
        return stockLevels;
      } catch (err) {
        console.error("Error in useInventoryCalculations:", err);
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  return {
    stockLevels: stockLevels || [],
    isLoading: stockLoading,
    error,
    refetch,
  };
};
