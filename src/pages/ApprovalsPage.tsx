import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Clock, ShoppingCart, Truck, Eye } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePendingApprovals, useApprovalActions, type PendingApproval } from "@/hooks/useApprovals";
import { format } from "date-fns";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

const ApprovalsPage = () => {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: pending = [], isLoading } = usePendingApprovals();
  const { approvePO, rejectPO, approveTransfer, rejectTransfer } = useApprovalActions();
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (roleLoading) {
    return <div className="p-8"><Skeleton className="h-32 w-full" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Only administrators can review approvals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pos = pending.filter((p): p is Extract<PendingApproval, { kind: "po" }> => p.kind === "po");
  const transfers = pending.filter((p): p is Extract<PendingApproval, { kind: "transfer" }> => p.kind === "transfer");

  const submitReject = () => {
    if (!rejectTarget) return;
    if (rejectTarget.kind === "po") {
      rejectPO.mutate({ poDbId: rejectTarget.id, reason: rejectReason });
    } else {
      rejectTransfer.mutate({ transferId: rejectTarget.id, reason: rejectReason });
    }
    setRejectTarget(null);
    setRejectReason("");
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Clock className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground">Review purchase orders and transfers awaiting your decision.</p>
        </div>
        <Badge variant="secondary" className="ml-auto text-base">{pending.length} pending</Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({pending.length})</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders ({pos.length})</TabsTrigger>
          <TabsTrigger value="transfer">Transfers ({transfers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : pending.length === 0 ? (
            <EmptyState />
          ) : (
            pending.map((p) => (
              <ApprovalRow
                key={`${p.kind}-${p.id}`}
                item={p}
                currency={currency}
                onApprove={() =>
                  p.kind === "po" ? approvePO.mutate(p.id) : approveTransfer.mutate(p.id)
                }
                onReject={() => setRejectTarget(p)}
                onView={() =>
                  p.kind === "po" ? navigate(`/purchase-orders/${p.id}`) : navigate(`/transfers/${p.id}`)
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="po" className="space-y-3 mt-4">
          {pos.length === 0 ? <EmptyState /> : pos.map((p) => (
            <ApprovalRow
              key={`po-${p.id}`}
              item={p}
              currency={currency}
              onApprove={() => approvePO.mutate(p.id)}
              onReject={() => setRejectTarget(p)}
              onView={() => navigate(`/purchase-orders/${p.id}`)}
            />
          ))}
        </TabsContent>

        <TabsContent value="transfer" className="space-y-3 mt-4">
          {transfers.length === 0 ? <EmptyState /> : transfers.map((t) => (
            <ApprovalRow
              key={`transfer-${t.id}`}
              item={t}
              currency={currency}
              onApprove={() => approveTransfer.mutate(t.id)}
              onReject={() => setRejectTarget(t)}
              onView={() => navigate(`/transfers/${t.id}`)}
            />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.kind === "po" ? "Purchase Order" : "Transfer"} {rejectTarget?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this is being rejected..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyState = () => (
  <Card>
    <CardContent className="py-12 text-center space-y-3">
      <Check className="w-10 h-10 text-green-500 mx-auto" />
      <CardTitle>All clear</CardTitle>
      <p className="text-muted-foreground">No pending items right now.</p>
    </CardContent>
  </Card>
);

const ApprovalRow = ({
  item,
  currency,
  onApprove,
  onReject,
  onView,
}: {
  item: PendingApproval;
  currency: string;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) => {
  const isPO = item.kind === "po";
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isPO ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
            {isPO ? <ShoppingCart className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{item.number}</h3>
              <Badge variant="outline">{isPO ? "Purchase Order" : "Transfer"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPO
                ? `→ ${item.store_name || "Unknown store"} · ${item.total_items ?? 0} items · ${formatCurrency(item.total_cost || 0, currency)}`
                : `${item.from_store_name || "?"} → ${item.to_store_name || "?"} · ${item.total_items ?? 0} items`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {item.submitted_at ? format(new Date(item.submitted_at), "PPp") : "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onApprove}>
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={onReject}>
            <X className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalsPage;
