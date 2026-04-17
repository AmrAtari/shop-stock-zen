import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PendingPO {
  kind: "po";
  id: string;
  po_id: number;
  number: string;
  store_name: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  total_cost: number | null;
  total_items: number | null;
}

export interface PendingTransfer {
  kind: "transfer";
  id: number;
  number: string;
  from_store_name: string | null;
  to_store_name: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  total_items: number | null;
}

export type PendingApproval = PendingPO | PendingTransfer;

export const usePendingApprovals = () => {
  return useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: async (): Promise<PendingApproval[]> => {
      const [poRes, trRes] = await Promise.all([
        supabase
          .from("purchase_orders")
          .select("id, po_id, po_number, total_cost, total_items, submitted_at, submitted_by, stores(name)")
          .eq("status", "awaiting_approval")
          .order("submitted_at", { ascending: false }),
        supabase
          .from("transfers")
          .select("transfer_id, transfer_number, total_items, submitted_at, submitted_by, from_store:from_store_id(name), to_store:to_store_id(name)")
          .eq("status", "awaiting_approval")
          .order("submitted_at", { ascending: false }),
      ]);

      if (poRes.error) throw poRes.error;
      if (trRes.error) throw trRes.error;

      const pos: PendingApproval[] = (poRes.data || []).map((p: any) => ({
        kind: "po" as const,
        id: p.id,
        po_id: p.po_id,
        number: p.po_number,
        store_name: p.stores?.name ?? null,
        submitted_at: p.submitted_at,
        submitted_by: p.submitted_by,
        total_cost: p.total_cost,
        total_items: p.total_items,
      }));

      const transfers: PendingApproval[] = (trRes.data || []).map((t: any) => ({
        kind: "transfer" as const,
        id: t.transfer_id,
        number: t.transfer_number,
        from_store_name: t.from_store?.name ?? null,
        to_store_name: t.to_store?.name ?? null,
        submitted_at: t.submitted_at,
        submitted_by: t.submitted_by,
        total_items: t.total_items,
      }));

      return [...pos, ...transfers].sort((a, b) =>
        (b.submitted_at || "").localeCompare(a.submitted_at || "")
      );
    },
    refetchInterval: 30_000,
  });
};

export const useApprovalActions = () => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["approvals", "pending"] });
    qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    qc.invalidateQueries({ queryKey: ["transfers"] });
    qc.invalidateQueries({ queryKey: ["store-inventory"] });
  };

  const approvePO = useMutation({
    mutationFn: async (poDbId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "pending",
          approval_decided_by: user?.id,
          approval_decided_at: new Date().toISOString(),
        })
        .eq("id", poDbId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Purchase order approved");
      invalidate();
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const rejectPO = useMutation({
    mutationFn: async ({ poDbId, reason }: { poDbId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "rejected",
          approval_decided_by: user?.id,
          approval_decided_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq("id", poDbId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Purchase order rejected");
      invalidate();
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const approveTransfer = useMutation({
    mutationFn: async (transferId: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("transfers")
        .update({
          status: "pending",
          approval_decided_by: user?.id,
          approval_decided_at: new Date().toISOString(),
        })
        .eq("transfer_id", transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transfer approved");
      invalidate();
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const rejectTransfer = useMutation({
    mutationFn: async ({ transferId, reason }: { transferId: number; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("transfers")
        .update({
          status: "rejected",
          approval_decided_by: user?.id,
          approval_decided_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq("transfer_id", transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transfer rejected");
      invalidate();
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  return { approvePO, rejectPO, approveTransfer, rejectTransfer };
};
