import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

interface DashboardMetrics {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  totalProducts: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  minStock: number;
}

interface StockMovementTrend {
  date: string;
  adjustments: number;
}

interface ABCDistribution {
  name: string;
  value: number;
}

export const useDashboardData = () => {
  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: async (): Promise<DashboardMetrics> => {
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, quantity, min_stock");

      if (itemsError) throw itemsError;

      const { data: priceLevels, error: priceError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price")
        .eq("is_current", true);

      if (priceError) throw priceError;

      const priceMap = new Map(priceLevels.map(pl => [pl.item_id, pl.cost_price]));

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = items.reduce((sum, item) => {
        const costPrice = priceMap.get(item.id) || 0;
        return sum + (item.quantity * costPrice);
      }, 0);
      const lowStockCount = items.filter(item => item.quantity <= item.min_stock).length;
      const totalProducts = items.length;

      return { totalItems, totalValue, lowStockCount, totalProducts };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch category distribution for charts
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: queryKeys.dashboard.categoryDistribution,
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("category, quantity");

      if (itemsError) throw itemsError;

      const { data: priceLevels, error: priceError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price")
        .eq("is_current", true);

      if (priceError) throw priceError;

      const { data: allItems, error: allItemsError } = await supabase
        .from("items")
        .select("id, category, quantity");

      if (allItemsError) throw allItemsError;

      const priceMap = new Map(priceLevels.map(pl => [pl.item_id, pl.cost_price]));

      // Group by category for quantity
      const quantityByCategory = allItems.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = 0;
        }
        acc[item.category] += item.quantity;
        return acc;
      }, {} as Record<string, number>);

      const categoryQuantity: CategoryDistribution[] = Object.entries(quantityByCategory).map(
        ([name, value]) => ({ name, value })
      );

      // Group by category for value
      const valueByCategory = allItems.reduce((acc, item) => {
        const costPrice = priceMap.get(item.id) || 0;
        if (!acc[item.category]) {
          acc[item.category] = 0;
        }
        acc[item.category] += item.quantity * costPrice;
        return acc;
      }, {} as Record<string, number>);

      const categoryValue: CategoryDistribution[] = Object.entries(valueByCategory).map(
        ([name, value]) => ({ name, value: Math.round(value) })
      );

      return { categoryQuantity, categoryValue };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch low stock items
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: queryKeys.dashboard.lowStock,
    queryFn: async (): Promise<LowStockItem[]> => {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, sku, quantity, unit, min_stock")
        .order("quantity", { ascending: true });

      if (error) throw error;

      return data
        .filter(item => item.quantity <= item.min_stock)
        .map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          minStock: item.min_stock,
        }));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch stock movement trends (last 30 days)
  const { data: stockMovementTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-stock-trends'],
    queryFn: async (): Promise<StockMovementTrend[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("created_at, adjustment")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const trendMap: Record<string, number> = {};
      data.forEach(adj => {
        const date = new Date(adj.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        trendMap[date] = (trendMap[date] || 0) + Math.abs(adj.adjustment);
      });

      return Object.entries(trendMap).map(([date, adjustments]) => ({
        date,
        adjustments,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch ABC analysis distribution
  const { data: abcDistribution, isLoading: abcLoading } = useQuery({
    queryKey: ['dashboard-abc-distribution'],
    queryFn: async (): Promise<ABCDistribution[]> => {
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, quantity");

      if (itemsError) throw itemsError;

      const { data: priceLevels, error: priceError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price")
        .eq("is_current", true);

      if (priceError) throw priceError;

      const priceMap = new Map(priceLevels.map(pl => [pl.item_id, pl.cost_price]));

      // Calculate value for each item
      const itemValues = items.map(item => ({
        value: item.quantity * (priceMap.get(item.id) || 0),
      })).sort((a, b) => b.value - a.value);

      const totalValue = itemValues.reduce((sum, item) => sum + item.value, 0);
      let cumulativeValue = 0;
      let aCount = 0, bCount = 0, cCount = 0;

      itemValues.forEach(item => {
        cumulativeValue += item.value;
        const percentage = (cumulativeValue / totalValue) * 100;
        
        if (percentage <= 80) {
          aCount++;
        } else if (percentage <= 95) {
          bCount++;
        } else {
          cCount++;
        }
      });

      return [
        { name: 'A Items', value: aCount },
        { name: 'B Items', value: bCount },
        { name: 'C Items', value: cCount },
      ];
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    metrics: metrics || { totalItems: 0, totalValue: 0, lowStockCount: 0, totalProducts: 0 },
    categoryQuantity: categoryData?.categoryQuantity || [],
    categoryValue: categoryData?.categoryValue || [],
    lowStockItems: lowStockItems || [],
    stockMovementTrends: stockMovementTrends || [],
    abcDistribution: abcDistribution || [],
    isLoading: metricsLoading || categoryLoading || lowStockLoading || trendsLoading || abcLoading,
  };
};
