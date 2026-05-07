import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCampaigns, useDeleteCampaign, useDuplicateCampaign, useUpsertCampaign, type Campaign } from "@/hooks/useCampaigns";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Plus, Search, Copy, Pencil, Trash2, Eye, Power, PowerOff, Megaphone } from "lucide-react";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/15 text-blue-500",
  active: "bg-green-500/15 text-green-500",
  paused: "bg-yellow-500/15 text-yellow-600",
  expired: "bg-red-500/15 text-red-500",
  cancelled: "bg-red-500/15 text-red-500",
};

export default function CampaignsList() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { isAdmin } = useIsAdmin();
  const del = useDeleteCampaign();
  const dup = useDuplicateCampaign();
  const upsert = useUpsertCampaign();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [campaigns, search, statusFilter, typeFilter]);

  const toggleActive = (c: Campaign) => {
    const next = c.status === "active" ? "paused" : "active";
    upsert.mutate({ id: c.id, status: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Megaphone className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-sm text-muted-foreground">Manage promotions and discount campaigns</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/campaigns/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Campaign
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or code…" value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="general">General Discount</SelectItem>
                <SelectItem value="seasonal">Seasonal Promotion</SelectItem>
                <SelectItem value="client_specific">Client Specific</SelectItem>
                <SelectItem value="category">Product Category</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="quantity_based">Quantity Based</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
                <SelectItem value="clearance">Clearance</SelectItem>
                <SelectItem value="special_approval">Special Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Used / Limit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No campaigns found</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link to={`/campaigns/${c.id}`} className="hover:underline">{c.name}</Link>
                  </TableCell>
                  <TableCell><code className="text-xs">{c.code}</code></TableCell>
                  <TableCell className="capitalize">{c.type.replace("_", " ")}</TableCell>
                  <TableCell><Badge className={statusColor[c.status] ?? ""} variant="secondary">{c.status}</Badge></TableCell>
                  <TableCell>
                    {c.discount_method === "percentage" ? `${c.discount_value}%` : c.discount_method === "fixed" ? c.discount_value.toLocaleString() : c.discount_method.replace("_", " ")}
                  </TableCell>
                  <TableCell>{c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{c.priority}</TableCell>
                  <TableCell>{c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/campaigns/${c.id}`)} title="View"><Eye className="h-4 w-4" /></Button>
                      {isAdmin && <>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/campaigns/${c.id}/edit`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => dup.mutate(c.id)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => toggleActive(c)} title={c.status === "active" ? "Pause" : "Activate"}>
                          {c.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove "{c.name}" and its rules.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>}
                    </div>
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
