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
      // Fetch core item fields directly (avoid joins that require DB FKs)
      const { data: items, error } = await supabase
        .from("items")
        .select("id, name, sku, quantity, price, cost, location, min_stock, created_at");
      if (error) throw error;

      // Map to a consistent shape expected by reports
      return (
        items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: Number(item.quantity || 0),
          location: item.location || '',
          min_stock: Number(item.min_stock || 0),
          cost_price: Number(item.cost || 0),
          selling_price: Number(item.price || 0),
          created_at: item.created_at,
        })) || []
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  // Inventory Valuation - calculate from items
  const inventoryValuationQuery = useQuery({
    queryKey: queryKeys.reports.inventoryValuation,
  queryFn: async () => {
    const { data: items, error } = await supabase
      .from("items")
      .select("id, name, quantity, cost, price, location");
    if (error) throw error;

    return (
      items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity || 0),
        value: Number(item.quantity || 0) * Number(item.cost || 0),
        location: item.location || '',
        category: '',
        brand: '',
      })) || []
    );
  },
    staleTime: 1000 * 60 * 5,
  });

  const lowStockQuery = useQuery({
    queryKey: queryKeys.reports.lowStock,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, name, sku, quantity, min_stock, location");
    if (error) throw error;

    const rows = data || [];
    // Only show items at or below min stock
    return rows
      .filter((item: any) => Number(item.quantity || 0) <= Number(item.min_stock || 0))
      .map((item: any) => ({
        ...item,
        category: '',
        main_group: '',
        brand: '',
      }));
  },
    staleTime: 1000 * 60 * 5,
  });

  // Inventory Aging - calculate age from created_at or last_restocked
  const inventoryAgingQuery = useQuery({
    queryKey: queryKeys.reports.inventoryAging,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, name, quantity, created_at, last_restocked, location");
    if (error) throw error;

    return (
      data?.map((item: any) => {
        const referenceDate = item.last_restocked || item.created_at;
        const ageDays = referenceDate
          ? Math.floor((Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          id: item.id,
          name: item.name,
          quantity: Number(item.quantity || 0),
          age_days: ageDays,
          location: item.location || '',
          category: '',
          brand: '',
        };
      }) || []
    );
  },
    staleTime: 1000 * 60 * 5,
  });

  // Stock Movement - from transactions (POS sales)
  const stockMovementQuery = useQuery({
    queryKey: queryKeys.reports.stockMovement,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, created_at, quantity, sku")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      return (
        data?.map((txn: any) => ({
          id: txn.id,
          name: txn.sku,
          movement_type: 'SALE',
          quantity: -Math.abs(Number(txn.quantity || 0)),
          date: txn.created_at,
          location: '',
          category: '',
          brand: '',
        })) || []
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  // ABC Analysis - based on inventory value
  const abcAnalysisQuery = useQuery({
    queryKey: queryKeys.reports.abcAnalysis,
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("items")
        .select("id, name, quantity, cost, location");
      if (error) throw error;

      const itemsWithValue =
        items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: '',
          value: Number(item.quantity || 0) * Number(item.cost || 0),
          location: item.location || '',
        })) || [];

      // Sort by value descending
      itemsWithValue.sort((a, b) => b.value - a.value);

      const totalValue = itemsWithValue.reduce((sum, item) => sum + item.value, 0) || 1;
      let cumulativeValue = 0;

      // Classify items: A = 80% value, B = 15% value, C = 5% value
      return itemsWithValue.map((item) => {
        cumulativeValue += item.value;
        const cumulativePercent = (cumulativeValue / totalValue) * 100;

        let classification: 'A' | 'B' | 'C';
        if (cumulativePercent <= 80) classification = 'A';
        else if (cumulativePercent <= 95) classification = 'B';
        else classification = 'C';

        return { ...item, classification };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  // Recent Adjustments - placeholder (physical_inventory_counts table doesn't exist yet)
  // TODO: Create physical_inventory_counts table or use alternative data source
  const recentAdjustmentsQuery = useQuery({
    queryKey: queryKeys.reports.recentAdjustments,
    queryFn: async () => {
      // Return empty array until physical_inventory_counts table is created
      return [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Stock Movement Transactions - aggregate from all sources
  const stockMovementTransactionQuery = useQuery({
    queryKey: queryKeys.reports.stockMovementTransaction,
    queryFn: async () => {
      // Fetch POS sales
      const { data: sales, error: salesError } = await supabase
        .from("transactions")
        .select("id, created_at, sku, quantity")
        .order("created_at", { ascending: false })
        .limit(500);
      if (salesError) throw salesError;

      // Fetch PO receipts (received items)
      const { data: poItems, error: poError } = await supabase
        .from("purchase_order_items")
        .select("id, created_at, item_name, received_quantity, sku")
        .gt("received_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(500);
      if (poError) throw poError;

      const transactions: any[] = [];

      sales?.forEach((sale: any) => {
        transactions.push({
          id: sale.id,
          name: sale.sku,
          transaction_type: 'SALE',
          quantity: -Math.abs(Number(sale.quantity || 0)),
          date: sale.created_at,
          location: '',
          category: '',
          brand: '',
        });
      });

      poItems?.forEach((po: any) => {
        transactions.push({
          id: po.id,
          name: po.item_name,
          transaction_type: 'PURCHASE_ORDER',
          quantity: Number(po.received_quantity || 0),
          date: po.created_at,
          location: '',
          category: '',
          brand: '',
        });
      });

      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return transactions;
    },
    staleTime: 1000 * 60 * 5,
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
      const { data, error } = await supabase.from("categories").select("name").order("name");
      if (error) throw error;

      return data?.map((row) => row.name) || [];
    },
    staleTime: 1000 * 60 * 60 * 24,
  });

  const brandsQuery = useQuery({
    queryKey: queryKeys.reports.brands,
    queryFn: async () => {
      const { data, error } = await supabase.from("main_groups").select("name").order("name");
      if (error) throw error;

      return data?.map((row) => row.name) || [];
    },
    staleTime: 1000 * 60 * 60 * 24,
  });

  // --- End of Unique Value Queries ---

  // Sales Performance - aggregate from transactions
  const salesPerformanceQuery = useQuery({
    queryKey: queryKeys.reports.salesPerformance,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, created_at, sku, quantity, price, amount,
          item:items(name, location, category:categories(name), main_group:main_groups(name))
        `)
        .eq("is_refund", false)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      return data?.map((txn: any) => ({
        id: txn.id,
        name: txn.item?.name || txn.sku,
        sales: txn.amount || 0,
        quantity: txn.quantity || 0,
        date: txn.created_at,
        location: txn.item?.location || '',
        category: txn.item?.category?.name || '',
        brand: txn.item?.main_group?.name || '',
      })) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // COGS - cost of goods sold from transactions
  const cogsQuery = useQuery({
    queryKey: queryKeys.reports.cogs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, created_at, sku, quantity, price, amount,
          item:items(name, cost, location, category:categories(name))
        `)
        .eq("is_refund", false)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      return data?.map((txn: any) => {
        const cost = (txn.item?.cost || 0) * (txn.quantity || 0);
        return {
          id: txn.id,
          name: txn.item?.name || txn.sku,
          cost_of_goods_sold: cost,
          revenue: txn.amount || 0,
          date: txn.created_at,
          location: txn.item?.location || '',
          category: txn.item?.category?.name || '',
        };
      }) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    inventoryOnHand: inventoryOnHandQuery.data || [],
    inventoryValuation: inventoryValuationQuery.data || [],
    lowStock: lowStockQuery.data || [],
    inventoryAging: inventoryAgingQuery.data || [],
    stockMovement: stockMovementQuery.data || [],
    abcAnalysis: abcAnalysisQuery.data || [],
    recentAdjustments: recentAdjustmentsQuery.data || [],
    stockMovementTransaction: stockMovementTransactionQuery.data || [],
    salesPerformance: salesPerformanceQuery.data || [],
    cogs: cogsQuery.data || [],
    stores: storesQuery.data || [],
    categories: categoriesQuery.data || [],
    brands: brandsQuery.data || [],
    isLoading:
      inventoryOnHandQuery.isLoading ||
      inventoryValuationQuery.isLoading ||
      lowStockQuery.isLoading ||
      inventoryAgingQuery.isLoading ||
      stockMovementQuery.isLoading ||
      abcAnalysisQuery.isLoading ||
      recentAdjustmentsQuery.isLoading ||
      stockMovementTransactionQuery.isLoading ||
      salesPerformanceQuery.isLoading ||
      cogsQuery.isLoading ||
      storesQuery.isLoading ||
      categoriesQuery.isLoading ||
      brandsQuery.isLoading,
    error:
      inventoryOnHandQuery.error ||
      inventoryValuationQuery.error ||
      lowStockQuery.error ||
      inventoryAgingQuery.error ||
      stockMovementQuery.error ||
      abcAnalysisQuery.error ||
      recentAdjustmentsQuery.error ||
      stockMovementTransactionQuery.error ||
      salesPerformanceQuery.error ||
      cogsQuery.error ||
      storesQuery.error ||
      categoriesQuery.error ||
      brandsQuery.error,
  };
};
