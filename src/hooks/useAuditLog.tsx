import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action_type: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  timestamp: string | null;
  entity_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

interface AuditLogFilters {
  tableName?: string;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

export const useAuditLog = (filters: AuditLogFilters = {}) => {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(500);

      if (filters.tableName && filters.tableName !== "all") {
        query = query.eq("table_name", filters.tableName);
      }

      if (filters.actionType && filters.actionType !== "all") {
        query = query.eq("action_type", filters.actionType);
      }

      if (filters.dateFrom) {
        query = query.gte("timestamp", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("timestamp", `${filters.dateTo}T23:59:59`);
      }

      if (filters.searchTerm) {
        query = query.or(
          `record_id.ilike.%${filters.searchTerm}%,entity_name.ilike.%${filters.searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });
};

export const useAuditLogTables = () => {
  return useQuery({
    queryKey: ["audit-log-tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("table_name")
        .order("table_name");

      if (error) throw error;
      
      // Get unique table names
      const uniqueTables = [...new Set(data.map((d) => d.table_name))];
      return uniqueTables;
    },
  });
};
