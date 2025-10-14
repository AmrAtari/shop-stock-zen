import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const categoryValueQuery = useQuery({
    queryKey: ["reports", "categoryValue"],
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase.from("items").select("category, quantity, id");

      if (itemsError) throw itemsError;

      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, selling_price")
        .eq("is_current", true);

      if (pricesError) throw pricesError;

      // Group by category
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const stockMovementQuery = useQuery({
    queryKey: ["reports", "stockMovement"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("created_at, adjustment, item_id, items(name)")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data.map((adj) => ({
        date: new Date(adj.created_at).toLocaleDateString(),
        item_name: (adj.items as any)?.name || "Unknown",
        adjustment: adj.adjustment,
      })) as StockMovement[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const profitMarginsQuery = useQuery({
    queryKey: ["reports", "profitMargins"],
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase.from("items").select("id, name");

      if (itemsError) throw itemsError;

      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price, selling_price")
        .eq("is_current", true)
        .gt("selling_price", 0);

      if (pricesError) throw pricesError;

      const margins = items
        ?.map((item) => {
          const price = prices?.find((p) => p.item_id === item.id);
          if (!price) return null;

          const profit = price.selling_price - price.cost_price;
          const margin = (profit / price.selling_price) * 100;

          return {
            name: item.name,
            cost_price: price.cost_price,
            selling_price: price.selling_price,
            profit,
            margin,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b?.margin || 0) - (a?.margin || 0));

      return margins as ProfitMargin[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const recentAdjustmentsQuery = useQuery({
    queryKey: ["reports", "recentAdjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("created_at, previous_quantity, new_quantity, adjustment, reason, item_id, items(name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return data.map((adj) => ({
        created_at: new Date(adj.created_at).toLocaleDateString(),
        item_name: (adj.items as any)?.name || "Unknown",
        previous_quantity: adj.previous_quantity,
        new_quantity: adj.new_quantity,
        adjustment: adj.adjustment,
        reason: adj.reason,
      })) as RecentAdjustment[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    categoryValue: categoryValueQuery.data || [],
    stockMovement: stockMovementQuery.data || [],
    profitMargins: profitMarginsQuery.data || [],
    recentAdjustments: recentAdjustmentsQuery.data || [],
    isLoading:
      categoryValueQuery.isLoading ||
      stockMovementQuery.isLoading ||
      profitMarginsQuery.isLoading ||
      recentAdjustmentsQuery.isLoading,
    error:
      categoryValueQuery.error || stockMovementQuery.error || profitMarginsQuery.error || recentAdjustmentsQuery.error,
  };
};
