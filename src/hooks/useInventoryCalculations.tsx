import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export interface RealTimeStock {
  item_id: string;
  location_id: string | null;
  current_stock: number;
  item_name: string;
  location_name: string;
  sku: string;
}

export const useInventoryCalculations = () => {
  const {
    data: stockLevels,
    isLoading: stockLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.inventory.stockLevels,
    queryFn: async (): Promise<RealTimeStock[]> => {
      console.log("Fetching real-time stock levels...");

      // Call our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("calculate-stock-levels");

      if (error) {
        console.error("Error calling stock calculation function:", error);
        throw new Error(`Failed to fetch stock levels: ${error.message}`);
      }

      if (!data.success) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error || "Failed to calculate stock levels");
      }

      console.log(`Received ${data.data.length} stock level records`);
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2, // Retry failed requests twice
  });

  return {
    stockLevels: stockLevels || [],
    isLoading: stockLoading,
    error,
    refetch,
  };
};
