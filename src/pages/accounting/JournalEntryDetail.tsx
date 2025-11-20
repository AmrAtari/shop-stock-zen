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

// Helper to determine badge variant based on status
const getStatusBadge = (status: string) => {
  switch (status) {
    case "posted":
      return "success";
    case "draft":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "default";
  }
};

// ⚠️ PLACEHOLDER: Replace this with your actual implementation that fetches the system's default currency symbol.
const useCurrencySymbol = () => "€";
// ------------------------------------------------------------------------------------------------------

const JournalEntryDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const currencySymbol = useCurrencySymbol(); // <-- NEW: Use the dynamic currency symbol

  // 1. Fetch Journal Entry with Correct Joins (Cleaned Template String)
  const { data: entry, isLoading: entryLoading } = useQuery({
    queryKey: ["journal_entry", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          `
          *,
          creator:user_profiles(username),
          poster:user_profiles(username)
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching journal entry:", error);
        throw error;
      }
      return data;
    },
  });

  // 2. Fetch Journal Lines with Account Joins (Cleaned Template String)
  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ["journal_lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_line_items")
        .select(
          `
          *,
          account:chart_of_accounts(account_code, account_name)
        `,
        )
        .eq("journal_entry_id", id)
        .order("line_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // 3. Mutation to post the entry
  const postMutation = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("Entry data is missing.");
      if (Math.abs((entry.total_debit || 0) - (entry.total_credit || 0)) > 0.01) {
        throw new Error("Cannot post an unbalanced entry.");
      }
      const { error } = await supabase.from("journal_entries").update({ status: "posted" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entry", id] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      toast.success(`Journal Entry ${entry?.entry_number} posted successfully.`);
    },
    onError: (error) => {
      toast.error(`Error posting journal entry: ${error.message}`);
    },
  });

  if (entryLoading || linesLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p>Loading...</p>
      </div>
    );
  }

  // Handle the RLS/Not Found error explicitly
  if (!entry) {
    return (
      <div className="space-y-6">
        <Link to="/accounting/journal-entries">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Journal Entries</span>
          </Button>
        </Link>
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Journal Entry Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This entry may not exist, or you may lack the necessary permissions (Row Level Security policy) to view
              it.
            </p>
            <p className="mt-2 text-sm text-red-500 font-mono">
              Please ensure your RLS SELECT policies on `journal_entries` and `user_profiles` are correctly set up. If
              policies are correct, check for foreign key data integrity issues.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link to="/accounting/journal-entries">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Entries</span>
          </Button>
        </Link>
        <div className="space-x-2">
          {entry.status === "draft" && (
            <>
              <Button
                variant="default"
                onClick={() => postMutation.mutate()}
                disabled={
                  postMutation.isPending || Math.abs((entry.total_debit || 0) - (entry.total_credit || 0)) > 0.01
                }
                className="bg-green-600 hover:bg-green-700 flex items-center"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Post Entry
              </Button>
              <Link to={`/accounting/journal-entries/${id}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-6 h-6" />
            <span>Journal Entry #{entry.entry_number}</span>
          </CardTitle>
          <Badge variant={getStatusBadge(entry.status)}>{entry.status}</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p>{format(new Date(entry.entry_date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Store</p>
              <p>{entry.store_id || "N/A"}</p> {/* Assuming store name is not joined here */}
            </div>
            <div>
              <p className="text-muted-foreground">Created By</p>
              <p>{entry.creator?.username || "Unknown"}</p>
            </div>
            {entry.status === "posted" && (
              <div>
                <p className="text-muted-foreground">Posted By</p>
                <p>{entry.poster?.username || "Unknown"}</p>
              </div>
            )}
            <div className="col-span-full">
              <p className="text-muted-foreground">Description</p>
              <p>{entry.description || "No description provided"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="max-w-md">Description</TableHead>
                <TableHead className="text-right w-[150px]">Debit</TableHead>
                <TableHead className="text-right w-[150px]">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No line items found for this entry.
                  </TableCell>
                </TableRow>
              ) : (
                lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono font-semibold">{line.account?.account_code}</TableCell>
                    <TableCell>{line.account?.account_name}</TableCell>
                    <TableCell className="max-w-md truncate">{line.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {/* 1. FIX: Use dynamic currencySymbol */}
                      {line.debit_amount > 0 ? `${currencySymbol}${line.debit_amount.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {/* 2. FIX: Use dynamic currencySymbol */}
                      {line.credit_amount > 0 ? `${currencySymbol}${line.credit_amount.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3} className="text-right">
                  Totals:
                </TableCell>
                {/* 3. FIX: Use dynamic currencySymbol in Total Debit */}
                <TableCell className="text-right font-mono">
                  {currencySymbol}
                  {entry?.total_debit?.toFixed(2) || "0.00"}
                </TableCell>
                {/* 4. FIX: Use dynamic currencySymbol in Total Credit */}
                <TableCell className="text-right font-mono">
                  {currencySymbol}
                  {entry?.total_credit?.toFixed(2) || "0.00"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryDetail;
