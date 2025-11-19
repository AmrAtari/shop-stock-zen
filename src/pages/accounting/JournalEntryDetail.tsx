// This is the updated JournalEntryDetail (1).tsx with fixes

import { useParams, Link, useNavigate } from "react-router-dom"; // Added useNavigate
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckCheck, Trash2 } from "lucide-react"; // Added CheckCheck, Trash2
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added useMutation, useQueryClient
import { format } from "date-fns";
import { toast } from "sonner";

const JournalEntryDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: entry, isLoading: entryLoading } = useQuery({
    queryKey: ["journal_entry", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("*").eq("id", id).single();

      if (error) throw error;
      return data;
    },
  });

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ["journal_entry_lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(
          `
          *,
          account:accounts(account_code, account_name)
        `,
        )
        .eq("journal_entry_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Mutation to post the journal entry
  const postEntryMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Journal Entry ID is missing.");

      const { error } = await supabase
        .from("journal_entries")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          posted_by: "system_user", // Placeholder - replace with actual user ID
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Journal Entry has been posted successfully.");
      // Invalidate both detail and list views to update status
      queryClient.invalidateQueries({ queryKey: ["journal_entry", id] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post journal entry.");
    },
  });

  // Mutation to delete the journal entry
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Journal Entry ID is missing.");

      // 1. Delete associated lines first (CRITICAL)
      const { error: lineError } = await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", id);
      if (lineError) throw lineError;

      // 2. Delete the main journal entry
      const { error: entryError } = await supabase.from("journal_entries").delete().eq("id", id);
      if (entryError) throw entryError;

      return id; // Return the deleted ID
    },
    onSuccess: (deletedId) => {
      toast.success("Journal Entry deleted successfully.");

      // MANUAL CACHE UPDATE: Filter the deleted item out of the list cache
      queryClient.setQueryData(["journal_entries"], (oldData: any[] | undefined) => {
        if (oldData) {
          return oldData.filter((entry: any) => entry.id !== deletedId);
        }
        return [];
      });

      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      navigate("/accounting/journal-entries"); // Redirect after successful deletion
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete journal entry.");
    },
  });

  const handleDelete = () => {
    if (entry?.status !== "draft") {
      toast.error("Only draft entries can be deleted.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete the draft entry #${entry.entry_number}?`)) {
      deleteMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "secondary",
      posted: "default",
      reversed: "destructive",
    };
    return variants[status] || "default";
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      manual: "outline",
      pos_sale: "default",
      purchase_order: "secondary",
      inventory_adjustment: "outline",
    };
    return variants[type] || "outline";
  };

  if (entryLoading || linesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{entry?.entry_number}</h1>
            <p className="text-muted-foreground">{entry?.description}</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2">
          {/* POST & DELETE BUTTONS (Only visible if status is draft) */}
          {entry?.status === "draft" && (
            <>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                title="Delete Draft Entry"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? "Deleting..." : "Delete Draft"}
              </Button>
              <Button onClick={() => postEntryMutation.mutate()} disabled={postEntryMutation.isPending}>
                <CheckCheck className="w-4 h-4 mr-2" />
                {postEntryMutation.isPending ? "Posting..." : "Post Entry"}
              </Button>
            </>
          )}

          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Print Entry
          </Button>
        </div>
        {/* END ACTION BUTTONS */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold">
                {entry?.entry_date ? format(new Date(entry.entry_date), "MMM dd, yyyy") : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={getStatusBadge(entry?.status || "") as any}>{entry?.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant={getTypeBadge(entry?.entry_type || "") as any}>
                {entry?.entry_type?.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Reference Type</p>
              <p className="font-semibold">{entry?.reference_type || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reference ID</p>
              <p className="font-mono text-xs">{entry?.reference_id || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Debit</p>
              <p className="font-semibold text-lg">${entry?.total_debit?.toFixed(2) || "0.00"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Credit</p>
              <p className="font-semibold text-lg">${entry?.total_credit?.toFixed(2) || "0.00"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p
                className={`font-semibold ${
                  Math.abs((entry?.total_debit || 0) - (entry?.total_credit || 0)) < 0.01
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                ${Math.abs((entry?.total_debit || 0) - (entry?.total_credit || 0)).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines?.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono font-semibold">{line.account?.account_code}</TableCell>
                  <TableCell>{line.account?.account_name}</TableCell>
                  <TableCell className="max-w-md truncate">{line.description}</TableCell>
                  <TableCell className="text-right font-mono">
                    {/* FIX: Using line.debit_amount instead of line.debit */}
                    {line.debit_amount > 0 ? `$${line.debit_amount.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {/* FIX: Using line.credit_amount instead of line.credit */}
                    {line.credit_amount > 0 ? `$${line.credit_amount.toFixed(2)}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3} className="text-right">
                  Totals:
                </TableCell>
                <TableCell className="text-right font-mono">${entry?.total_debit?.toFixed(2) || "0.00"}</TableCell>
                <TableCell className="text-right font-mono">${entry?.total_credit?.toFixed(2) || "0.00"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryDetail;
