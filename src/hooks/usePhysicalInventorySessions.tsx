import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/queryKeys";

export interface PhysicalInventorySession {
  id: string;
  session_number: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  store_id: string | null;
  count_date: string;
  count_type: string;
  responsible_person: string | null;
  department: string | null;
  purpose: string | null;
  expected_items: number | null;
  location_filter: string | null;
  started_by: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  location: string | null;
}

export const usePhysicalInventorySessions = () => {
  return useQuery({
    queryKey: queryKeys.physicalInventory.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select(`
          *,
          stores:store_id (
            id,
            name,
            location
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (PhysicalInventorySession & { stores: Store | null })[];
    },
  });
};

export const usePhysicalInventorySession = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? queryKeys.physicalInventory.detail(id) : [],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select(`
          *,
          stores:store_id (
            id,
            name,
            location
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as (PhysicalInventorySession & { stores: Store | null }) | null;
    },
    enabled: !!id,
  });
};

export const useStores = () => {
  return useQuery({
    queryKey: queryKeys.stores.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Store[];
    },
  });
};
