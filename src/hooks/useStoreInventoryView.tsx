import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreInventoryView {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  min_stock: number;
  last_restocked: string | null;
  sku: string;
  item_name: string;
  store_name: string;
  category: string;
  brand: string | null;
  unit: string;
}

export const useStoreInventoryView = (storeId?: string) => {
  return useQuery({
    queryKey: ["store-inventory-view", storeId],
    queryFn: async (): Promise<StoreInventoryView[]> => {
      let query = supabase
        .from("v_store_stock_levels")
        .select("*")
        .order("item_name");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching store inventory view:", error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        item_id: item.item_id,
        store_id: item.store_id,
        quantity: item.quantity,
        min_stock: item.min_stock,
        last_restocked: item.last_restocked,
        sku: item.sku,
        item_name: item.item_name,
        store_name: item.store_name,
        category: item.category,
        brand: item.brand,
        unit: item.unit,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Aggregated view for "All Stores" - shows items with total quantities and store breakdown
export const useAggregatedInventory = () => {
  return useQuery({
    queryKey: ["aggregated-inventory"],
    queryFn: async () => {
      // Fetch all store inventory records with item details
      const { data, error } = await supabase
        .from("v_store_stock_levels")
        .select("*")
        .order("item_name");

      if (error) {
        console.error("Error fetching aggregated inventory:", error);
        throw error;
      }

      // Group by item_id and aggregate
      const grouped = (data || []).reduce((acc: any, record: any) => {
        const itemId = record.item_id;
        
        if (!acc[itemId]) {
          acc[itemId] = {
            id: record.item_id,
            sku: record.sku,
            item_name: record.item_name,
            category: record.category,
            brand: record.brand,
            unit: record.unit,
            total_quantity: 0,
            min_stock: record.min_stock,
            stores: [],
          };
        }

        acc[itemId].total_quantity += record.quantity;
        acc[itemId].stores.push({
          store_id: record.store_id,
          store_name: record.store_name,
          quantity: record.quantity,
        });

        return acc;
      }, {});

      return Object.values(grouped);
    },
    staleTime: 2 * 60 * 1000,
  });
};
