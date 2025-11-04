import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";
// Ensure these types are correctly defined in your src/types/index.ts file
import { PurchaseOrder, PurchaseOrderItem } from "@/types";
import { toast } from "sonner"; // Assuming you have a toast library

/**
 * Custom hook to check if the current user is authorized as a PO Approver.
 * This checks the 'po_approvers' table for the current user's ID.
 */
export const useIsPoApprover = () => {
  return useQuery({
    queryKey: queryKeys.auth.isApprover,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check the new po_approvers table
      const { data, error } = await supabase
        .from("po_approvers")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking PO approver status:", error);
        return false;
      }
      return !!data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

/**
 * Custom hook to fetch a single purchase order, its items, and its approval history.
 * @param id The ID (bigint) from the URL used for routing.
 */
export const usePurchaseOrderDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: async () => {
      // 1. Fetch the Purchase Order record using the URL 'id' (bigint)
      const { data: po, error: poError } = await supabase
        // Updated to include the store name join
        .from("purchase_orders")
        .select("*, store:stores(name)")
        .eq("id", id)
        .maybeSingle();

      if (poError) {
        console.error("Error fetching PO (by external ID):", poError);
        throw poError;
      }
      if (!po) {
        throw new Error("Purchase order not found");
      }

      const purchaseOrder = po as PurchaseOrder;

      // 2. Fetch the Purchase Order Items (item resolution logic remains the same)
      const { data: rawItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Error fetching PO items:", itemsError);
        throw itemsError;
      }

      // Resolve color and size UUIDs to names
      const items = await Promise.all(
        (rawItems || []).map(async (item) => {
          let colorName = item.color;
          let sizeName = item.size;

          // Resolve color UUID
          if (item.color && item.color.length === 36 && item.color.includes("-")) {
            const { data: colorData } = await supabase.from("colors").select("name").eq("id", item.color).maybeSingle();
            if (colorData) colorName = colorData.name;
          }

          // Resolve size UUID
          if (item.size && item.size.length === 36 && item.size.includes("-")) {
            const { data: sizeData } = await supabase.from("sizes").select("name").eq("id", item.size).maybeSingle();
            if (sizeData) sizeName = sizeData.name;
          }

          return {
            ...item,
            color: colorName,
            size: sizeName,
          };
        }),
      );

      // 3. Fetch Approval History (NEW)
      const { data: history, error: historyError } = await supabase
        .from("po_approval_history")
        .select(
          `
          *,
          approver:auth.users(id) -- Placeholder for fetching user info, if available
        `,
        )
        .eq("po_id", id)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching PO history:", historyError);
        // Do not throw, history is non-critical
      }

      // Return the PO object along with its items list and history
      return {
        po: purchaseOrder,
        items: (items as PurchaseOrderItem[]) || [],
        history: history || [], // New history data
      };
    },
  });
};

/**
 * New Mutation Hook for Approval/Rejection.
 * This handles both the status update and the history logging (Phase 1, Item 1).
 */
export const usePOApprovalMutation = (poId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, notes }: { action: "approve" | "reject"; notes?: string }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("User authentication failed.");

      const newStatus = action === "approve" ? "Approved" : "Rejected";

      // 1. Update purchase_orders table
      const updatePromise = supabase
        .from("purchase_orders")
        .update({
          status: newStatus,
          approved_by: action === "approve" ? user.id : null,
        })
        .eq("id", poId);

      // 2. Record in po_approval_history table
      const historyPromise = supabase.from("po_approval_history").insert({
        po_id: poId,
        approver_id: user.id,
        status_change: newStatus,
        notes: notes || `${newStatus} by approver.`,
      });

      // Run both promises concurrently
      const [{ error: updateError }, { error: historyError }] = await Promise.all([updatePromise, historyPromise]);

      if (updateError) throw updateError;
      if (historyError) throw historyError;

      return newStatus;
    },
    onSuccess: (newStatus) => {
      // Invalidate queries to refresh the list and the detail view
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(poId) });
      toast.success(`Purchase Order ${newStatus} successfully.`);
    },
    onError: (error) => {
      console.error("Approval Mutation Failed:", error);
      toast.error(`Failed to process action: ${error.message}`);
    },
  });
};
