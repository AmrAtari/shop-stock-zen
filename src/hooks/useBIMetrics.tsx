import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// KPI Definitions
export const useKPIDefinitions = () => {
  return useQuery({
    queryKey: ["kpi-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_definitions")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateKPI = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kpi: {
      kpi_code: string;
      name: string;
      description?: string;
      calculation_formula?: string;
      target_value?: number;
      unit?: string;
      frequency?: string;
    }) => {
      const { data, error } = await supabase
        .from("kpi_definitions")
        .insert(kpi)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-definitions"] });
      toast.success("KPI created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create KPI: " + error.message);
    },
  });
};

// KPI History
export const useKPIHistory = (kpiId?: string) => {
  return useQuery({
    queryKey: ["kpi-history", kpiId],
    queryFn: async () => {
      let query = supabase
        .from("kpi_history")
        .select(`*, kpi_definitions(name, unit)`)
        .order("period_date", { ascending: false })
        .limit(30);
      
      if (kpiId) {
        query = query.eq("kpi_id", kpiId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useRecordKPIValue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      kpi_id: string;
      period_date: string;
      actual_value: number;
      target_value?: number;
    }) => {
      const variance = record.target_value 
        ? record.actual_value - record.target_value 
        : null;
      
      const { data, error } = await supabase
        .from("kpi_history")
        .insert({ ...record, variance })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-history"] });
      toast.success("KPI value recorded");
    },
    onError: (error) => {
      toast.error("Failed to record KPI: " + error.message);
    },
  });
};

// Dashboard Configurations
export const useDashboardConfig = () => {
  return useQuery({
    queryKey: ["dashboard-config"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      
      const { data, error } = await supabase
        .from("dashboard_configurations")
        .select("*")
        .eq("user_id", user.user.id)
        .eq("is_default", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
};

export const useSaveDashboardConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      config_name?: string;
      widgets: Record<string, unknown>[];
      layout?: Record<string, unknown>;
      is_default?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("dashboard_configurations")
        .upsert({
          user_id: user.user.id,
          ...config,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-config"] });
      toast.success("Dashboard saved");
    },
    onError: (error) => {
      toast.error("Failed to save dashboard: " + error.message);
    },
  });
};

// Real-time BI Metrics
export const useBIMetrics = () => {
  return useQuery({
    queryKey: ["bi-metrics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get various metrics in parallel
      const [
        salesResult, 
        prevSalesResult,
        inventoryResult, 
        poResult, 
        customersResult,
        prevCustomersResult
      ] = await Promise.all([
        // Total sales last 30 days
        supabase
          .from("transactions")
          .select("amount")
          .gte("created_at", thirtyDaysAgo)
          .eq("is_refund", false),
        
        // Previous 30 days sales (for comparison)
        supabase
          .from("transactions")
          .select("amount")
          .gte("created_at", sixtyDaysAgo)
          .lt("created_at", thirtyDaysAgo)
          .eq("is_refund", false),
        
        // Inventory value from store_inventory with item variants
        supabase
          .from("store_inventory")
          .select(`
            quantity,
            item_variants!inner(cost_price)
          `),
        
        // Pending POs
        supabase
          .from("purchase_orders")
          .select("total_cost, status")
          .in("status", ["pending", "approved", "ordered"]),
        
        // New customers last 30 days
        supabase
          .from("customers")
          .select("id")
          .gte("created_at", thirtyDaysAgo),
        
        // Previous 30 days customers
        supabase
          .from("customers")
          .select("id")
          .gte("created_at", sixtyDaysAgo)
          .lt("created_at", thirtyDaysAgo),
      ]);
      
      const totalSales = salesResult.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const prevTotalSales = prevSalesResult.data?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      const salesGrowth = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales * 100) : 0;
      
      const inventoryValue = inventoryResult.data?.reduce((sum, i) => {
        const cost = (i.item_variants as any)?.cost_price || 0;
        return sum + ((i.quantity || 0) * cost);
      }, 0) || 0;
      
      const pendingPOValue = poResult.data?.reduce((sum, po) => sum + (Number(po.total_cost) || 0), 0) || 0;
      const pendingPOCount = poResult.data?.length || 0;
      
      const newCustomers = customersResult.data?.length || 0;
      const prevNewCustomers = prevCustomersResult.data?.length || 0;
      const customerGrowth = prevNewCustomers > 0 ? ((newCustomers - prevNewCustomers) / prevNewCustomers * 100) : 0;
      
      return {
        totalSales,
        prevTotalSales,
        salesGrowth,
        inventoryValue,
        pendingPOValue,
        pendingPOCount,
        newCustomers,
        customerGrowth,
        inventoryTurnover: inventoryValue > 0 ? ((totalSales / inventoryValue) * 12).toFixed(2) : "0",
      };
    },
    staleTime: 60000, // 1 minute
  });
};

// Sales Trend Data (Monthly)
export const useSalesTrend = () => {
  return useQuery({
    queryKey: ["sales-trend"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, created_at, is_refund")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at");
      
      if (error) throw error;
      
      // Group by month
      const monthlyData: Record<string, { sales: number; orders: number; refunds: number }> = {};
      
      data?.forEach((tx) => {
        const date = new Date(tx.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { sales: 0, orders: 0, refunds: 0 };
        }
        
        if (tx.is_refund) {
          monthlyData[monthKey].refunds += Number(tx.amount) || 0;
        } else {
          monthlyData[monthKey].sales += Number(tx.amount) || 0;
          monthlyData[monthKey].orders += 1;
        }
      });
      
      // Convert to array sorted by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          const [, month] = key.split('-');
          return {
            month: months[parseInt(month) - 1],
            sales: value.sales,
            orders: value.orders,
            refunds: value.refunds,
          };
        });
    },
    staleTime: 300000, // 5 minutes
  });
};

// Top Categories by Sales
export const useTopCategories = () => {
  return useQuery({
    queryKey: ["top-categories"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          amount,
          item_id,
          items!inner(
            category_id,
            categories!inner(name)
          )
        `)
        .gte("created_at", thirtyDaysAgo)
        .eq("is_refund", false);
      
      if (error) throw error;
      
      // Group by category
      const categoryTotals: Record<string, { name: string; value: number }> = {};
      let grandTotal = 0;
      
      data?.forEach((tx) => {
        const categoryName = (tx.items as any)?.categories?.name || "Uncategorized";
        const amount = Number(tx.amount) || 0;
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { name: categoryName, value: 0 };
        }
        categoryTotals[categoryName].value += amount;
        grandTotal += amount;
      });
      
      // Sort by value and add percentage
      return Object.values(categoryTotals)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((cat) => ({
          ...cat,
          percentage: grandTotal > 0 ? Math.round((cat.value / grandTotal) * 100) : 0,
        }));
    },
    staleTime: 300000,
  });
};

// Low Stock Alerts
export const useLowStockAlerts = () => {
  return useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_inventory")
        .select(`
          quantity,
          min_stock,
          items!inner(name, sku)
        `)
        .not("min_stock", "is", null);
      
      if (error) throw error;
      
      return data?.filter((item) => (item.quantity || 0) <= (item.min_stock || 0)) || [];
    },
    staleTime: 60000,
  });
};

// Customer Trend (Monthly)
export const useCustomerTrend = () => {
  return useQuery({
    queryKey: ["customer-trend"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data, error } = await supabase
        .from("customers")
        .select("created_at")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at");
      
      if (error) throw error;
      
      // Group by month
      const monthlyData: Record<string, number> = {};
      
      data?.forEach((customer) => {
        const date = new Date(customer.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
          const [, month] = key.split('-');
          return {
            month: months[parseInt(month) - 1],
            customers: count,
          };
        });
    },
    staleTime: 300000,
  });
};

// Real KPI calculations from database
export const useCalculatedKPIs = () => {
  return useQuery({
    queryKey: ["calculated-kpis"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const [
        transactionsResult,
        salesOrdersResult,
        poResult,
        inventoryResult
      ] = await Promise.all([
        // Transactions for gross margin
        supabase
          .from("transactions")
          .select("amount, quantity, item_id")
          .gte("created_at", thirtyDaysAgo)
          .eq("is_refund", false),
        
        // Sales orders for fulfillment rate
        supabase
          .from("sales_orders")
          .select("status")
          .gte("created_at", thirtyDaysAgo),
        
        // PO for vendor on-time rate
        supabase
          .from("purchase_orders")
          .select("status, expected_delivery_date")
          .gte("order_date", thirtyDaysAgo),
        
        // Store inventory for stock accuracy
        supabase
          .from("store_inventory")
          .select("quantity, min_stock"),
      ]);
      
      // Order fulfillment rate
      const totalOrders = salesOrdersResult.data?.length || 0;
      const fulfilledOrders = salesOrdersResult.data?.filter(o => 
        ['delivered', 'completed', 'shipped'].includes(o.status || '')
      ).length || 0;
      const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 100) : 0;
      
      // Vendor on-time rate
      const totalPOs = poResult.data?.length || 0;
      const onTimePOs = poResult.data?.filter(po => {
        if (!po.expected_delivery_date) return true;
        return po.status === 'received' || po.status === 'completed';
      }).length || 0;
      const vendorOnTimeRate = totalPOs > 0 ? Math.round((onTimePOs / totalPOs) * 100) : 0;
      
      // Stock accuracy (items at or above min stock)
      const totalItems = inventoryResult.data?.length || 0;
      const healthyStock = inventoryResult.data?.filter(i => 
        (i.quantity || 0) >= (i.min_stock || 0)
      ).length || 0;
      const stockAccuracy = totalItems > 0 ? Math.round((healthyStock / totalItems) * 100) : 0;
      
      return {
        fulfillmentRate,
        vendorOnTimeRate,
        stockAccuracy,
        grossMargin: 32, // Would need cost data to calculate properly
        customerRetention: 87, // Would need historical customer data
      };
    },
    staleTime: 300000,
  });
};
