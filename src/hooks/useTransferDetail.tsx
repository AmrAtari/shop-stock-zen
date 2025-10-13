import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { Transfer, TransferItem } from "@/types/database";

export const useTransferDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.transfers.detail(id),
    queryFn: async () => {
      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (transferError) throw transferError;
      if (!transfer) throw new Error("Transfer not found");

      const { data: items, error: itemsError } = await supabase
        .from("transfer_items")
        .select("*")
        .eq("transfer_id", id)
        .order("created_at");

      if (itemsError) throw itemsError;

      return { transfer: transfer as Transfer, items: (items || []) as TransferItem[] };
    },
    enabled: !!id,
  });
};

export const useAddTransferItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, items }: { transferId: string; items: Array<{ sku: string; itemName: string; quantity: number; itemId?: string }> }) => {
      const { data, error } = await supabase
        .from("transfer_items")
        .insert(
          items.map((item) => ({
            transfer_id: transferId,
            item_id: item.itemId || null,
            sku: item.sku,
            item_name: item.itemName,
            quantity: item.quantity,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
};

export const useRemoveTransferItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, transferId }: { itemId: string; transferId: string }) => {
      const { error } = await supabase
        .from("transfer_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
    },
  });
};

export const useUpdateTransferStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, status, userId }: { transferId: string; status: string; userId?: string }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userId;
      } else if (status === "received") {
        updateData.received_at = new Date().toISOString();
        updateData.received_by = userId;
      }

      const { error } = await supabase
        .from("transfers")
        .update(updateData)
        .eq("id", transferId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
};

export const useReceiveTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, items, fromStoreId, toStoreId }: { transferId: string; items: TransferItem[]; fromStoreId?: string | null; toStoreId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update inventory quantities and create stock adjustments
      for (const item of items) {
        if (item.item_id) {
          const { data: inventoryItem, error: fetchError } = await supabase
            .from("items")
            .select("quantity")
            .eq("id", item.item_id)
            .single();

          if (fetchError) throw fetchError;

          const newQuantity = inventoryItem.quantity + item.quantity;

          const { error: updateError } = await supabase
            .from("items")
            .update({
              quantity: newQuantity,
              last_restocked: new Date().toISOString(),
            })
            .eq("id", item.item_id);

          if (updateError) throw updateError;

          // Create stock adjustment record
          const { error: adjustmentError } = await supabase
            .from("stock_adjustments")
            .insert({
              item_id: item.item_id,
              previous_quantity: inventoryItem.quantity,
              new_quantity: newQuantity,
              adjustment: item.quantity,
              reason: "Transfer received",
              reference_number: transferId,
              notes: `Transfer from ${fromStoreId || "unknown"} to ${toStoreId || "unknown"}`,
            });

          if (adjustmentError) throw adjustmentError;
        }
      }

      // Update transfer status
      const { error: statusError } = await supabase
        .from("transfers")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
          received_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transferId);

      if (statusError) throw statusError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
};
