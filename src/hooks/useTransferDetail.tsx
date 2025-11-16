// src/hooks/useTransferDetail.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, invalidateInventoryData } from "./queryKeys";
import { Transfer, TransferItem } from "@/types/database";
import { toast } from "sonner";

// ------------------
// 1. Fetch Transfer Detail
// ------------------
export const useTransferDetail = (transferId: number | null) => {
  return useQuery({
    queryKey: queryKeys.transfers.detail(String(transferId)),
    queryFn: async () => {
      if (!transferId) throw new Error("No transfer ID provided");

      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .select(
          `
          *,
          from_store:from_store_id (name),
          to_store:to_store_id (name)
        `,
        )
        .eq("transfer_id", transferId)
        .maybeSingle();

      if (transferError) throw transferError;
      if (!transfer) throw new Error("Transfer not found");

      const { data: items, error: itemsError } = await supabase
        .from("transfer_items")
        .select("id, sku, item_name, quantity")
        .eq("transfer_id", transferId)
        .order("created_at");

      if (itemsError) throw itemsError;

      // Data Mapping: Extract the store names from the joined tables
      return {
        transfer: {
          ...transfer,
          from_store_name: (transfer.from_store as { name: string })?.name,
          to_store_name: (transfer.to_store as { name: string })?.name,
        } as Transfer,
        items: (items || []) as TransferItem[],
      };
    },
    enabled: !!transferId,
  });
};

// ------------------
// 2. Add Transfer Items
// ------------------
export const useAddTransferItems = () => {
  const queryClient = useQueryClient();

  // FIX: Explicitly return the mutation object
  return useMutation({
    mutationFn: async ({
      transferId,
      items,
    }: {
      transferId: number;
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

      // Recalculate total items
      const { data: allItems } = await supabase.from("transfer_items").select("quantity").eq("transfer_id", transferId);
      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success("Items added to transfer successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });
};

// ------------------
// 3. Remove Transfer Item
// ------------------
export const useRemoveTransferItem = () => {
  const queryClient = useQueryClient();

  // FIX: Explicitly return the mutation object
  return useMutation({
    mutationFn: async ({ transferId, itemId }: { transferId: number; itemId: string }) => {
      // 1. Delete the item from the transfer
      const { error } = await supabase.from("transfer_items").delete().eq("id", itemId);
      if (error) throw error;

      // 2. Recalculate and update the total_items count on the main transfer record
      const { data: allItems } = await supabase.from("transfer_items").select("quantity").eq("transfer_id", transferId);
      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return true;
    },
    onSuccess: (data, variables) => {
      toast.success("Item removed from transfer.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });
};

// ------------------
// 4. Update Transfer Status
// ------------------
export const useUpdateTransferStatus = () => {
  const queryClient = useQueryClient();

  // FIX: Explicitly return the mutation object
  return useMutation({
    mutationFn: async ({ transferId, status }: { transferId: number; status: string }) => {
      const updatePayload: { status: string; approved_at?: string; shipped_at?: string } = { status };
      const now = new Date().toISOString();

      if (status === "approved") {
        updatePayload.approved_at = now;
      } else if (status === "shipped") {
        updatePayload.shipped_at = now;
      }

      const { data, error } = await supabase
        .from("transfers")
        .update(updatePayload)
        .eq("transfer_id", transferId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Transfer status updated to ${variables.status}.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};

// ------------------
// 5. Receive Transfer
// ------------------
export const useReceiveTransfer = () => {
  const queryClient = useQueryClient();

  // FIX: Explicitly return the mutation object
  return useMutation({
    mutationFn: async ({ transferId }: { transferId: number }) => {
      const { error: updateError } = await supabase
        .from("transfers")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("transfer_id", transferId);

      if (updateError) throw updateError;

      return { message: "Transfer received and status updated." };
    },
    onSuccess: (data, variables) => {
      toast.success("Transfer received successfully. Status updated.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error) => {
      toast.error(`Failed to receive transfer: ${error.message}`);
    },
  });
};
