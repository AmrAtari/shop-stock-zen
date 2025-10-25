import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/types/database";

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
      let query = supabase.from("v_store_stock_levels").select("*").order("item_name");

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching store inventory view:", error);
        throw error;
      }

      console.log(`Store inventory for ${storeId || "all stores"}:`, data?.length, "items");
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
    queryFn: async (): Promise<Item[]> => {
      console.log("Fetching aggregated inventory...");

      // First, fetch all items to get their complete data
      const { data: itemsData, error: itemsError } = await supabase.from("items").select("*").order("name");

      if (itemsError) {
        console.error("Error fetching items:", itemsError);
        throw itemsError;
      }

      // Then fetch store stock levels to aggregate quantities
      const { data: stockData, error: stockError } = await supabase.from("v_store_stock_levels").select("*");

      if (stockError) {
        console.error("Error fetching stock levels:", stockError);
        throw stockError;
      }

      console.log("Raw items data:", itemsData?.length);
      console.log("Stock data:", stockData?.length);

      // Create a map of item_id to total quantity and store breakdown
      const stockMap = (stockData || []).reduce((acc: any, record: any) => {
        const itemId = record.item_id;

        if (!acc[itemId]) {
          acc[itemId] = {
            total_quantity: 0,
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

      // Combine item data with aggregated stock information
      const result = (itemsData || []).map((item: Item) => ({
        ...item,
        quantity: stockMap[item.id]?.total_quantity || 0,
        total_quantity: stockMap[item.id]?.total_quantity || 0,
        stores: stockMap[item.id]?.stores || [],
      }));

      console.log("Final aggregated inventory:", result.length, "items");
      return result;
    },
    staleTime: 2 * 60 * 1000,
  });
};
