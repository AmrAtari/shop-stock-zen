// src/hooks/useTransferDetail.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ------------------
// Types
// ------------------
export interface TransferSelectorItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  unit?: string | null;
}

export interface TransferDetail {
  transfer_id: number;
  from_store_id: number;
  to_store_id: number;
  from_store_name: string;
  to_store_name: string;
  transfer_number: string;
  status: string;
  total_items: number;
  [key: string]: any;
}

export interface TransferItem {
  id: string;
  item_id: string;
  sku: string;
  item_name: string;
  requested_quantity: number;
  received_quantity: number;
}

// ------------------
// 1. Fetch Transfer Detail
// ------------------
export const useTransferDetail = (transferId: number | null) => {
  return useQuery<{ transfer: TransferDetail; items: TransferItem[] }>({
    queryKey: ["transfers", transferId],
    queryFn: async () => {
      if (!transferId) throw new Error("No transfer ID provided");

      // Fetch transfer
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

      // Fetch transfer items
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
        } as TransferDetail,
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
            sku: item.sku,
            requested_quantity: item.quantity,
          };
        }),
      );

      const { error } = await supabase.from("transfer_items").insert(itemsToInsert);

      if (error) throw error;

      // Update total_items
      const { data: allItems } = await supabase
        .from("transfer_items")
        .select("requested_quantity")
        .eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, i) => sum + (i.requested_quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return itemsToInsert;
    },
    onSuccess: (_, variables) => {
      toast.success("Items added successfully");
      queryClient.invalidateQueries(["transfers", variables.transferId]);
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

      // Update total_items
      const { data: allItems } = await supabase
        .from("transfer_items")
        .select("requested_quantity")
        .eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, i) => sum + (i.requested_quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return true;
    },
    onSuccess: (_, variables) => {
      toast.success("Item removed successfully");
      queryClient.invalidateQueries(["transfers", variables.transferId]);
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
      const payload: any = { status };
      const now = new Date().toISOString();
      if (status === "approved") payload.approved_at = now;
      if (status === "shipped") payload.shipped_at = now;

      const { data, error } = await supabase
        .from("transfers")
        .update(payload)
        .eq("transfer_id", transferId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Status updated to ${variables.status}`);
      queryClient.invalidateQueries(["transfers", variables.transferId]);
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

      return { message: "Transfer received successfully" };
    },
    onSuccess: (_, variables) => {
      toast.success("Transfer received");
      queryClient.invalidateQueries(["transfers", variables.transferId]);
    },
    onError: (error: any) => {
      toast.error(`Failed to receive transfer: ${error.message}`);
    },
  });
};
