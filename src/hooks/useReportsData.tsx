import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useReportsData = () => {
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
    queryKey: ["store-inventory-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_store_inventory_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Sales Report
  const salesReport = useQuery({
    queryKey: ["sales-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_sales_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Purchase Orders Report
  const poReport = useQuery({
    queryKey: ["po-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_po_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // POS Receipts Report
  const posReceiptsReport = useQuery({
    queryKey: ["pos-receipts-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_pos_receipts_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Items Sold Report
  const itemsSoldReport = useQuery({
    queryKey: ["items-sold-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_items_sold_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Transfers Report
  const transfersReport = useQuery({
    queryKey: ["transfers-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_transfers_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Stock Movement Summary
  const stockMovementReport = useQuery({
    queryKey: ["stock-movement-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_stock_movement_summary").select("*");
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
    queryKey: ["profit-margin-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_profit_margin_report").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
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
    profitMarginReport.isLoading;

  const error = 
    storeInventoryReport.error || 
    salesReport.error || 
    poReport.error ||
    posReceiptsReport.error ||
    itemsSoldReport.error ||
    transfersReport.error ||
    stockMovementReport.error ||
    inventoryTurnoverReport.error ||
    profitMarginReport.error;

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
    isLoading,
    error,
  };
};
