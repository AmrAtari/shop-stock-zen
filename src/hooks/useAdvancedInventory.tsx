import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Item Batches
export const useItemBatches = (itemId?: string) => {
  return useQuery({
    queryKey: ["item-batches", itemId],
    queryFn: async () => {
      let query = supabase
        .from("item_batches")
        .select(`*, items(name, sku), stores(name)`)
        .order("created_at", { ascending: false });
      
      if (itemId) {
        query = query.eq("item_id", itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: {
      item_id: string;
      batch_number: string;
      manufacture_date?: string;
      expiry_date?: string;
      quantity: number;
      cost_price?: number;
      store_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("item_batches")
        .insert(batch)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-batches"] });
      toast.success("Batch created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create batch: " + error.message);
    },
  });
};

// Serial Numbers
export const useSerialNumbers = (itemId?: string) => {
  return useQuery({
    queryKey: ["serial-numbers", itemId],
    queryFn: async () => {
      let query = supabase
        .from("item_serial_numbers")
        .select(`*, items(name, sku), stores(name), item_batches(batch_number)`)
        .order("created_at", { ascending: false });
      
      if (itemId) {
        query = query.eq("item_id", itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateSerialNumber = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serial: {
      item_id: string;
      serial_number: string;
      batch_id?: string;
      store_id?: string;
      purchase_date?: string;
      warranty_expiry?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("item_serial_numbers")
        .insert(serial)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serial-numbers"] });
      toast.success("Serial number added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add serial number: " + error.message);
    },
  });
};

// Bin Locations
export const useBinLocations = (storeId?: string) => {
  return useQuery({
    queryKey: ["bin-locations", storeId],
    queryFn: async () => {
      let query = supabase
        .from("bin_locations")
        .select(`*, stores(name)`)
        .eq("is_active", true)
        .order("bin_code");
      
      if (storeId) {
        query = query.eq("store_id", storeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateBinLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bin: {
      store_id: string;
      bin_code: string;
      aisle?: string;
      rack?: string;
      shelf?: string;
      bin?: string;
      capacity?: number;
    }) => {
      const { data, error } = await supabase
        .from("bin_locations")
        .insert(bin)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bin-locations"] });
      toast.success("Bin location created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create bin location: " + error.message);
    },
  });
};

// Reorder Rules
export const useReorderRules = () => {
  return useQuery({
    queryKey: ["reorder-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reorder_rules")
        .select(`*, items(name, sku), stores(name), suppliers(name)`)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateReorderRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: {
      item_id: string;
      store_id?: string;
      reorder_point: number;
      reorder_quantity: number;
      preferred_supplier_id?: string;
      lead_time_days?: number;
    }) => {
      const { data, error } = await supabase
        .from("reorder_rules")
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      toast.success("Reorder rule created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create reorder rule: " + error.message);
    },
  });
};

// ABC Analysis
export const useABCAnalysis = () => {
  return useQuery({
    queryKey: ["abc-analysis"],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("items")
        .select("id, name, sku, price, quantity, cost")
        .order("price", { ascending: false });
      
      if (error) throw error;
      
      // Calculate ABC classification based on value
      const totalValue = items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
      let cumValue = 0;
      
      return items?.map(item => {
        const itemValue = item.price * item.quantity;
        cumValue += itemValue;
        const cumPercentage = (cumValue / totalValue) * 100;
        
        let classification = 'C';
        if (cumPercentage <= 80) classification = 'A';
        else if (cumPercentage <= 95) classification = 'B';
        
        return {
          ...item,
          value: itemValue,
          classification,
          cumPercentage: cumPercentage.toFixed(1)
        };
      });
    },
  });
};
