import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
import { Transfer, TransferItem } from "@/types/database";
import { toast } from "sonner";

// FIX: Ensure 'export' is present to resolve TS2305 in TransferDetail.tsx
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

      // Select the item_id column explicitly AND perform an aliased join
      const { data: rawItems, error: itemsError } = await supabase
        .from("transfer_items")
        .select(
          `
            id,
            transfer_id,
            requested_quantity,
            received_quantity,
            item_id, // Select the foreign key
            // Join the items table via the item_id foreign key relationship
            item_details:item_id!inner(sku, name) 
          `,
        )
        .eq("transfer_id", transferId)
        .order("created_at");

      if (itemsError) throw itemsError;

      // Map the raw results to pull sku and item_name from the joined 'item_details' object.
      const items = (rawItems || []).map((ti: any) => ({
        id: ti.id,
        transfer_id: ti.transfer_id,
        item_id: ti.item_id,
        requested_quantity: ti.requested_quantity,
        received_quantity: ti.received_quantity,
        // Populate the missing fields from the joined table data
        sku: ti.item_details?.sku || "N/A",
        item_name: ti.item_details?.name || "N/A",
      })) as TransferItem[];

      const enhancedTransfer = {
        ...transfer,
        from_store_name: (transfer as any).from_store.name,
        to_store_name: (transfer as any).to_store.name,
      } as Transfer & { from_store_name: string; to_store_name: string };

      return {
        transfer: enhancedTransfer,
        items,
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
      items: Array<{ sku?: string; itemName?: string; quantity: number; item_id?: string }>;
    }) => {
      // Fetch item IDs for SKUs if item_id is not provided (e.g., from Import or Barcode)
      const itemsToInsert = await Promise.all(
        items.map(async (item) => {
          let resolvedItemId = item.item_id;

          if (!resolvedItemId && item.sku) {
            const { data: itemData, error } = await supabase
              .from("items")
              .select("id, name")
              .eq("sku", item.sku)
              .maybeSingle();

            if (error) throw error;
            resolvedItemId = itemData?.id;
          }

          if (!resolvedItemId) {
            toast.error(`Could not find item with SKU: ${item.sku}`);
            return null;
          }

          return {
            transfer_id: transferId,
            item_id: resolvedItemId,
            requested_quantity: item.quantity,
          };
        }),
      ).then((res) => res.filter((i) => i !== null));

      if (itemsToInsert.length === 0) throw new Error("No valid items to add.");

      const { error } = await supabase.from("transfer_items").insert(itemsToInsert as any);

      if (error) throw error;

      return { message: "Items added" };
    },
    onSuccess: (_, variables) => {
      toast.success("Items added successfully!");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
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

      return { message: "Item removed" };
    },
    onSuccess: (_, variables) => {
      toast.success("Item removed successfully!");
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
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
    mutationFn: async ({ transferId, status }: { transferId: number; status: Transfer["status"] }) => {
      const { error } = await supabase.from("transfers").update({ status }).eq("transfer_id", transferId);

      if (error) throw error;

      return { message: `Transfer status updated to ${status}` };
    },
    onSuccess: (_, variables) => {
      toast.success(`Transfer marked as ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
    },
    onError: (error: any) => {
      toast.error(`Failed to update transfer status: ${error.message}`);
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
