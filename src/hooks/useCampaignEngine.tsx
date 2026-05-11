import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Campaign } from "./useCampaigns";

export interface CartLine {
  item_id?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface CampaignContext {
  source: "pos" | "sales_order";
  source_id?: string;
  store_id?: string | null;
  customer_id?: number | null;
  subtotal: number;
  total_quantity: number;
  lines: CartLine[];
}

export interface ApplicableCampaign {
  campaign: Campaign;
  discount_amount: number;
  reason: string;
}

export const useActiveCampaigns = () =>
  useQuery({
    queryKey: ["campaigns_active"],
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("campaigns").select("*")
        .in("status", ["active", "scheduled"])
        .order("priority", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Campaign[]).filter((c) => {
        if (c.start_date && c.start_date > now) return false;
        if (c.end_date && c.end_date < now) return false;
        if (c.usage_limit && c.usage_count >= c.usage_limit) return false;
        if (c.campaign_budget && Number(c.consumed_budget) >= Number(c.campaign_budget)) return false;
        return c.status === "active";
      });
    },
  });

export const useCampaignEligibilityMap = (campaignIds: string[]) =>
  useQuery({
    queryKey: ["campaign_eligibility_map", campaignIds.sort().join(",")],
    enabled: campaignIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaign_products").select("*").in("campaign_id", campaignIds);
      if (error) throw error;
      const map: Record<string, { products: Set<string>; cats: Set<string>; brands: Set<string> }> = {};
      for (const row of data ?? []) {
        const e = (map[row.campaign_id] ||= { products: new Set(), cats: new Set(), brands: new Set() });
        if (row.product_id) e.products.add(row.product_id);
        if (row.category_id) e.cats.add(row.category_id);
        if (row.brand_id) e.brands.add(row.brand_id);
      }
      return map;
    },
  });

export function evaluateCampaigns(campaigns: Campaign[], elig: Record<string, any>, ctx: CampaignContext): ApplicableCampaign[] {
  const out: ApplicableCampaign[] = [];
  for (const c of campaigns) {
    if (c.minimum_quotation_value && ctx.subtotal < Number(c.minimum_quotation_value)) continue;
    if (c.minimum_quantity && ctx.total_quantity < Number(c.minimum_quantity)) continue;

    // Eligibility intersection
    const e = elig[c.id];
    let eligibleSubtotal = ctx.subtotal;
    if (e && (e.products.size + e.cats.size + e.brands.size) > 0) {
      const eligibleLines = ctx.lines.filter((l) =>
        (l.item_id && e.products.has(l.item_id)) ||
        (l.category_id && e.cats.has(l.category_id)) ||
        (l.brand_id && e.brands.has(l.brand_id))
      );
      if (eligibleLines.length === 0) continue;
      eligibleSubtotal = eligibleLines.reduce((s, l) => s + l.line_total, 0);
    }

    let discount = 0;
    if (c.discount_method === "percentage") discount = (eligibleSubtotal * Number(c.discount_value)) / 100;
    else if (c.discount_method === "fixed") discount = Math.min(eligibleSubtotal, Number(c.discount_value));
    else continue; // skip unsupported methods in v1 engine

    if (c.max_discount_amount) discount = Math.min(discount, Number(c.max_discount_amount));
    if (c.max_discount_percentage) discount = Math.min(discount, (eligibleSubtotal * Number(c.max_discount_percentage)) / 100);
    if (discount <= 0) continue;

    out.push({
      campaign: c,
      discount_amount: Math.round(discount * 100) / 100,
      reason: c.discount_method === "percentage"
        ? `${c.discount_value}% off ${e ? "eligible items" : "cart"}`
        : `${c.discount_value} off`,
    });
  }
  return out.sort((a, b) => b.discount_amount - a.discount_amount);
}

export async function recordCampaignDiscount(opts: {
  campaign: Campaign;
  ctx: CampaignContext;
  discount_amount: number;
  user_id?: string | null;
}) {
  const { campaign, ctx, discount_amount, user_id } = opts;

  if (campaign.requires_approval) {
    const { error } = await (supabase as any).from("discount_approvals").insert({
      source_type: ctx.source,
      source_id: ctx.source_id ?? null,
      campaign_id: campaign.id,
      requested_by: user_id ?? null,
      status: "pending",
      original_amount: ctx.subtotal,
      discount_amount,
      final_amount: ctx.subtotal - discount_amount,
      comment: `Auto-requested via ${ctx.source}`,
    });
    if (error) throw error;
    toast.info("Discount requires manager approval");
    return { applied: false, pendingApproval: true };
  }

  const { error: usageErr } = await (supabase as any).from("campaign_usage").insert({
    campaign_id: campaign.id,
    source_type: ctx.source,
    source_id: ctx.source_id ?? null,
    customer_id: ctx.customer_id ?? null,
    discount_amount,
    transaction_total: ctx.subtotal - discount_amount,
  });
  if (usageErr) throw usageErr;

  await (supabase as any).from("transaction_discounts").insert({
    source_type: ctx.source,
    source_id: ctx.source_id ?? null,
    campaign_id: campaign.id,
    discount_type: campaign.discount_method,
    discount_value: campaign.discount_value,
    discount_amount,
    applied_to: "subtotal",
    approval_status: "approved",
    created_by: user_id ?? null,
  });

  await (supabase as any).from("campaigns").update({
    usage_count: (campaign.usage_count ?? 0) + 1,
    consumed_budget: Number(campaign.consumed_budget ?? 0) + discount_amount,
  }).eq("id", campaign.id);

  return { applied: true, pendingApproval: false };
}