import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. CRITICAL: Force Delete associated lines first. This is required
      //    since the database ON DELETE CASCADE is not reliably working for you.
      const { error: lineError } = await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", id);

      if (lineError) {
        // Do not throw here unless absolutely necessary; let the main delete attempt proceed.
        console.error("Warning: Failed to delete journal lines before main entry.", lineError);
      }

      // 2. Delete the main journal entry and explicitly check the row count
      const { count, error: entryError } = await supabase
        .from("journal_entries")
        .delete({ count: "exact" }) // Crucial for catching silent RLS failures
        .eq("id", id);

      if (entryError) {
        throw entryError;
      }

      // 3. ULTIMATE CHECK: If 0 rows were deleted, the delete failed silently (e.g., RLS denied access)
      if (count === 0) {
        // Throw a specific error if the status is 'draft', suggesting an RLS failure
        const entryToDelete = journalEntries?.find((e) => e.id === id);

        if (entryToDelete && entryToDelete.status === "draft") {
          throw new Error(
            "Deletion failed: Could not find or delete the entry. Check your Row Level Security (RLS) policy for the 'journal_entries' table. Ensure you are the 'created_by' user.",
          );
        } else {
          throw new Error(`Deletion failed: Entry was not found or already deleted.`);
        }
      }

      return id;
    },
    onSuccess: (deletedId) => {
      toast.success("Journal entry permanently deleted successfully");

      // Manual cache update: Instantly removes the item from the list UI
      queryClient.setQueryData(["journal_entries"], (oldData: any[] | undefined) => {
        if (oldData) {
          return oldData.filter((entry: any) => entry.id !== deletedId);
        }
        return [];
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "An unknown error occurred during deletion.");
    },
  });

  const handleDelete = (entry: any) => {
    // Only allow deletion of drafts
    if (entry.status !== "draft") {
      toast.error("Only draft entries can be deleted.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete the draft entry #${entry.entry_number}?`)) {
      deleteMutation.mutate(entry.id);
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
              {isLoading || deleteMutation.isPending ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {deleteMutation.isPending ? "Deleting..." : "Loading..."}
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
                      {/* Only allow editing of drafts */}
                      {entry.status === "draft" && (
                        <Link to={`/accounting/journal-entries/${entry.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDelete(entry)}
                        disabled={deleteMutation.isPending || entry.status !== "draft"}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
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
