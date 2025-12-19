import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// PO Receiving
export const usePOReceivings = (poId?: number) => {
  return useQuery({
    queryKey: ["po-receivings", poId],
    queryFn: async () => {
      let query = supabase
        .from("po_receiving")
        .select(`*`)
        .order("created_at", { ascending: false });
      
      if (poId) {
        query = query.eq("po_id", poId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreatePOReceiving = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receiving: {
      po_id: number;
      receiving_number: string;
      receiving_date?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("po_receiving")
        .insert({
          ...receiving,
          received_by: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-receivings"] });
      toast.success("Receiving record created");
    },
    onError: (error) => {
      toast.error("Failed to create receiving: " + error.message);
    },
  });
};

// PO Receiving Items
export const usePOReceivingItems = (receivingId?: string) => {
  return useQuery({
    queryKey: ["po-receiving-items", receivingId],
    queryFn: async () => {
      if (!receivingId) return [];
      const { data, error } = await supabase
        .from("po_receiving_items")
        .select(`*, purchase_order_items(item_name, sku, quantity)`)
        .eq("receiving_id", receivingId);
      if (error) throw error;
      return data;
    },
    enabled: !!receivingId,
  });
};

export const useCreateReceivingItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      receiving_id: string;
      po_item_id: string;
      received_quantity: number;
      accepted_quantity?: number;
      rejected_quantity?: number;
      rejection_reason?: string;
      batch_number?: string;
      qc_status?: string;
      qc_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("po_receiving_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-receiving-items"] });
      toast.success("Item received successfully");
    },
    onError: (error) => {
      toast.error("Failed to receive item: " + error.message);
    },
  });
};

// PO Amendments
export const usePOAmendments = (poId?: number) => {
  return useQuery({
    queryKey: ["po-amendments", poId],
    queryFn: async () => {
      let query = supabase
        .from("po_amendments")
        .select(`*`)
        .order("amendment_number", { ascending: false });
      
      if (poId) {
        query = query.eq("po_id", poId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreatePOAmendment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amendment: {
      po_id: number;
      amendment_number: number;
      reason: string;
      changes: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from("po_amendments")
        .insert(amendment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-amendments"] });
      toast.success("Amendment recorded");
    },
    onError: (error) => {
      toast.error("Failed to record amendment: " + error.message);
    },
  });
};

// Vendor Performance
export const useVendorPerformance = (supplierId?: string) => {
  return useQuery({
    queryKey: ["vendor-performance", supplierId],
    queryFn: async () => {
      let query = supabase
        .from("vendor_performance")
        .select(`*, suppliers(name)`)
        .order("period_start", { ascending: false });
      
      if (supplierId) {
        query = query.eq("supplier_id", supplierId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCalculateVendorPerformance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      supplier_id: string;
      period_start: string;
      period_end: string;
    }) => {
      // Get POs for this supplier in the period
      const { data: pos, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("supplier_id", params.supplier_id)
        .gte("order_date", params.period_start)
        .lte("order_date", params.period_end);
      
      if (poError) throw poError;
      
      const totalOrders = pos?.length || 0;
      const completedOrders = pos?.filter(po => po.status === 'received') || [];
      const onTimeDeliveries = completedOrders.filter(po => 
        po.received_date && po.expected_date && 
        new Date(po.received_date) <= new Date(po.expected_date)
      ).length;
      const totalValue = pos?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      
      const overallScore = totalOrders > 0 
        ? ((onTimeDeliveries / totalOrders) * 100)
        : 0;
      
      const { data, error } = await supabase
        .from("vendor_performance")
        .insert({
          supplier_id: params.supplier_id,
          evaluation_period: 'monthly',
          period_start: params.period_start,
          period_end: params.period_end,
          total_orders: totalOrders,
          on_time_deliveries: onTimeDeliveries,
          late_deliveries: totalOrders - onTimeDeliveries,
          total_value: totalValue,
          overall_score: overallScore,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-performance"] });
      toast.success("Vendor performance calculated");
    },
    onError: (error) => {
      toast.error("Failed to calculate performance: " + error.message);
    },
  });
};
