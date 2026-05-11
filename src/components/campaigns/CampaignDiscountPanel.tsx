import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Check } from "lucide-react";
import { useActiveCampaigns, useCampaignEligibilityMap, evaluateCampaigns, recordCampaignDiscount, type CampaignContext, type ApplicableCampaign } from "@/hooks/useCampaignEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  ctx: CampaignContext;
  onApply: (a: ApplicableCampaign | null) => void;
  applied?: ApplicableCampaign | null;
  /** When true, the panel only shows applicable campaigns (no DB write). Use during cart edit. */
  draft?: boolean;
}

export default function CampaignDiscountPanel({ ctx, onApply, applied, draft = true }: Props) {
  const { data: campaigns = [] } = useActiveCampaigns();
  const { data: eligMap = {} } = useCampaignEligibilityMap(campaigns.map((c) => c.id));
  const [busy, setBusy] = useState(false);

  const applicable = useMemo(
    () => evaluateCampaigns(campaigns, eligMap, ctx),
    [campaigns, eligMap, ctx]
  );

  const apply = async (a: ApplicableCampaign) => {
    if (draft) {
      onApply(a);
      toast.success(`Applied ${a.campaign.name}`);
      return;
    }
    try {
      setBusy(true);
      const { data: u } = await supabase.auth.getUser();
      const res = await recordCampaignDiscount({
        campaign: a.campaign,
        ctx,
        discount_amount: a.discount_amount,
        user_id: u?.user?.id ?? null,
      });
      if (res.applied) {
        onApply(a);
        toast.success(`Applied ${a.campaign.name}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to apply campaign");
    } finally {
      setBusy(false);
    }
  };

  if (applicable.length === 0 && !applied) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Available Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {applied && (
          <div className="flex items-center justify-between rounded border border-primary/40 bg-primary/5 p-2">
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> {applied.campaign.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {applied.reason} · -{applied.discount_amount.toLocaleString()}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onApply(null)}>Remove</Button>
          </div>
        )}

        {applicable.filter((a) => a.campaign.id !== applied?.campaign.id).map((a) => (
          <div key={a.campaign.id} className="flex items-center justify-between rounded border p-2">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                {a.campaign.name}
                {a.campaign.requires_approval && <Badge variant="outline" className="text-xs">needs approval</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{a.reason} · saves {a.discount_amount.toLocaleString()}</div>
            </div>
            <Button size="sm" disabled={busy} onClick={() => apply(a)}>Apply</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}