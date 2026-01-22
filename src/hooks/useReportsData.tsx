import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useReportsData = (dateFrom?: string, dateTo?: string) => {
  // Stores for filters
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name, location");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Categories for filters
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Brands for filters
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("main_groups").select("id, name");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Store Inventory Report
  const storeInventoryReport = useQuery({
    queryKey: ["store-inventory-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_store_inventory_report").select("*");
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Sales Report
  const salesReport = useQuery({
    queryKey: ["sales-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_sales_report").select("*").order("created_at", { ascending: false });
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 1, // Reduced to 1 minute for fresher data
    refetchOnMount: true,
  });

  // Purchase Orders Report
  const poReport = useQuery({
    queryKey: ["po-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_po_report").select("*");
      if (dateFrom) query = query.gte("order_date", dateFrom);
      if (dateTo) query = query.lte("order_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // POS Receipts Report - use correct column name
  const posReceiptsReport = useQuery({
    queryKey: ["pos-receipts-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_pos_receipts_report").select("*").order("created_at", { ascending: false });
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 1,
    refetchOnMount: true,
  });

  // Items Sold Report - note: this view doesn't have date columns, so no date filtering
  const itemsSoldReport = useQuery({
    queryKey: ["items-sold-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_items_sold_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 1,
    refetchOnMount: true,
  });

  // Transfers Report
  const transfersReport = useQuery({
    queryKey: ["transfers-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_transfers_report").select("*");
      if (dateFrom) query = query.gte("transfer_date", dateFrom);
      if (dateTo) query = query.lte("transfer_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Stock Movement Summary
  const stockMovementReport = useQuery({
    queryKey: ["stock-movement-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_stock_movement_summary").select("*");
      if (dateFrom) query = query.gte("movement_date", dateFrom);
      if (dateTo) query = query.lte("movement_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Inventory Turnover Report
  const inventoryTurnoverReport = useQuery({
    queryKey: ["inventory-turnover-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_inventory_turnover_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Profit Margin Report
  const profitMarginReport = useQuery({
    queryKey: ["profit-margin-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_profit_margin_report").select("*");
      if (dateFrom) query = query.gte("sale_date", dateFrom);
      if (dateTo) query = query.lte("sale_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Item Lifecycle Report
  const itemLifecycleReport = useQuery({
    queryKey: ["item-lifecycle-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_item_lifecycle_report").select("*");
      if (dateFrom) query = query.gte("date_added", dateFrom);
      if (dateTo) query = query.lte("date_added", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Cash Sessions Report
  const cashSessionsReport = useQuery({
    queryKey: ["cash-sessions-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_cash_sessions_report").select("*");
      if (dateFrom) query = query.gte("open_at", dateFrom);
      if (dateTo) query = query.lte("open_at", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Refunds Report
  const refundsReport = useQuery({
    queryKey: ["refunds-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_refunds_report").select("*");
      if (dateFrom) query = query.gte("refund_date", dateFrom);
      if (dateTo) query = query.lte("refund_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Payment Methods Report
  const paymentMethodsReport = useQuery({
    queryKey: ["payment-methods-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_payment_methods_report").select("*");
      if (dateFrom) query = query.gte("transaction_date", dateFrom);
      if (dateTo) query = query.lte("transaction_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Cashier Performance Report
  const cashierPerformanceReport = useQuery({
    queryKey: ["cashier-performance-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_cashier_performance_report").select("*");
      if (dateFrom) query = query.gte("transaction_date", dateFrom);
      if (dateTo) query = query.lte("transaction_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Daily POS Summary Report
  const dailyPosSummaryReport = useQuery({
    queryKey: ["daily-pos-summary-report", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from("v_daily_pos_summary").select("*").order("transaction_date", { ascending: false });
      if (dateFrom) query = query.gte("transaction_date", dateFrom);
      if (dateTo) query = query.lte("transaction_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 1,
    refetchOnMount: true,
  });

  const isLoading = 
    storeInventoryReport.isLoading || 
    salesReport.isLoading || 
    poReport.isLoading ||
    posReceiptsReport.isLoading ||
    itemsSoldReport.isLoading ||
    transfersReport.isLoading ||
    stockMovementReport.isLoading ||
    inventoryTurnoverReport.isLoading ||
    profitMarginReport.isLoading ||
    itemLifecycleReport.isLoading ||
    cashSessionsReport.isLoading ||
    refundsReport.isLoading ||
    paymentMethodsReport.isLoading ||
    cashierPerformanceReport.isLoading ||
    dailyPosSummaryReport.isLoading;

  const error = 
    storeInventoryReport.error || 
    salesReport.error || 
    poReport.error ||
    posReceiptsReport.error ||
    itemsSoldReport.error ||
    transfersReport.error ||
    stockMovementReport.error ||
    inventoryTurnoverReport.error ||
    profitMarginReport.error ||
    itemLifecycleReport.error ||
    cashSessionsReport.error ||
    refundsReport.error ||
    paymentMethodsReport.error ||
    cashierPerformanceReport.error ||
    dailyPosSummaryReport.error;

  return {
    stores,
    categories,
    brands,
    storeInventoryReport: storeInventoryReport.data || [],
    salesReport: salesReport.data || [],
    poReport: poReport.data || [],
    posReceiptsReport: posReceiptsReport.data || [],
    itemsSoldReport: itemsSoldReport.data || [],
    transfersReport: transfersReport.data || [],
    stockMovementReport: stockMovementReport.data || [],
    inventoryTurnoverReport: inventoryTurnoverReport.data || [],
    profitMarginReport: profitMarginReport.data || [],
    itemLifecycleReport: itemLifecycleReport.data || [],
    cashSessionsReport: cashSessionsReport.data || [],
    refundsReport: refundsReport.data || [],
    paymentMethodsReport: paymentMethodsReport.data || [],
    cashierPerformanceReport: cashierPerformanceReport.data || [],
    dailyPosSummaryReport: dailyPosSummaryReport.data || [],
    isLoading,
    error,
  };
};
