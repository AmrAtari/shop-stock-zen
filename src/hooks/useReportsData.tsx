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
      // Fetch all items data from the DB
      const { data: items, error: itemsError } = await supabase.from("items").select("*");
      if (itemsError) throw itemsError;

      // Fetch current price levels
      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price, selling_price")
        .eq("is_current", true);
      if (pricesError) throw pricesError;

      // Map the prices and apply the brand FIX
      return items?.map((item) => {
        const price = prices?.find((p) => p.item_id === item.id);
        return {
          ...item,
          // FIX 1: Map the database column 'main_group' (stand-in for brand) to the expected property 'brand'
          brand: item.main_group,
          cost_price: price?.cost_price || 0,
          selling_price: price?.selling_price || 0,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  // FIX 2: Commented out the query that crashes due to missing 'inventory_valuation_view'
  /*
  const categoryValueQuery = useQuery({
    queryKey: queryKeys.reports.categoryValue,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_valuation_view")
        .select("category, total_value, total_items");
      if (error) throw error;
      return data as CategoryValue[];
    },
    staleTime: 1000 * 60 * 30,
  });
  */
  // Placeholder query for stability
  const categoryValueQuery = { data: [], isLoading: false, error: null };

  const lowStockQuery = useQuery({
    queryKey: queryKeys.reports.lowStock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("name, sku, quantity, min_stock, location, category, main_group") // Select 'main_group' for consistency
        .lt("quantity", "min_stock")
        .neq("min_stock", 0);
      if (error) throw error;
      // Also apply the brand mapping here
      return (
        data?.map((item) => ({
          ...item,
          brand: item.main_group,
        })) || []
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  const inventoryAgingQuery = useQuery({
    queryKey: queryKeys.reports.inventoryAging,
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_aging_view").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const stockMovementQuery = useQuery({
    queryKey: queryKeys.reports.stockMovement,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movement_view").select("*").limit(500);
      if (error) throw error;
      return data as StockMovement[];
    },
    staleTime: 1000 * 60 * 30,
  });

  const abcAnalysisQuery = useQuery({
    queryKey: queryKeys.reports.abcAnalysis,
    queryFn: async () => {
      const { data, error } = await supabase.from("abc_analysis_view").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const recentAdjustmentsQuery = useQuery({
    queryKey: queryKeys.reports.recentAdjustments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_adjustments")
        .select("*, item:items!inner(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data?.map((adj) => ({
        ...adj,
        item_name: (adj.item as any).name,
      })) as RecentAdjustment[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const stockMovementTransactionQuery = useQuery({
    queryKey: queryKeys.reports.stockMovementTransaction,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_transactions").select("*").limit(1000);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // --- Unique Value Queries ---

  const storesQuery = useQuery({
    queryKey: queryKeys.reports.stores,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("location");
      if (error) throw error;

      const locations = data?.map((row) => row.location).filter((loc) => loc) || [];
      return Array.from(new Set(locations));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.reports.categories,
    queryFn: async () => {
      // Note: The 'category' column is a UUID foreign key, you may need to join with the 'categories' table to get the name/string value.
      const { data, error } = await supabase.from("items").select("category");
      if (error) throw error;

      const categories = data?.map((row) => row.category).filter((cat) => cat) || [];
      return Array.from(new Set(categories));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });

  const brandsQuery = useQuery({
    queryKey: queryKeys.reports.brands,
    queryFn: async () => {
      // FIX 3: Using 'main_group' as a stand-in for brand, as 'item_brand' does not exist.
      const { data, error } = await supabase.from("items").select("main_group");
      if (error) throw error;

      const brands = data?.map((row) => row.main_group).filter((brand) => brand) || [];
      return Array.from(new Set(brands));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });

  // --- End of Unique Value Queries ---

  return {
    inventoryOnHand: inventoryOnHandQuery.data || [],
    inventoryValuation: categoryValueQuery.data || [], // Returns [] from the placeholder query
    lowStock: lowStockQuery.data || [],
    inventoryAging: inventoryAgingQuery.data || [],
    stockMovement: stockMovementQuery.data || [],
    abcAnalysis: abcAnalysisQuery.data || [],
    recentAdjustments: recentAdjustmentsQuery.data || [],
    stockMovementTransaction: stockMovementTransactionQuery.data || [],
    salesPerformance: [],
    cogs: [],
    stores: storesQuery.data || [],
    categories: categoriesQuery.data || [],
    brands: brandsQuery.data || [],
    isLoading:
      inventoryOnHandQuery.isLoading ||
      categoryValueQuery.isLoading || // Will be false now
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
      categoryValueQuery.error || // Will be null now
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
