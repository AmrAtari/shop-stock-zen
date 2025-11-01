import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { DateRange } from "react-day-picker"; // Assuming this type is available

/**
 * Custom hook to fetch and filter purchase orders.
 *
 * @param searchTerm Filters by PO number (case-insensitive partial match).
 * @param statusFilter Filters by exact status ('draft', 'pending', etc.). Set to 'all' to disable.
 * @param dateRange Filters by a date range on the 'order_date' column.
 */
export const usePurchaseOrders = (searchTerm?: string, statusFilter?: string, dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: [...queryKeys.purchaseOrders.all, searchTerm, statusFilter, dateRange],
    queryFn: async () => {
      // FIX: Changed sorting column from 'created_at' (which might not exist) to 'order_date' (which is confirmed in the schema)
      let query = supabase.from("purchase_orders").select("*").order("order_date", { ascending: false });

      if (searchTerm) {
        // Use ILIKE for case-insensitive partial match on po_number
        query = query.ilike("po_number", `%${searchTerm}%`);
      }

      if (statusFilter && statusFilter.toLowerCase() !== "all") {
        // Filter by specific status (draft, pending, approved, etc.)
        query = query.eq("status", statusFilter);
      }

      if (dateRange && dateRange.from && dateRange.to) {
        // Filter by date range on the order_date column
        const fromDate = dateRange.from.toISOString();
        // Add one day to the 'to' date to make the filter inclusive up to the end of the day
        const toDate = new Date(dateRange.to);
        toDate.setDate(toDate.getDate() + 1);

        query = query.gte("order_date", fromDate).lte("order_date", toDate.toISOString());
      }

      const { data, error } = await query;

      // Log error if any, but do not rely on alert()
      if (error) {
        console.error("Error fetching purchase orders:", error);
        throw error;
      }

      return data || [];
    },
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });
};

export const useStores = () => {
  return useQuery({
    queryKey: queryKeys.stores.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });
};

// Placeholder for queryKeys definition (if it's not in a separate file)
export const queryKeys = {
  purchaseOrders: {
    all: ["purchaseOrders"],
    detail: (id: string) => ["purchaseOrders", id],
  },
  suppliers: {
    all: ["suppliers"],
  },
  stores: {
    all: ["stores"],
  },
};

// NOTE: Please ensure the queryKeys file is updated/exists in your project.
