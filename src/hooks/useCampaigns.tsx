import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "expired" | "cancelled";
export type CampaignType =
  | "general" | "seasonal" | "client_specific" | "project_based" | "category"
  | "brand" | "quantity_based" | "bundle" | "clearance" | "special_approval";
export type DiscountMethod =
  | "fixed" | "percentage" | "category" | "brand" | "attribute"
  | "quantity_tier" | "value_tier" | "bundle" | "client_specific" | "manual_approval";

export interface Campaign {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  internal_notes: string | null;
  discount_method: DiscountMethod;
  discount_value: number;
  tier_config: any;
  max_discount_amount: number | null;
  max_discount_percentage: number | null;
  minimum_quotation_value: number | null;
  minimum_quantity: number | null;
  usage_limit: number | null;
  usage_per_client: number | null;
  usage_count: number;
  campaign_budget: number | null;
  consumed_budget: number;
  can_combine: boolean;
  requires_approval: boolean;
  auto_apply: boolean;
  discount_account_code: string | null;
  cost_center: string | null;
  applies_to_scope: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCampaigns = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });
};

export const useCampaign = (id?: string) => {
  return useQuery({
    queryKey: ["campaigns", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Campaign | null;
    },
  });
};

export const useUpsertCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Campaign> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { data, error } = await (supabase as any)
          .from("campaigns").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from("campaigns").insert(rest).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save campaign"),
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });
};

export const useDuplicateCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await (supabase as any)
        .from("campaigns").select("*").eq("id", id).single();
      if (e1) throw e1;
      const { id: _id, created_at, updated_at, usage_count, consumed_budget, ...rest } = src;
      rest.code = `${src.code}-COPY-${Date.now().toString().slice(-5)}`;
      rest.name = `${src.name} (Copy)`;
      rest.status = "draft";
      const { error: e2 } = await (supabase as any).from("campaigns").insert(rest);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign duplicated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to duplicate"),
  });
};
