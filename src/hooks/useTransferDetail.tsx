import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, invalidateInventoryData } from "./queryKeys";
import { Transfer, TransferItem } from "@/types/database";

// Fetch transfer detail
export const useTransferDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.transfers.detail(id),
    queryFn: async () => {
      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .select("*")
        .eq("transfer_id", id)
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

// Add items to transfer
export const useAddTransferItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transferId,
      items,
    }: {
      transferId: string;
      items: Array<{ sku: string; itemName: string; quantity: number; itemId?: string }>;
    }) => {
      const { data, error } = await supabase
        .from("transfer_items")
        .insert(
          items.map((item) => ({
            transfer_id: transferId,
            item_id: item.itemId || null,
            sku: item.sku,
            item_name: item.itemName,
            quantity: item.quantity,
          })),
        )
        .select();

      if (error) throw error;

      // Update total_items count
      const { data: allItems } = await supabase.from("transfer_items").select("quantity").eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
};

// Remove item from transfer
export const useRemoveTransferItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, transferId }: { itemId: string; transferId: string }) => {
      const { error } = await supabase.from("transfer_items").delete().eq("id", itemId);
      if (error) throw error;

      const { data: allItems } = await supabase.from("transfer_items").select("quantity").eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
};

// Update transfer status
export const useUpdateTransferStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, status, userId }: { transferId: string; status: string; userId?: string }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };

      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userId;
      } else if (status === "received") {
        updateData.received_at = new Date().toISOString();
        updateData.received_by = userId;
      }

      const { error } = await supabase.from("transfers").update(updateData).eq("transfer_id", transferId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
};

// Receive transfer and update inventory
export const useReceiveTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transferId,
      items,
      fromStoreId,
      toStoreId,
    }: {
      transferId: string;
      items: TransferItem[];
      fromStoreId?: string | null;
      toStoreId?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      for (const item of items) {
        let itemId = item.item_id;
        if (!itemId && item.sku) {
          const { data: foundItem } = await supabase.from("items").select("id").eq("sku", item.sku).maybeSingle();
          itemId = foundItem?.id;
        }

        if (!itemId) continue;

        // From store inventory
        if (fromStoreId) {
          const { data: fromInv } = await supabase
            .from("store_inventory")
            .select("id, quantity")
            .eq("item_id", itemId)
            .eq("store_id", fromStoreId)
            .maybeSingle();

          if (fromInv) {
            await supabase
              .from("store_inventory")
              .update({ quantity: Math.max(0, fromInv.quantity - item.quantity) })
              .eq("id", fromInv.id);
          }
        }

        // To store inventory
        if (toStoreId) {
          const { data: toInv } = await supabase
            .from("store_inventory")
            .select("id, quantity")
            .eq("item_id", itemId)
            .eq("store_id", toStoreId)
            .maybeSingle();

          if (toInv) {
            await supabase
              .from("store_inventory")
              .update({ quantity: toInv.quantity + item.quantity, last_restocked: new Date().toISOString() })
              .eq("id", toInv.id);
          } else {
            await supabase
              .from("store_inventory")
              .insert({
                item_id: itemId,
                store_id: toStoreId,
                quantity: item.quantity,
                last_restocked: new Date().toISOString(),
              });
          }
        }
      }

      await supabase
        .from("transfers")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
          received_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("transfer_id", transferId);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      await invalidateInventoryData(queryClient);
    },
  });
};
