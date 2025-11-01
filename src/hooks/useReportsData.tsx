import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

interface CategoryValue {
  category: string;
  total_value: number;
  total_items: number;
}

interface StockMovement {
  date: string;
  item_name: string;
  adjustment: number;
}

interface ProfitMargin {
  name: string;
  cost_price: number;
  selling_price: number;
  profit: number;
  margin: number;
}

interface RecentAdjustment {
  created_at: string;
  item_name: string;
  previous_quantity: number;
  new_quantity: number;
  adjustment: number;
  reason: string;
}

export const useReportsData = () => {
  const inventoryOnHandQuery = useQuery({
    queryKey: queryKeys.reports.inventoryOnHand,
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase.from("items").select("*");
      if (itemsError) throw itemsError;

      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price, selling_price")
        .eq("is_current", true);
      if (pricesError) throw pricesError;

      return items?.map((item) => {
        const price = prices?.find((p) => p.item_id === item.id);
        return {
          ...item,
          cost_price: price?.cost_price || 0,
          selling_price: price?.selling_price || 0,
          value: item.quantity * (price?.selling_price || 0),
        };
      }) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const categoryValueQuery = useQuery({
    queryKey: queryKeys.reports.categoryValue,
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase.from("items").select("category, quantity, id");

      if (itemsError) throw itemsError;

      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, selling_price")
        .eq("is_current", true);

      if (pricesError) throw pricesError;

      const categoryMap = new Map<string, { total_value: number; total_items: number }>();

      items?.forEach((item) => {
        const price = prices?.find((p) => p.item_id === item.id);
        const sellingPrice = price?.selling_price || 0;
        const value = item.quantity * sellingPrice;

        const existing = categoryMap.get(item.category) || { total_value: 0, total_items: 0 };
        categoryMap.set(item.category, {
          total_value: existing.total_value + value,
          total_items: existing.total_items + item.quantity,
        });
      });

      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        total_value: Math.round(data.total_value),
        total_items: data.total_items,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  const lowStockQuery = useQuery({
    queryKey: queryKeys.reports.lowStock,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*");
      
      if (error) throw error;
      return data?.filter((item) => item.quantity <= item.min_stock) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const inventoryAgingQuery = useQuery({
    queryKey: queryKeys.reports.inventoryAging,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("name, sku, quantity, last_restocked, category")
        .order("last_restocked", { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      return data?.map((item) => ({
        ...item,
        days_in_stock: item.last_restocked 
          ? Math.floor((Date.now() - new Date(item.last_restocked).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const stockMovementQuery = useQuery({
    queryKey: queryKeys.reports.stockMovement,
    queryFn: async () => {
      // stock_adjustments table doesn't exist - returning empty array
      return [] as StockMovement[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const abcAnalysisQuery = useQuery({
    queryKey: queryKeys.reports.abcAnalysis,
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase.from("items").select("id, name, quantity, sku");
      if (itemsError) throw itemsError;

      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, selling_price")
        .eq("is_current", true);
      if (pricesError) throw pricesError;

      const itemsWithValue = items?.map((item) => {
        const price = prices?.find((p) => p.item_id === item.id);
        return {
          ...item,
          value: item.quantity * (price?.selling_price || 0),
        };
      }).sort((a, b) => b.value - a.value) || [];

      const totalValue = itemsWithValue.reduce((sum, item) => sum + item.value, 0);
      let cumulative = 0;

      return itemsWithValue.map((item) => {
        cumulative += item.value;
        const cumulativePercent = (cumulative / totalValue) * 100;
        let classification = 'C';
        if (cumulativePercent <= 80) classification = 'A';
        else if (cumulativePercent <= 95) classification = 'B';
        
        return { ...item, classification };
      });
    },
    staleTime: 2 * 60 * 1000,
  });

  const recentAdjustmentsQuery = useQuery({
    queryKey: queryKeys.reports.recentAdjustments,
    queryFn: async () => {
      // stock_adjustments table doesn't exist - returning empty array
      return [] as RecentAdjustment[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const storesQuery = useQuery({
    queryKey: queryKeys.reports.stores,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("location");
      if (error) throw error;
      return Array.from(new Set(data?.map((item) => item.location).filter(Boolean) || []));
    },
    staleTime: 2 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.reports.categories,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("category");
      if (error) throw error;
      return Array.from(new Set(data?.map((item) => item.category).filter(Boolean) || []));
    },
    staleTime: 2 * 60 * 1000,
  });

  const brandsQuery = useQuery({
    queryKey: queryKeys.reports.brands,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("brand");
      if (error) throw error;
      return Array.from(new Set(data?.map((item) => item.brand).filter(Boolean) || []));
    },
    staleTime: 2 * 60 * 1000,
  });

  const stockMovementTransactionQuery = useQuery({
    queryKey: queryKeys.reports.stockMovementTransaction,
    queryFn: async () => {
      // stock_adjustments table doesn't exist - returning empty array
      return [];
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    inventoryOnHand: inventoryOnHandQuery.data || [],
    inventoryValuation: categoryValueQuery.data || [],
    lowStock: lowStockQuery.data || [],
    inventoryAging: inventoryAgingQuery.data || [],
    stockMovement: stockMovementQuery.data || [],
    abcAnalysis: abcAnalysisQuery.data || [],
    recentAdjustments: recentAdjustmentsQuery.data || [],
    stockMovementTransaction: stockMovementTransactionQuery.data || [],
    salesPerformance: [], // Placeholder - requires sales tracking
    cogs: [], // Placeholder - requires sales tracking
    stores: storesQuery.data || [],
    categories: categoriesQuery.data || [],
    brands: brandsQuery.data || [],
    isLoading:
      inventoryOnHandQuery.isLoading ||
      categoryValueQuery.isLoading ||
      lowStockQuery.isLoading ||
      inventoryAgingQuery.isLoading ||
      stockMovementQuery.isLoading ||
      abcAnalysisQuery.isLoading ||
      recentAdjustmentsQuery.isLoading ||
      stockMovementTransactionQuery.isLoading ||
      storesQuery.isLoading ||
      categoriesQuery.isLoading ||
      brandsQuery.isLoading,
    error:
      inventoryOnHandQuery.error ||
      categoryValueQuery.error ||
      lowStockQuery.error ||
      inventoryAgingQuery.error ||
      stockMovementQuery.error ||
      abcAnalysisQuery.error ||
      recentAdjustmentsQuery.error ||
      stockMovementTransactionQuery.error ||
      storesQuery.error ||
      categoriesQuery.error ||
      brandsQuery.error,
  };
};
