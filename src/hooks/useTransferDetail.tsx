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
          // Fetch current inventory quantity
          const { data: inventoryItem, error: fetchError } = await supabase
            .from("items")
            .select("quantity, sku, name")
            .eq("id", itemId)
            .maybeSingle();

          if (fetchError) throw fetchError;
          
          if (!inventoryItem) {
            console.warn(`Item with ID ${itemId} not found in inventory`);
            continue;
          }

          const currentQty = inventoryItem.quantity;
          const transferQty = item.quantity;
          
          // For a simple inventory system without store-specific quantities,
          // we don't change the total quantity, but we log the transfer
          // However, since user wants to see quantity increase at destination,
          // we'll increment the quantity (treating it as destination store inventory)
          const newQuantity = currentQty + transferQty;

          // Update inventory quantity
          const { error: updateError } = await supabase
            .from("items")
            .update({
              quantity: newQuantity,
              last_restocked: new Date().toISOString(),
            })
            .eq("id", itemId);

          if (updateError) {
            console.error(`Failed to update item ${itemId}:`, updateError);
            throw updateError;
          }

          // Create stock adjustment record for the received items
          const { error: adjustmentError } = await supabase
            .from("stock_adjustments")
            .insert({
              item_id: itemId,
              previous_quantity: currentQty,
              new_quantity: newQuantity,
              adjustment: transferQty,
              reason: "Transfer received",
              reference_number: transferNumber,
              notes: `Transfer ${transferNumber}: Received ${transferQty} units from ${fromStoreName} to ${toStoreName}`,
            });

          if (adjustmentError) {
            console.error(`Failed to create stock adjustment for item ${itemId}:`, adjustmentError);
            throw adjustmentError;
          }
          
          console.log(`Successfully updated inventory: ${inventoryItem.name} (${inventoryItem.sku}) - ${currentQty} → ${newQuantity} (+${transferQty})`);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(variables.transferId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.lowStock });
    },
  });
};
