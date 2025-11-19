// src/hooks/useTransferDetail.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { Transfer, TransferItem, Item } from "@/types/database";
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
        .select("*")
        .eq("transfer_id", transferId)
        .order("created_at");

      if (itemsError) throw itemsError;

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

  return useMutation({
    mutationFn: async ({
      transferId,
      items,
    }: {
      transferId: number;
      items: Array<{ sku: string; itemName: string; quantity: number; itemId?: string }>;
    }) => {
      // Map items to transfer_items table
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

      const { error } = await supabase.from("transfer_items").insert(itemsToInsert);
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
      toast.success("Items added to transfer successfully.");
      queryClient.invalidateQueries(queryKeys.transfers.detail(String(variables.transferId)));
      queryClient.invalidateQueries(queryKeys.transfers.all);
      queryClient.invalidateQueries(["store-inventory"]);
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
      queryClient.invalidateQueries(queryKeys.transfers.detail(String(variables.transferId)));
      queryClient.invalidateQueries(queryKeys.transfers.all);
      queryClient.invalidateQueries(["store-inventory"]);
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
      const updatePayload: { status: string; approved_at?: string; shipped_at?: string } = { status };
      const now = new Date().toISOString();

      if (status === "approved") updatePayload.approved_at = now;
      if (status === "shipped") updatePayload.shipped_at = now;

      const { error } = await supabase.from("transfers").update(updatePayload).eq("transfer_id", transferId);
      if (error) throw error;

      return true;
    },
    onSuccess: (_, variables) => {
      toast.success(`Transfer status updated to ${variables.status}.`);
      queryClient.invalidateQueries(queryKeys.transfers.detail(String(variables.transferId)));
      queryClient.invalidateQueries(queryKeys.transfers.all);
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
      const { data: transferItems, error } = await supabase
        .from("transfer_items")
        .select("id, requested_quantity")
        .eq("transfer_id", transferId);
      if (error) throw error;

      for (const item of transferItems || []) {
        const { error: updateError } = await supabase
          .from("transfer_items")
          .update({ received_quantity: item.requested_quantity })
          .eq("id", item.id);
        if (updateError) throw updateError;
      }

      const { error: transferError } = await supabase
        .from("transfers")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("transfer_id", transferId);
      if (transferError) throw transferError;

      return true;
    },
    onSuccess: (_, variables) => {
      toast.success("Transfer received successfully. Inventory updated.");
      queryClient.invalidateQueries(queryKeys.transfers.detail(String(variables.transferId)));
      queryClient.invalidateQueries(queryKeys.transfers.all);
      queryClient.invalidateQueries(["store-inventory"]);
    },
    onError: (error: any) => {
      toast.error(`Failed to receive transfer: ${error.message}`);
    },
  });
};
