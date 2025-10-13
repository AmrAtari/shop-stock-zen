import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export const usePurchaseOrders = (searchTerm?: string, statusFilter?: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: [...queryKeys.purchaseOrders.all, searchTerm, statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("po_number", `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateRange) {
        query = query
          .gte("order_date", dateRange.from.toISOString())
          .lte("order_date", dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
};

export const useStores = () => {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
};
