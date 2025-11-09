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

      // First, fetch all items with joined attribute names
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select(`
          *,
          supplier:suppliers(name),
          gender:genders(name),
          main_group:main_groups(name),
          category:categories(name),
          origin:origins(name),
          season:seasons(name),
          size:sizes(name),
          color:colors(name),
          theme:themes(name)
        `)
        .order("name");

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

      // Fetch received quantities from purchase orders
      const { data: receivedData, error: receivedError } = await supabase
        .from("purchase_order_items")
        .select("item_id, received_quantity");

      if (receivedError) {
        console.error("Error fetching received quantities:", receivedError);
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

      // Create a map of item_id to total received quantity
      const receivedMap = (receivedData || []).reduce((acc: any, record: any) => {
        const itemId = record.item_id;
        if (!acc[itemId]) {
          acc[itemId] = 0;
        }
        acc[itemId] += record.received_quantity || 0;
        return acc;
      }, {});

      // Combine item data with aggregated stock information and resolve attribute names
      const result = (itemsData || []).map((item: any) => ({
        ...item,
        supplier: item.supplier?.name || '',
        gender: item.gender?.name || '',
        main_group: item.main_group?.name || '',
        category: item.category?.name || '',
        origin: item.origin?.name || '',
        season: item.season?.name || '',
        size: item.size?.name || '',
        color: item.color?.name || '',
        theme: item.theme?.name || '',
        quantity: stockMap[item.id]?.total_quantity || 0,
        total_quantity: stockMap[item.id]?.total_quantity || 0,
        stores: stockMap[item.id]?.stores || [],
        received_quantity: receivedMap[item.id] || 0,
      }));

      console.log("Final aggregated inventory:", result.length, "items");
      return result;
    },
    staleTime: 2 * 60 * 1000,
  });
};
