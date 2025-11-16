// src/hooks/useTransferDetail.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, invalidateInventoryData } from "./queryKeys";
import { Transfer, TransferItem } from "@/types/database";

export const useTransferDetail = (transferId: number | null) => {
  return useQuery({
    queryKey: queryKeys.transfers.detail(String(transferId)),
    queryFn: async () => {
      if (!transferId) throw new Error("No transfer ID provided");

      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .select("*")
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

      return { transfer: transfer as Transfer, items: (items || []) as TransferItem[] };
    },
    enabled: !!transferId,
  });
};

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

      const { data: allItems } = await supabase.from("transfer_items").select("quantity").eq("transfer_id", transferId);

      const totalItems = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      await supabase.from("transfers").update({ total_items: totalItems }).eq("transfer_id", transferId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.detail(String(variables.transferId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
};

// ... similar fixes for useRemoveTransferItem, useUpdateTransferStatus, useReceiveTransfer
