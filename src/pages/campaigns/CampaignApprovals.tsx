import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ShieldCheck } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { toast } from "sonner";

export default function CampaignApprovals() {
  const { isAdmin } = useIsAdmin();
  const { formatCurrency } = useSystemSettings();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["discount_approvals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("discount_approvals")
        .select("*, campaign:campaigns(name,code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("discount_approvals")
        .update({ status, approved_by: u?.user?.id ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["discount_approvals"] });
      toast.success(`Discount ${vars.status}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><ShieldCheck className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">Discount Approvals</h1>
          <p className="text-sm text-muted-foreground">Review and approve discounts that require manager sign-off</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Pending & Recent</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No approval requests</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.campaign?.name ?? "—"} <code className="text-xs text-muted-foreground ml-1">{r.campaign?.code}</code></TableCell>
                  <TableCell className="capitalize">{r.source_type}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.original_amount || 0))}</TableCell>
                  <TableCell className="text-right">-{formatCurrency(Number(r.discount_amount || 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.final_amount || 0))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && r.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="default" disabled={decide.isPending}
                          onClick={() => decide.mutate({ id: r.id, status: "approved" })}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" disabled={decide.isPending}
                          onClick={() => decide.mutate({ id: r.id, status: "rejected" })}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}