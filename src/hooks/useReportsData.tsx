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

  const isLoading = storeInventoryReport.isLoading || salesReport.isLoading || poReport.isLoading;
  const error = storeInventoryReport.error || salesReport.error || poReport.error;

  return {
    stores,
    categories,
    brands,
    storeInventoryReport: storeInventoryReport.data || [],
    salesReport: salesReport.data || [],
    poReport: poReport.data || [],
    isLoading,
    error,
  };
};
