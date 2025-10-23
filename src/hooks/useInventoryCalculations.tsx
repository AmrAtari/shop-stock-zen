import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export interface RealTimeStock {
  item_id: string;
  location_id: string | null;
  current_stock: number;
  item_name?: string;
  location_name?: string;
  sku?: string;
}

export const useInventoryCalculations = () => {
  const { data: stockLevels, isLoading: stockLoading, error } = useQuery({
    queryKey: queryKeys.inventory.stockLevels,
    queryFn: async (): Promise<RealTimeStock[]> => {
      // Call our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('calculate-stock');
      
      if (error) {
        console.error('Error fetching stock levels:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate stock levels');
      }

      // We'll enrich this data with item and location names in the next step
      return data.data || [];
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  return {
    stockLevels: stockLevels || [],
    isLoading: stockLoading,
    error
  };
};
