import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export const useTransfers = (searchTerm: string = "", statusFilter: string = "all") => {
  return useQuery({
    queryKey: queryKeys.transfers.list(searchTerm, statusFilter),
    queryFn: async () => {
      let query = supabase.from("transfers").select("*").order("created_at", { ascending: false });

      if (searchTerm) query = query.ilike("transfer_number", `%${searchTerm}%`);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      return data; // data includes transfer_id as PK
    },
  });
};
