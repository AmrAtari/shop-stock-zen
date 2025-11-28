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
        .select("id, quantity, min_stock, cost");

      if (itemsError) throw itemsError;

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = items.reduce((sum, item) => {
        return sum + (item.quantity * (item.cost || 0));
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
      const { data: allItems, error: allItemsError } = await supabase
        .from("items")
        .select(`
          id, quantity, cost,
          category:categories(name)
        `);

      if (allItemsError) throw allItemsError;

      // Group by category for quantity
      const quantityByCategory = (allItems || []).reduce((acc: any, item: any) => {
        const categoryName = item.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName] += item.quantity;
        return acc;
      }, {} as Record<string, number>);

      const categoryQuantity: CategoryDistribution[] = Object.entries(quantityByCategory).map(
        ([name, value]) => ({ name, value: value as number })
      );

      // Group by category for value
      const valueByCategory = (allItems || []).reduce((acc: any, item: any) => {
        const categoryName = item.category?.name || 'Uncategorized';
        const costPrice = item.cost || 0;
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName] += item.quantity * costPrice;
        return acc;
      }, {} as Record<string, number>);

      const categoryValue: CategoryDistribution[] = Object.entries(valueByCategory).map(
        ([name, value]) => ({ name, value: Math.round(value as number) })
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
      // stock_adjustments table doesn't exist - returning empty array
      return [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch ABC analysis distribution
  const { data: abcDistribution, isLoading: abcLoading } = useQuery({
    queryKey: ['dashboard-abc-distribution'],
    queryFn: async (): Promise<ABCDistribution[]> => {
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, quantity, cost");

      if (itemsError) throw itemsError;

      // Calculate value for each item
      const itemValues = items.map(item => ({
        value: item.quantity * (item.cost || 0),
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
