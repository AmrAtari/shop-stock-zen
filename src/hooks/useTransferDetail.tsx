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
        } as Transfer, // Assert as Transfer (or the local EnhancedTransfer in the page component)
        items: (items || []) as TransferItem[],
      };
    },
    enabled: !!transferId,
  });
};

// ... (useAddTransferItems, useRemoveTransferItem, useUpdateTransferStatus, useReceiveTransfer functions remain the same) ...
export const useAddTransferItems = () => {
  /* ... code from previous step ... */
};
export const useRemoveTransferItem = () => {
  /* ... code from previous step ... */
};
export const useUpdateTransferStatus = () => {
  /* ... code from previous step ... */
};
export const useReceiveTransfer = () => {
  /* ... code from previous step ... */
};
