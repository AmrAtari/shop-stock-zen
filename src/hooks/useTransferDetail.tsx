import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, invalidateInventoryData } from "./queryKeys";
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
      // Insert transfer items
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
      
      // Update total_items count on the transfer
      const { data: allItems } = await supabase
        .from("transfer_items")
        .select("quantity")
        .eq("transfer_id", transferId);
      
      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      
      await supabase
        .from("transfers")
        .update({ total_items: totalItems })
        .eq("id", transferId);
      
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
      // Delete the item
      const { error } = await supabase
        .from("transfer_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      
      // Update total_items count on the transfer
      const { data: allItems } = await supabase
        .from("transfer_items")
        .select("quantity")
        .eq("transfer_id", transferId);
      
      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      
      await supabase
        .from("transfers")
        .update({ total_items: totalItems })
        .eq("id", transferId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
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
      
      // Get store names for better logging
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name")
        .in("id", [fromStoreId, toStoreId].filter(Boolean) as string[]);
      
      const fromStoreName = stores?.find(s => s.id === fromStoreId)?.name || "Unknown Store";
      const toStoreName = stores?.find(s => s.id === toStoreId)?.name || "Unknown Store";
      
      // Get transfer number for reference
      const { data: transfer } = await supabase
        .from("transfers")
        .select("transfer_number")
        .eq("id", transferId)
        .maybeSingle();
      
      const transferNumber = transfer?.transfer_number || transferId;
      
      // Process each item in the transfer
      for (const item of items) {
        // Try to find the item by item_id first, then by SKU
        let itemId = item.item_id;
        
        if (!itemId && item.sku) {
          const { data: foundItem } = await supabase
            .from("items")
            .select("id")
            .eq("sku", item.sku)
            .maybeSingle();
          
          itemId = foundItem?.id;
        }
        
        if (itemId) {
          const transferQty = item.quantity;

          // 1. Decrease quantity in from_store (if specified)
          if (fromStoreId) {
            const { data: fromInv } = await supabase
              .from("store_inventory")
              .select("id, quantity")
              .eq("item_id", itemId)
              .eq("store_id", fromStoreId)
              .maybeSingle();

            if (fromInv) {
              const newFromQty = Math.max(0, fromInv.quantity - transferQty);
              
              const { error: updateFromErr } = await supabase
                .from("store_inventory")
                .update({ quantity: newFromQty })
                .eq("id", fromInv.id);

              if (updateFromErr) throw updateFromErr;
            }
          }

          // 2. Increase quantity in to_store (if specified)
          if (toStoreId) {
            const { data: toInv } = await supabase
              .from("store_inventory")
              .select("id, quantity")
              .eq("item_id", itemId)
              .eq("store_id", toStoreId)
              .maybeSingle();

            if (toInv) {
              // Update existing
              const newToQty = toInv.quantity + transferQty;
              
              const { error: updateToErr } = await supabase
                .from("store_inventory")
                .update({
                  quantity: newToQty,
                  last_restocked: new Date().toISOString(),
                })
                .eq("id", toInv.id);

              if (updateToErr) throw updateToErr;
            } else {
              // Insert new record
              const { error: insertToErr } = await supabase
                .from("store_inventory")
                .insert({
                  item_id: itemId,
                  store_id: toStoreId,
                  quantity: transferQty,
                  last_restocked: new Date().toISOString(),
                });

              if (insertToErr) throw insertToErr;
            }
          }

          console.log(`Successfully processed transfer for item ${itemId}: ${fromStoreName} → ${toStoreName} (${transferQty} units)`);
        } else {
          console.warn(`Could not find inventory item for SKU: ${item.sku}`);
        }
      }

      // Update transfer status to received
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
      
      console.log(`Transfer ${transferNumber} successfully received and inventory updated`);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      await invalidateInventoryData(queryClient);
    },
  });
};
