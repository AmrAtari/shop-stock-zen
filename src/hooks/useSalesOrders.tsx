import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: number | null;
  store_id: string | null;
  order_date: string;
  expected_delivery: string | null;
  status: string | null;
  order_type: string | null;
  subtotal: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  shipping_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  payment_terms: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  customers?: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  stores?: {
    id: string;
    name: string;
  } | null;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string | null;
  item_id: string | null;
  sku: string | null;
  item_name: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number | null;
  tax_rate: number | null;
  line_total: number | null;
  shipped_quantity: number | null;
  created_at: string | null;
}

export const useSalesOrders = (searchTerm?: string, statusFilter?: string) => {
  return useQuery({
    queryKey: ["sales-orders", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("sales_orders")
        .select(`
          *,
          customers (id, name, email, phone),
          stores (id, name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`order_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SalesOrder[];
    },
  });
};

export const useSalesOrder = (id: string) => {
  return useQuery({
    queryKey: ["sales-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(`
          *,
          customers (id, name, email, phone, address),
          stores (id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as SalesOrder;
    },
    enabled: !!id,
  });
};

export const useSalesOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: ["sales-order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_order_items")
        .select("*")
        .eq("sales_order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as SalesOrderItem[];
    },
    enabled: !!orderId,
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Partial<SalesOrder> & { items?: Partial<SalesOrderItem>[] }) => {
      const { items, ...orderData } = order;

      // Generate order number
      const { data: countData } = await supabase
        .from("sales_orders")
        .select("id", { count: "exact" });
      
      const orderNumber = `SO-${String((countData?.length || 0) + 1).padStart(6, "0")}`;

      const { data: orderResult, error: orderError } = await supabase
        .from("sales_orders")
        .insert({
          ...orderData,
          order_number: orderNumber,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert items if provided
      if (items && items.length > 0) {
        const itemsWithOrderId = items.map((item) => ({
          ...item,
          sales_order_id: orderResult.id,
        }));

        const { error: itemsError } = await supabase
          .from("sales_order_items")
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;
      }

      return orderResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Sales order created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create sales order: ${error.message}`);
    },
  });
};

export const useUpdateSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from("sales_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order", data.id] });
      toast.success("Sales order updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update sales order: ${error.message}`);
    },
  });
};

export const useDeleteSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete items first
      await supabase.from("sales_order_items").delete().eq("sales_order_id", id);
      
      const { error } = await supabase
        .from("sales_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Sales order deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete sales order: ${error.message}`);
    },
  });
};
