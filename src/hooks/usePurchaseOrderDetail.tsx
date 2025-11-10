import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, invalidateInventoryData } from "./queryKeys";
// Ensure these types are correctly defined in your src/types/index.ts file
import { PurchaseOrder, PurchaseOrderItem, POApprovalHistory } from "@/types";
import { toast } from "sonner";

/**
 * Custom hook to check if the current user is authorized as a PO Approver.
 * FIX: Resolves TS2339 for 'auth' property in the page component by defining the key.
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
        // Do not throw, treat as not an approver if checking fails
        return false;
      }
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
    // Only enabled if we have an authenticated user, but we check for user inside queryFn
    // enabled: !!supabase.auth.getUser(),
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
      // 1. Fetch the Purchase Order record with store join (now that FK exists)
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("*, stores(name)")
        .eq("id", id)
        .maybeSingle();

      if (poError) {
        console.error("Error fetching PO:", poError);
        throw poError;
      }
      if (!po) {
        throw new Error("Purchase order not found");
      }

      const purchaseOrder = po as PurchaseOrder;

      // 3. Fetch the Purchase Order Items (using raw items as resolution logic is complex)
      const { data: rawItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Error fetching PO items:", itemsError);
        throw itemsError;
      }

      // 4. Fetch Approval History (FIXED: Simple select to avoid the TS Parser Error)
      const { data: history, error: historyError } = await supabase
        .from("po_approval_history")
        .select(`*`)
        .eq("po_id", id)
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching PO history:", historyError);
        // Do not throw, history is non-critical
      }

      // Return the PO object along with its items list and history
      return {
        po: purchaseOrder,
        items: (rawItems as PurchaseOrderItem[]) || [],
        history: (history as POApprovalHistory[]) || [],
      };
    },
    enabled: !!id, // Only run the query if an ID is present
  });
};

/**
 * Hook for approving or rejecting a Purchase Order.
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
          // FIX: approved_by property is now correctly recognized due to type update
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
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(poId) });
      // Also invalidate inventory data if it's approved (as it affects committed cost metrics)
      if (newStatus === "Approved") {
        invalidateInventoryData(queryClient);
      }
      toast.success(`Purchase Order ${newStatus} successfully.`);
    },
    onError: (error) => {
      console.error("Approval Mutation Failed:", error);
      toast.error(`Failed to process action: ${error.message}`);
    },
  });
};
