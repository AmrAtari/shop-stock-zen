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
      // Fetch all items with joined attribute names
      const { data: items, error: itemsError } = await supabase
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
        `);
      if (itemsError) throw itemsError;

      // Fetch current price levels
      const { data: prices, error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, cost_price, selling_price")
        .filter("is_current", "eq", true);
      if (pricesError) throw pricesError;

      // Map the prices and resolve attribute names
      return items?.map((item: any) => {
        const price = prices?.find((p) => p.item_id === item.id);
        return {
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
          brand: item.main_group?.name || '',
          cost_price: price?.cost_price || 0,
          selling_price: price?.selling_price || 0,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  // Inventory Valuation - calculate from items
  const inventoryValuationQuery = useQuery({
    queryKey: queryKeys.reports.inventoryValuation,
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("items")
        .select(`
          id, name, quantity, cost, category:categories(name), 
          main_group:main_groups(name), location
        `);
      if (error) throw error;

      return items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity || 0,
        value: (item.quantity || 0) * (item.cost || 0),
        location: item.location || '',
        category: item.category?.name || '',
        brand: item.main_group?.name || '',
      })) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const lowStockQuery = useQuery({
    queryKey: queryKeys.reports.lowStock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          name, sku, quantity, min_stock, location,
          category:categories(name),
          main_group:main_groups(name)
        `);
      if (error) throw error;

      // Resolve attribute names
      return (
        data?.map((item: any) => ({
          ...item,
          category: item.category?.name || '',
          main_group: item.main_group?.name || '',
          brand: item.main_group?.name || '',
        })) || []
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  // Inventory Aging - calculate age from created_at or last_restocked
  const inventoryAgingQuery = useQuery({
    queryKey: queryKeys.reports.inventoryAging,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          id, name, quantity, created_at, last_restocked, location,
          category:categories(name), main_group:main_groups(name)
        `);
      if (error) throw error;

      return data?.map((item: any) => {
        const referenceDate = item.last_restocked || item.created_at;
        const ageDays = referenceDate 
          ? Math.floor((Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity || 0,
          age_days: ageDays,
          location: item.location || '',
          category: item.category?.name || '',
          brand: item.main_group?.name || '',
        };
      }) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Stock Movement - from transactions (POS sales)
  const stockMovementQuery = useQuery({
    queryKey: queryKeys.reports.stockMovement,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, created_at, quantity, sku,
          item:items(name, category:categories(name), main_group:main_groups(name), location)
        `)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      return data?.map((txn: any) => ({
        id: txn.id,
        name: txn.item?.name || txn.sku,
        movement_type: 'SALE',
        quantity: -Math.abs(txn.quantity), // negative for sales
        date: txn.created_at,
        location: txn.item?.location || '',
        category: txn.item?.category?.name || '',
        brand: txn.item?.main_group?.name || '',
      })) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // ABC Analysis - based on inventory value
  const abcAnalysisQuery = useQuery({
    queryKey: queryKeys.reports.abcAnalysis,
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("items")
        .select(`
          id, name, quantity, cost, location,
          category:categories(name)
        `);
      if (error) throw error;

      const itemsWithValue = items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category?.name || '',
        value: (item.quantity || 0) * (item.cost || 0),
        location: item.location || '',
      })) || [];

      // Sort by value descending
      itemsWithValue.sort((a, b) => b.value - a.value);
      
      const totalValue = itemsWithValue.reduce((sum, item) => sum + item.value, 0);
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

  // Recent Adjustments - from physical inventory counts
  const recentAdjustmentsQuery = useQuery({
    queryKey: queryKeys.reports.recentAdjustments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("physical_inventory_counts")
        .select(`
          id, created_at, item_name, system_quantity, counted_quantity, 
          notes, status
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      return data?.map((count: any) => ({
        id: count.id,
        created_at: count.created_at,
        item_name: count.item_name,
        previous_quantity: count.system_quantity,
        new_quantity: count.counted_quantity,
        adjustment: count.counted_quantity - count.system_quantity,
        reason: count.notes || 'Physical inventory count',
      })) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Stock Movement Transactions - aggregate from all sources
  const stockMovementTransactionQuery = useQuery({
    queryKey: queryKeys.reports.stockMovementTransaction,
    queryFn: async () => {
      // Fetch from transactions (POS sales)
      const { data: sales, error: salesError } = await supabase
        .from("transactions")
        .select("id, created_at, sku, quantity, item:items(name, location, category:categories(name), main_group:main_groups(name))")
        .order("created_at", { ascending: false })
        .limit(500);
      if (salesError) throw salesError;

      // Fetch from purchase orders (received items)
      const { data: poItems, error: poError } = await supabase
        .from("purchase_order_items")
        .select(`
          id, created_at, item_name, received_quantity, sku,
          po:purchase_orders(store:stores(name))
        `)
        .gt("received_quantity", 0)
        .order("created_at", { ascending: false })
        .limit(500);
      if (poError) throw poError;

      const transactions: any[] = [];
      
      // Add sales transactions
      sales?.forEach((sale: any) => {
        transactions.push({
          id: sale.id,
          name: sale.item?.name || sale.sku,
          transaction_type: 'SALE',
          quantity: -Math.abs(sale.quantity),
          date: sale.created_at,
          location: sale.item?.location || '',
          category: sale.item?.category?.name || '',
          brand: sale.item?.main_group?.name || '',
        });
      });
      
      // Add PO receipts
      poItems?.forEach((po: any) => {
        transactions.push({
          id: po.id,
          name: po.item_name,
          transaction_type: 'PURCHASE_ORDER',
          quantity: po.received_quantity,
          date: po.created_at,
          location: po.po?.store?.name || '',
          category: '',
          brand: '',
        });
      });
      
      // Sort by date descending
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
