import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

const JournalEntries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  // Fetch journal entries
  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ["journal_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Delete mutation (only for drafts)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: entry } = await supabase.from("journal_entries").select("status").eq("id", id).single();

      if (entry?.status !== "draft") {
        throw new Error("Only draft entries can be deleted. Posted entries must be reversed.");
      }

      const { error: lineError } = await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", id);
      if (lineError) console.error("Warning: Failed to delete journal lines", lineError);

      const { count, error: entryError } = await supabase
        .from("journal_entries")
        .delete({ count: "exact" })
        .eq("id", id);

      if (entryError) throw entryError;

      if (count === 0) {
        throw new Error("Deletion failed: Entry not found or already deleted.");
      }

      return id;
    },
    onSuccess: (deletedId) => {
      toast.success("Draft journal entry deleted successfully");
      queryClient.setQueryData(["journal_entries"], (oldData: any[] | undefined) => {
        if (oldData) return oldData.filter((entry: any) => entry.id !== deletedId);
        return [];
      });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Reverse mutation (for posted entries) - **ROBUST ERROR CHECKING APPLIED**
  const reverseMutation = useMutation({
    mutationFn: async (entry: any) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not authenticated");

      // 1. Get the original lines to reverse them
      const { data: originalLines, error: originalLinesError } = await supabase
        .from("journal_entry_lines")
        .select("*")
        .eq("journal_entry_id", entry.id);

      if (originalLinesError) {
        console.error("DB Error fetching original lines:", originalLinesError);
        throw new Error(`DB Error fetching original lines: ${originalLinesError.message}. Check RLS.`);
      }

      if (!originalLines || originalLines.length === 0) {
        throw new Error(
          "Cannot reverse: Original entry has no lines or lines could not be retrieved. Data integrity error.",
        );
      }

      // 2. Create reversal journal entry header details
      const reversalEntryId = crypto.randomUUID();
      const reversalNumber = `JE-REV-${entry.entry_number}-${reversalEntryId.substring(0, 4)}`;

      // 3. Create reversal lines (swap debit/credit)
      const reversalLines = originalLines.map((line: any) => ({
        id: crypto.randomUUID(),
        journal_entry_id: reversalEntryId,
        account_id: line.account_id,
        item_id: line.item_id,
        description: `Reversal of line ${line.line_number}: ${line.description}`,
        debit_amount: line.credit_amount, // SWAP
        credit_amount: line.debit_amount, // SWAP
        store_id: line.store_id,
        line_number: line.line_number,
      }));

      // 4. Insert reversal journal entry header
      const { error: entryError } = await supabase.from("journal_entries").insert([
        {
          id: reversalEntryId,
          entry_number: reversalNumber,
          entry_date: new Date().toISOString(),
          description: `Reversal of ${entry.entry_number}: ${entry.description}`,
          entry_type: "reversal",
          status: "posted", // Reversals should typically be posted immediately
          total_debit: entry.total_credit,
          total_credit: entry.total_debit,
          created_by: user.id,
          posted_by: user.id,
          posted_at: new Date().toISOString(),
          reference_id: entry.id,
        },
      ]);

      // *** CRITICAL FIX: Check entry insertion error ***
      if (entryError) {
        console.error("Failed to insert reversal entry:", entryError);
        throw new Error(
          `DB Error inserting reversal entry: ${entryError.message}. Check RLS for 'journal_entries' table.`,
        );
      }

      // 5. Insert reversal lines
      if (reversalLines && reversalLines.length > 0) {
        const { error: lineError } = await supabase.from("journal_entry_lines").insert(reversalLines);
        // *** CRITICAL FIX: Check lines insertion error ***
        if (lineError) {
          console.error("Failed to insert reversal lines:", lineError);
          throw new Error(
            `DB Error inserting reversal lines: ${lineError.message}. Check RLS for 'journal_entry_lines' table.`,
          );
        }
      }

      // 6. Mark original entry as reversed
      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({
          status: "reversed",
          reversed_at: new Date().toISOString(),
          reversed_by: user.id,
        })
        .eq("id", entry.id);

      // *** CRITICAL FIX: Check original entry update error ***
      if (updateError) {
        console.error("Failed to update original entry status:", updateError);
        throw new Error(
          `DB Error updating original entry status: ${updateError.message}. Check RLS for 'journal_entries' table.`,
        );
      }

      return reversalEntryId;
    },
    onSuccess: (reversalId) => {
      toast.success(`Journal entry reversed successfully. New Reversal ID: ${reversalId.substring(0, 8)}...`);
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
    onError: (err: any) => {
      // This will now catch and report database-level RLS failures explicitly
      toast.error(err.message || "Failed to reverse journal entry. Check console for RLS errors.");
    },
  });

  const handleDelete = (entry: any) => {
    if (entry.status !== "draft") {
      toast.error("Only draft entries can be deleted. Posted entries must be reversed.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete the draft entry #${entry.entry_number}?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  const handleReverse = (entry: any) => {
    if (entry.status !== "posted") {
      toast.error("Only POSTED entries can be reversed.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to reverse the posted entry #${entry.entry_number}? This will create a reversal entry.`,
      )
    ) {
      reverseMutation.mutate(entry);
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

  // Filtered list logic combining search and status filter
  const filteredEntries = journalEntries?.filter((entry: any) => {
    const matchesSearch =
      entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Journal Entries</h1>
        <Link to="/accounting/journal-entries/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search journal entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* STATUS FILTER */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
            {/* END STATUS FILTER */}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || deleteMutation.isPending || reverseMutation.isPending ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {deleteMutation.isPending
                      ? "Deleting..."
                      : reverseMutation.isPending
                        ? "Reversing..."
                        : "Loading..."}
                  </TableCell>
                </TableRow>
              ) : filteredEntries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No journal entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono font-semibold">{entry.entry_number}</TableCell>
                    <TableCell>{format(new Date(entry.entry_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.entry_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(entry.total_debit || 0, currency)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(entry.total_credit || 0, currency)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(entry.status) as any}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-1">
                      <Link to={`/accounting/journal-entries/${entry.id}`}>
                        <Button variant="ghost" size="icon" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>

                      {/* Edit - Only for drafts */}
                      {entry.status === "draft" && (
                        <Link to={`/accounting/journal-entries/${entry.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}

                      {/* Reverse - Only for posted entries */}
                      {entry.status === "posted" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reverse Entry"
                          onClick={() => handleReverse(entry)}
                          disabled={reverseMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 text-orange-500" />
                        </Button>
                      )}

                      {/* Delete - Only for drafts */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={entry.status === "draft" ? "Delete" : "Cannot delete posted entries"}
                        onClick={() => handleDelete(entry)}
                        disabled={deleteMutation.isPending || entry.status !== "draft"}
                      >
                        <Trash2 className={`w-4 h-4 ${entry.status === "draft" ? "text-red-500" : "text-gray-300"}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntries;
