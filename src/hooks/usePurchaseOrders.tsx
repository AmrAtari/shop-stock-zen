import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { PurchaseOrder, Supplier, Store } from "@/types"; // Import types
import { DateRange } from "react-day-picker";

/**
 * Custom hook to fetch and filter purchase orders.
 */
export const usePurchaseOrders = (searchTerm?: string, statusFilter?: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery<PurchaseOrder[]>({
    queryKey: [...queryKeys.purchaseOrders.all, searchTerm, statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (searchTerm) {
        query = query.ilike("po_number", `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter.toLowerCase() !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateRange && dateRange.from && dateRange.to) {
        const fromDate = dateRange.from.toISOString();
        const toDate = new Date(dateRange.to);
        toDate.setDate(toDate.getDate() + 1);
        query = query.gte("order_date", fromDate).lte("order_date", toDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching purchase orders:", error);
        throw error;
      }

      return (data as PurchaseOrder[]) || [];
    },
  });
};

export const useSuppliers = () => {
  return useQuery<Supplier[]>({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      // The '*' ensures we fetch all columns required by the Supplier interface,
      // resolving the final type mismatch in PurchaseOrderNew.tsx.
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return (data as Supplier[]) || [];
    },
  });
};

export const useStores = () => {
  return useQuery<Store[]>({
    queryKey: queryKeys.stores.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return (data as Store[]) || [];
    },
  });
};
