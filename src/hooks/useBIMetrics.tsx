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
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get various metrics in parallel
      const [salesResult, inventoryResult, poResult, customersResult] = await Promise.all([
        // Total sales last 30 days
        supabase
          .from("transactions")
          .select("total")
          .gte("created_at", thirtyDaysAgo)
          .eq("is_refund", false),
        
        // Inventory value
        supabase
          .from("items")
          .select("quantity, cost"),
        
        // Pending POs
        supabase
          .from("purchase_orders")
          .select("total_amount, status")
          .in("status", ["pending", "approved", "ordered"]),
        
        // New customers
        supabase
          .from("customers")
          .select("id")
          .gte("created_at", thirtyDaysAgo),
      ]);
      
      const totalSales = salesResult.data?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;
      const inventoryValue = inventoryResult.data?.reduce((sum, i) => sum + (i.quantity * i.cost), 0) || 0;
      const pendingPOValue = poResult.data?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      const newCustomers = customersResult.data?.length || 0;
      
      return {
        totalSales,
        inventoryValue,
        pendingPOValue,
        newCustomers,
        salesGrowth: 0, // Would need previous period to calculate
        inventoryTurnover: totalSales > 0 ? (totalSales / inventoryValue * 12).toFixed(2) : 0,
      };
    },
    staleTime: 60000, // 1 minute
  });
};
