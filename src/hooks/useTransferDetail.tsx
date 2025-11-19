import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { Transfer, TransferItem } from "@/types/database";
import { toast } from "sonner";

// Subset of Item for transfer operations
export type TransferableItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  category: string;
};

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
        .select("*")
        .eq("transfer_id", transferId)
        .order("created_at");

      if (itemsError) throw itemsError;

      return {
        transfer: {
          ...transfer,
          from_store_name: transfer.from_store?.name || "",
          to_store_name: transfer.to_store?.name || "",
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

  return useMutation({
    mutationFn: async ({
      transferId,
      items,
    }: {
      transferId: number;
      items: Array<{ sku: string; itemName: string; quantity: number; itemId?: string }>;
    }) => {
      const itemsToInsert = await Promise.all(
        items.map(async (item) => {
          let itemId = item.itemId;

          if (!itemId) {
            const { data: itemData } = await supabase.from("items").select("id").eq("sku", item.sku).maybeSingle();

            itemId = itemData?.id;
          }

          if (!itemId) throw new Error(`Item with SKU ${item.sku} not found`);

          return {
            transfer_id: transferId,
            item_id: itemId,
            requested_quantity: item.quantity,
          };
        }),
      );

      const { data, error } = await supabase.from("transfer_items").insert(itemsToInsert).select();
      if (error) throw error;

      // Recalculate total_items
      const { data: allItems } = await supabase
        .from("transfer_items")
        .select("requested_quantity")
        .eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, i) => sum + (i.requested_quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return data;
    },
    onSuccess: (_, variables) => {
      toast.success("Items added to transfer successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error: any) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });
};

// ------------------
// 3. Remove Transfer Item
// ------------------
export const useRemoveTransferItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, itemId }: { transferId: number; itemId: string }) => {
      const { error } = await supabase.from("transfer_items").delete().eq("id", itemId);
      if (error) throw error;

      // Recalculate total_items
      const { data: allItems } = await supabase
        .from("transfer_items")
        .select("requested_quantity")
        .eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, i) => sum + (i.requested_quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return true;
    },
    onSuccess: (_, variables) => {
      toast.success("Item removed from transfer.");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error: any) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });
};

// ------------------
// 4. Update Transfer Status
// ------------------
export const useUpdateTransferStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, status }: { transferId: number; status: string }) => {
      const now = new Date().toISOString();
      const updatePayload: any = { status };
      if (status === "approved") updatePayload.approved_at = now;
      if (status === "shipped") updatePayload.shipped_at = now;

      const { data, error } = await supabase
        .from("transfers")
        .update(updatePayload)
        .eq("transfer_id", transferId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Transfer status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};

// ------------------
// 5. Receive Transfer
// ------------------
export const useReceiveTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId }: { transferId: number }) => {
      const { data: items, error } = await supabase
        .from("transfer_items")
        .select("id, requested_quantity")
        .eq("transfer_id", transferId);
      if (error) throw error;

      for (const item of items || []) {
        const { error: itemError } = await supabase
          .from("transfer_items")
          .update({ received_quantity: item.requested_quantity })
          .eq("id", item.id);
        if (itemError) throw itemError;
      }

      const { error: transferError } = await supabase
        .from("transfers")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("transfer_id", transferId);
      if (transferError) throw transferError;

      return { message: "Transfer received" };
    },
    onSuccess: (_, variables) => {
      toast.success("Transfer received successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: ["store-inventory"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to receive transfer: ${error.message}`);
    },
  });
};
