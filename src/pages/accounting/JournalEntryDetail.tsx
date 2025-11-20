import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEffect } from "react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

const JournalEntryDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  // *** CRITICAL AUTHENTICATION CHECK ***
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.warning("Please sign in to view this entry.");
        navigate("/auth");
      }
    });
  }, [navigate]);

  // 1. Fetch Journal Entry - DEBUG VERSION
  const {
    data: entry,
    isLoading: entryLoading,
    error: entryError,
  } = useQuery<any>({
    queryKey: ["journal_entry", id],
    queryFn: async () => {
      console.log("🔍 Fetching journal entry with ID:", id);

      // First, let's try a simple query without joins
      const { data: simpleData, error: simpleError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", id)
        .single();

      console.log("📊 Simple query result:", { simpleData, simpleError });

      if (simpleError) {
        console.error("❌ Simple query failed:", simpleError);
        throw simpleError;
      }

      if (!simpleData) {
        console.error("❌ No data returned from simple query");
        throw new Error("No journal entry found");
      }

      // Now try the full query with joins
      console.log("🔄 Trying full query with joins...");
      const { data: fullData, error: fullError } = await supabase
        .from("journal_entries")
        .select(
          `
          *,
          creator:user_profiles!created_by(username),
          poster:user_profiles!posted_by(username)
        `,
        )
        .eq("id", id)
        .single();

      console.log("📊 Full query result:", { fullData, fullError });

      if (fullError) {
        console.error("❌ Full query failed:", fullError);
        // But we have simpleData, so return that
        return simpleData;
      }

      return fullData || simpleData;
    },
    enabled: !!id,
  });

  // 2. Fetch Journal Lines - Using 'accounts'
  const {
    data: lines,
    isLoading: linesLoading,
    error: linesError,
  } = useQuery<any>({
    queryKey: ["journal_entry_lines", id],
    queryFn: async () => {
      console.log("🔍 Fetching journal lines for entry:", id);

      // CORRECTED: Use 'accounts' table for the join
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

      console.log("📊 Lines query result:", { data, error });

      if (error) {
        console.error("❌ Lines query failed:", error);
        throw error;
      }

      return data;
    },
    enabled: !!id && !!entry,
  });

  // Debug logging
  useEffect(() => {
    console.log("🔍 DEBUG INFO:", {
      entryId: id,
      entryData: entry,
      entryError: entryError,
      entryLoading: entryLoading,
      linesData: lines,
      linesError: linesError,
      linesLoading: linesLoading,
    });
  }, [id, entry, entryError, entryLoading, lines, linesError, linesLoading]);

  // 3. POSTING MUTATION - ENHANCED DEBUG VERSION
  const postMutation = useMutation({
    mutationFn: async () => {
      console.log("🔄 Starting post mutation...");

      if (entry?.total_debit !== entry?.total_credit) {
        console.error("❌ Entry is unbalanced:", {
          debit: entry?.total_debit,
          credit: entry?.total_credit,
        });
        throw new Error("Journal entry is unbalanced. Cannot post.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log("👤 Current user:", user?.id);
      console.log("📝 Entry created_by:", entry?.created_by);
      console.log("🔍 User matches creator:", user?.id === entry?.created_by);

      if (userError) {
        console.error("❌ User error:", userError);
        throw new Error("User not authenticated.");
      }

      if (!user?.id) {
        throw new Error("User not authenticated.");
      }

      console.log("📝 Updating journal entry status to 'posted'...");

      // Try a direct update first to see if it works
      const updateData = {
        status: "posted",
        posted_by: user.id,
        posted_at: new Date().toISOString(),
      };

      console.log("📤 Update data:", updateData);
      console.log("🎯 Update conditions:", {
        id: id,
        created_by: user.id,
        current_status: entry?.status,
      });

      const {
        data,
        error: updateError,
        count,
      } = await supabase
        .from("journal_entries")
        .update(updateData)
        .eq("id", id)
        .eq("created_by", user.id) // Add this to ensure RLS passes
        .select();

      console.log("📊 Update result:", {
        data,
        updateError,
        count,
        success: !updateError,
        rows_updated: data?.length,
      });

      if (updateError) {
        console.error("❌ Update failed:", updateError);
        console.error("❌ Update error details:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        throw updateError;
      }

      if (!data || data.length === 0) {
        console.error("❌ No rows updated - RLS likely blocked the update");
        console.error("❌ Possible reasons:");
        console.error("   - User ID doesn't match created_by");
        console.error("   - Entry is not in draft status");
        console.error("   - RLS policy is too restrictive");
        throw new Error("Update failed: No rows affected. Check RLS policies.");
      }

      console.log("✅ Successfully posted journal entry");
      console.log("✅ Updated entry:", data[0]);
      return id;
    },
    onSuccess: () => {
      console.log("🎉 Post mutation successful");
      toast.success(`Journal Entry #${entry?.entry_number} successfully posted!`);
      queryClient.invalidateQueries({ queryKey: ["journal_entry", id] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
    onError: (err: any) => {
      console.error("❌ Post mutation failed:", err);
      console.error("❌ Error details:", {
        message: err.message,
        code: err.code,
        details: err.details,
      });
      toast.error(err.message || "Failed to post journal entry.");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = { draft: "secondary", posted: "default", reversed: "destructive" };
    return variants[status] || "default";
  };
  const isBalanced = entry?.total_debit === entry?.total_credit;

  if (entryLoading || linesLoading) {
    return <div>Loading journal entry details...</div>;
  }

  // Show error details if available
  if (entryError) {
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Journal Entry</h1>
        <div className="text-left bg-red-50 p-4 rounded">
          <p className="font-semibold">Error Details:</p>
          <p className="text-sm">{entryError.message}</p>
          <p className="text-xs mt-2">Check the browser console for more details.</p>
        </div>
        <Link to="/accounting/journal-entries">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  // The final check after auth and RLS are assumed correct
  if (!entry) {
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Journal Entry Not Found</h1>
        <p className="text-muted-foreground">
          **Action Required:** The ID in the URL is likely invalid. Please check your database for a valid entry ID.
        </p>
        <p className="text-sm">Entry ID: {id}</p>
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
              onClick={() => {
                console.log("🎯 Post button clicked");
                console.log("📊 Current entry state:", {
                  id: entry.id,
                  status: entry.status,
                  created_by: entry.created_by,
                  total_debit: entry.total_debit,
                  total_credit: entry.total_credit,
                  isBalanced: isBalanced,
                });
                postMutation.mutate();
              }}
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
              Warning: Entry is Unbalanced! Debit: {formatCurrency(entry?.total_debit || 0, currency)}, Credit:{" "}
              {formatCurrency(entry?.total_credit || 0, currency)}. Balance Difference:{" "}
              {formatCurrency(Math.abs(entry.total_debit - entry.total_credit), currency)}.
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
              ) : linesError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-red-600">
                    Error loading lines: {linesError.message}
                  </TableCell>
                </TableRow>
              ) : lines?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No lines found for this entry
                  </TableCell>
                </TableRow>
              ) : (
                lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono font-semibold">{line.account?.account_code || "N/A"}</TableCell>
                    <TableCell>{line.account?.account_name || "N/A"}</TableCell>
                    <TableCell className="max-w-md truncate">{line.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit_amount > 0 ? formatCurrency(line.debit_amount, currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit_amount > 0 ? formatCurrency(line.credit_amount, currency) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3} className="text-right">
                  Totals:
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(entry?.total_debit || 0, currency)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(entry?.total_credit || 0, currency)}
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
