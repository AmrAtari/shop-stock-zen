import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AlertItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  location: string | null;
  supplier: string | null;
  quantity: number;
  unit: string;
  minStock: number;
}

interface RestockRecommendation {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  minStock: number;
  costPrice: number;
  recommendedOrder: number;
  estimatedCost: number;
}

export const useAlertsData = () => {
  // Fetch out of stock items
  const { data: outOfStock, isLoading: outOfStockLoading } = useQuery({
    queryKey: ["alerts-out-of-stock"],
    queryFn: async (): Promise<AlertItem[]> => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          id, name, sku, quantity, unit, min_stock, location,
          category:categories(name),
          supplier:suppliers(name)
        `)
        .eq("quantity", 0);

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category?.name || '',
        location: item.location,
        supplier: item.supplier?.name || '',
        quantity: item.quantity,
        unit: item.unit,
        minStock: item.min_stock,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch low stock items (quantity > 0 but <= min_stock)
  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ["alerts-low-stock"],
    queryFn: async (): Promise<AlertItem[]> => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          id, name, sku, quantity, unit, min_stock, location,
          category:categories(name),
          supplier:suppliers(name)
        `)
        .gt("quantity", 0);

      if (error) throw error;

      return data
        .filter((item: any) => item.quantity <= item.min_stock)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category?.name || '',
          location: item.location,
          supplier: item.supplier?.name || '',
          quantity: item.quantity,
          unit: item.unit,
          minStock: item.min_stock,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch restock recommendations
  const { data: restockRecommendations, isLoading: restockLoading } = useQuery({
    queryKey: ["alerts-restock-recommendations"],
    queryFn: async (): Promise<RestockRecommendation[]> => {
      // Get items that need restocking
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, name, sku, quantity, unit, min_stock")
        .order("quantity", { ascending: true });

      if (itemsError) throw itemsError;

      // Filter items that need restocking
      const needsRestock = items.filter(item => item.quantity <= item.min_stock);

      // Get current price levels
      const { data: priceLevels, error: priceError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price")
        .eq("is_current", true);

      if (priceError) throw priceError;

      const priceMap = new Map(priceLevels.map(pl => [pl.item_id, pl.cost_price]));

      return needsRestock.map(item => {
        const costPrice = priceMap.get(item.id) || 0;
        const recommendedOrder = Math.max(item.min_stock * 2 - item.quantity, 0);
        const estimatedCost = recommendedOrder * costPrice;

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          minStock: item.min_stock,
          costPrice,
          recommendedOrder,
          estimatedCost,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    outOfStock: outOfStock || [],
    lowStock: lowStock || [],
    restockRecommendations: restockRecommendations || [],
    isLoading: outOfStockLoading || lowStockLoading || restockLoading,
  };
};
