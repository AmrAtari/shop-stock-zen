import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignRule {
  id: string;
  campaign_id: string;
  condition_group: number;
  field_name: string;
  operator: string;
  field_value: any;
  logical_operator: "AND" | "OR";
  action_type: string;
  action_value: any;
  sort_order: number;
}

export interface CampaignProductRow {
  id: string;
  campaign_id: string;
  product_id: string | null;
  category_id: string | null;
  brand_id: string | null;
  attribute_filters: any;
}

export const useCampaignRules = (campaignId?: string) =>
  useQuery({
    queryKey: ["campaign_rules", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaign_rules").select("*")
        .eq("campaign_id", campaignId).order("sort_order");
      if (error) throw error;
      return (data ?? []) as CampaignRule[];
    },
  });

export const useSaveCampaignRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, rules }: { campaignId: string; rules: Partial<CampaignRule>[] }) => {
      const { error: delErr } = await (supabase as any)
        .from("campaign_rules").delete().eq("campaign_id", campaignId);
      if (delErr) throw delErr;
      if (rules.length === 0) return;
      const payload = rules.map((r, i) => ({
        campaign_id: campaignId,
        condition_group: r.condition_group ?? 1,
        field_name: r.field_name ?? "cart_total",
        operator: r.operator ?? "=",
        field_value: r.field_value ?? null,
        logical_operator: r.logical_operator ?? "AND",
        action_type: r.action_type ?? "percentage_off",
        action_value: r.action_value ?? null,
        sort_order: i,
      }));
      const { error } = await (supabase as any).from("campaign_rules").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign_rules", vars.campaignId] });
      toast.success("Rules saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save rules"),
  });
};

export const useCampaignEligibility = (campaignId?: string) =>
  useQuery({
    queryKey: ["campaign_products", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaign_products").select("*").eq("campaign_id", campaignId);
      if (error) throw error;
      return (data ?? []) as CampaignProductRow[];
    },
  });

export const useSaveCampaignEligibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId, productIds, categoryIds, brandIds,
    }: { campaignId: string; productIds: string[]; categoryIds: string[]; brandIds: string[] }) => {
      const { error: delErr } = await (supabase as any)
        .from("campaign_products").delete().eq("campaign_id", campaignId);
      if (delErr) throw delErr;
      const rows: any[] = [
        ...productIds.map((id) => ({ campaign_id: campaignId, product_id: id })),
        ...categoryIds.map((id) => ({ campaign_id: campaignId, category_id: id })),
        ...brandIds.map((id) => ({ campaign_id: campaignId, brand_id: id })),
      ];
      if (rows.length === 0) return;
      const { error } = await (supabase as any).from("campaign_products").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign_products", vars.campaignId] });
      toast.success("Eligibility saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save eligibility"),
  });
};

export const useLookupOptions = () => {
  const items = useQuery({
    queryKey: ["lookup_items_min"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("items").select("id,sku,name").order("name").limit(1000);
      if (error) throw error;
      return data as { id: string; sku: string; name: string }[];
    },
  });
  const categories = useQuery({
    queryKey: ["lookup_categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("categories").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const brands = useQuery({
    queryKey: ["lookup_brands"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  return { items, categories, brands };
};