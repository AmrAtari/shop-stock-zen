import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

// Define interface for type safety
interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  entry_type: string;
  status: "draft" | "posted" | "reversed";
  total_debit: number;
  total_credit: number;
  // Note: These columns are aliases for the joined user_profiles table
  creator: { username: string } | null;
  poster: { username: string } | null;
  posted_at: string | null;
}

const JournalEntryDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  // 1. Fetch Journal Entry - REMOVED COMMENTS FROM SELECT STRING
  const { data: entry, isLoading: entryLoading } = useQuery<JournalEntry>({
    queryKey: ["journal_entry", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          `
          *,
          creator:user_profiles!created_by(username), 
          poster:user_profiles!posted_by(username)    
        `, // <-- CLEAN: No comments inside this template literal
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching journal entry:", error);
        throw error;
      }
      return data as JournalEntry;
    },
  });

  // 2. Fetch Journal Lines - REMOVED COMMENTS AND USED SINGULAR TABLE NAME
  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ["journal_line_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_line_item") // Corrected table name to singular
        .select(
          `
          *,
          account:chart_of_accounts(account_code, account_name) 
        `, // <-- CLEAN: No comments inside this template literal
        )
        .eq("journal_entry_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // 3. POSTING MUTATION (Preserved)
  const postMutation = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("Journal entry data not loaded.");

      if (entry.total_debit !== entry.total_credit) {
        throw new Error("Journal entry is unbalanced. Cannot post.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error("User not authenticated. Please log in to post entries.");
      }

      const postedById = user.id;

      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({
          status: "posted",
          posted_by: postedById,
          posted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      return id;
    },
    onSuccess: () => {
      toast.success(`Journal Entry #${entry?.entry_number} successfully posted!`);
      queryClient.invalidateQueries({ queryKey: ["journal_entry", id] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post journal entry.");
    },
  });

  // Helper function for status badges
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "secondary",
      posted: "default",
      reversed: "destructive",
    };
    return variants[status] || "default";
  };

  const isBalanced = entry && entry.total_debit === entry.total_credit;

  if (entryLoading) {
    return <div>Loading journal entry details...</div>;
  }

  // Improved error handling for RLS failure
  if (!entry) {
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Journal Entry Not Found</h1>
        <p className="text-muted-foreground">
          This entry may not exist, or you may lack the necessary permissions (Row Level Security policy) to view it.
        </p>
        <Link to="/accounting/journal-entries">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link to="/accounting/journal-entries">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </Link>
        <div className="flex gap-2">
          {entry.status === "draft" && (
            <Button
              onClick={() => postMutation.mutate()}
              disabled={postMutation.isPending || !isBalanced}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {postMutation.isPending ? "Posting..." : "Post Entry"}
            </Button>
          )}
          <Link to={`/accounting/journal-entries/${id}/edit`}>
            <Button variant="outline" disabled={entry.status !== "draft"}>
              <FileText className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle>Journal Entry #{entry.entry_number}</CardTitle>
            <p className="text-sm text-muted-foreground">Date: {format(new Date(entry.entry_date), "MMM dd, yyyy")}</p>
          </div>
          <Badge variant={getStatusBadge(entry.status) as any} className="text-lg py-1 px-3">
            {entry.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            <span className="font-semibold">Description:</span> {entry.description}
          </p>
          <p>
            <span className="font-semibold">Type:</span> {entry.entry_type}
          </p>

          <p>
            <span className="font-semibold">Created By:</span> {entry.creator?.username || "N/A"}
          </p>
          {entry.status === "posted" && (
            <p>
              <span className="font-semibold">Posted By:</span> {entry.poster?.username || "N/A"}
              <span className="ml-4 font-semibold">Posted At:</span>{" "}
              {entry.posted_at ? format(new Date(entry.posted_at), "MMM dd, yyyy h:mm a") : "N/A"}
            </p>
          )}
          {!isBalanced && entry.status === "draft" && (
            <div className="text-red-600 font-bold border-l-4 border-red-600 pl-3">
              Warning: Entry is Unbalanced! Debit: ${entry.total_debit.toFixed(2) || "0.00"}, Credit: $
              {entry.total_credit.toFixed(2) || "0.00"}. Balance Difference: $
              {Math.abs(entry.total_debit - entry.total_credit).toFixed(2)}.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entry Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="w-1/3">Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading lines...
                  </TableCell>
                </TableRow>
              ) : (
                lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono font-semibold">{line.account?.account_code}</TableCell>
                    <TableCell>{line.account?.account_name}</TableCell>
                    <TableCell className="max-w-md truncate">{line.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit_amount > 0 ? `$${line.debit_amount.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit_amount > 0 ? `$${line.credit_amount.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3} className="text-right">
                  Totals:
                </TableCell>
                <TableCell className="text-right font-mono">${entry.total_debit.toFixed(2) || "0.00"}</TableCell>
                <TableCell className="text-right font-mono">${entry.total_credit.toFixed(2) || "0.00"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryDetail;
