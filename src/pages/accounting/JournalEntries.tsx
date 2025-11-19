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

const JournalEntries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

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

  // Mutation for deletion
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Journal entry deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error deleting journal entry");
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this journal entry?")) {
      deleteMutation.mutate(id);
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

  const filteredEntries = journalEntries?.filter(
    (entry: any) =>
      entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search journal entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
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
              {isLoading || deleteMutation.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {deleteMutation.isLoading ? "Deleting..." : "Loading..."}
                  </TableCell>
                </TableRow>
              ) : filteredEntries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No journal entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries?.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono font-semibold">{entry.entry_number}</TableCell>
                    <TableCell>{format(new Date(entry.entry_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.entry_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">${entry.total_debit?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell className="font-mono">${entry.total_credit?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(entry.status) as any}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-1">
                      <Link to={`/accounting/journal-entries/${entry.id}`}>
                        <Button variant="ghost" size="icon" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/accounting/journal-entries/${entry.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteMutation.isLoading}
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
