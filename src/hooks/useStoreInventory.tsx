import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateInventoryData } from "./queryKeys";

export interface StoreInventoryItem {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  min_stock: number;
  last_restocked: string | null;
  sku: string;
  item_name: string;
  store_name: string;
  category: string;
  brand: string | null;
  unit: string;
}

export const useStoreInventory = (storeId?: string) => {
  return useQuery({
    queryKey: ["store-inventory", storeId],
    queryFn: async (): Promise<StoreInventoryItem[]> => {
      let query = supabase
        .from("store_inventory")
        .select(`
          id,
          item_id,
          store_id,
          quantity,
          min_stock,
          last_restocked,
          items!inner(sku, name, category, brand, unit),
          stores!inner(name)
        `);

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching store inventory:", error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        item_id: item.item_id,
        store_id: item.store_id,
        quantity: item.quantity,
        min_stock: item.min_stock,
        last_restocked: item.last_restocked,
        sku: item.items.sku,
        item_name: item.items.name,
        store_name: item.stores.name,
        category: item.items.category,
        brand: item.items.brand,
        unit: item.items.unit,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateStoreInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      storeId,
      quantity,
      reason,
    }: {
      itemId: string;
      storeId: string;
      quantity: number;
      reason: string;
    }) => {
      // Check if inventory record exists
      const { data: existing } = await supabase
        .from("store_inventory")
        .select("id, quantity")
        .eq("item_id", itemId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("store_inventory")
          .update({
            quantity: existing.quantity + quantity,
            last_restocked: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;

        // Create stock adjustment record
        const { error: adjustmentError } = await supabase
          .from("stock_adjustments")
          .insert({
            item_id: itemId,
            store_id: storeId,
            previous_quantity: existing.quantity,
            new_quantity: existing.quantity + quantity,
            adjustment: quantity,
            reason,
          });

        if (adjustmentError) throw adjustmentError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from("store_inventory")
          .insert({
            item_id: itemId,
            store_id: storeId,
            quantity,
            last_restocked: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        // Create stock adjustment record
        const { error: adjustmentError } = await supabase
          .from("stock_adjustments")
          .insert({
            item_id: itemId,
            store_id: storeId,
            previous_quantity: 0,
            new_quantity: quantity,
            adjustment: quantity,
            reason,
          });

        if (adjustmentError) throw adjustmentError;
      }
    },
    onSuccess: async () => {
      await invalidateInventoryData(queryClient);
      toast.success("Store inventory updated successfully");
    },
    onError: (error) => {
      console.error("Error updating store inventory:", error);
      toast.error("Failed to update store inventory");
    },
  });
};
