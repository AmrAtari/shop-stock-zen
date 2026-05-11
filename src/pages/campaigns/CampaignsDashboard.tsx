import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { Megaphone, TrendingUp, Wallet, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function CampaignsDashboard() {
  const { formatCurrency } = useSystemSettings();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["dashboard_campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: usage = [] } = useQuery({
    queryKey: ["dashboard_usage"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaign_usage").select("*").order("used_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
  const totalSavings = usage.reduce((s: number, r: any) => s + Number(r.discount_amount || 0), 0);
  const uniqueCustomers = new Set(usage.map((r: any) => r.customer_id).filter(Boolean)).size;

  // Aggregate per campaign
  const perCampaign = campaigns.map((c: any) => {
    const rows = usage.filter((u: any) => u.campaign_id === c.id);
    const savings = rows.reduce((s: number, r: any) => s + Number(r.discount_amount || 0), 0);
    return { ...c, _uses: rows.length, _savings: savings };
  }).sort((a: any, b: any) => b._savings - a._savings);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><Megaphone className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">Campaigns Dashboard</h1>
          <p className="text-sm text-muted-foreground">Performance and usage analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Total Campaigns" value={totalCampaigns} icon={<Megaphone className="h-5 w-5" />} />
        <KPI title="Active" value={activeCampaigns} icon={<TrendingUp className="h-5 w-5" />} />
        <KPI title="Total Savings" value={formatCurrency(totalSavings)} icon={<Wallet className="h-5 w-5" />} />
        <KPI title="Customers Reached" value={uniqueCustomers} icon={<Users className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Top Performing Campaigns</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Uses</TableHead>
                <TableHead className="text-right">Savings Delivered</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Consumed %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perCampaign.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              ) : perCampaign.map((c: any) => {
                const consumedPct = c.campaign_budget ? Math.round((Number(c.consumed_budget) / Number(c.campaign_budget)) * 100) : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell><Link className="hover:underline" to={`/campaigns/${c.id}`}>{c.name}</Link></TableCell>
                    <TableCell><code className="text-xs">{c.code}</code></TableCell>
                    <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{c._uses}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c._savings)}</TableCell>
                    <TableCell className="text-right">{c.campaign_budget ? formatCurrency(Number(c.campaign_budget)) : "—"}</TableCell>
                    <TableCell className="text-right">{consumedPct !== null ? `${consumedPct}%` : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ title, value, icon }: { title: string; value: any; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}