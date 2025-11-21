import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

// Define Interfaces for clarity
interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

interface JournalLine {
  temp_id: string; // Used for client-side keying and manipulation
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

// Initial state for a single empty journal line
const initialLine: JournalLine = {
  temp_id: crypto.randomUUID(),
  account_id: "",
  description: "",
  debit_amount: 0,
  credit_amount: 0,
};

const JournalEntryNew = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  // State for the entire entry
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    initialLine,
    { ...initialLine, temp_id: crypto.randomUUID() },
  ]);

  // Fetch all accounts for line selection
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name")
        .eq("is_active", true)
        .order("account_code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate Totals and Balance Status
  const { totalDebit, totalCredit, isBalanced, balanceDifference } = useMemo(() => {
    const debit = journalLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const credit = journalLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    const balanced = debit === credit && debit > 0;
    const difference = Math.abs(debit - credit);
    return {
      totalDebit: debit,
      totalCredit: credit,
      isBalanced: balanced,
      balanceDifference: difference,
    };
  }, [journalLines]);

  // Handlers for dynamic line management
  const handleLineChange = (temp_id: string, field: keyof JournalLine, value: any) => {
    setJournalLines((prevLines) =>
      prevLines.map((line) => {
        if (line.temp_id === temp_id) {
          const newLine = { ...line, [field]: value };
          // Enforce only Debit OR Credit has a value
          if (field === "debit_amount") {
            newLine.credit_amount = 0;
          } else if (field === "credit_amount") {
            newLine.debit_amount = 0;
          }
          // Ensure amounts are treated as numbers
          if (field === "debit_amount" || field === "credit_amount") {
            newLine[field] = parseFloat(value) || 0;
          }
          return newLine;
        }
        return line;
      }),
    );
  };

  const handleAddLine = () => {
    setJournalLines((prevLines) => [...prevLines, { ...initialLine, temp_id: crypto.randomUUID() }]);
  };

  const handleRemoveLine = (temp_id: string) => {
    if (journalLines.length <= 2) {
      toast.error("A journal entry must have at least two lines.");
      return;
    }
    setJournalLines((prevLines) => prevLines.filter((line) => line.temp_id !== temp_id));
  };

  // Save Journal Entry mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isBalanced) {
        throw new Error("Entry must be balanced (Total Debit must equal Total Credit) to be saved.");
      }
      if (totalDebit === 0) {
        throw new Error("Journal entry total cannot be zero.");
      }

      // Filter out empty lines/lines without account IDs before saving
      const validLines = journalLines.filter(
        (line) => line.account_id && (line.debit_amount > 0 || line.credit_amount > 0),
      );
      if (validLines.length < 2) {
        throw new Error("Journal entry must have at least two valid lines (one debit, one credit).");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("User session expired. Please log in again.");
      }
      const currentUserId = userData.user.id;
      const journalEntryId = crypto.randomUUID();
      const entryNumber = `JE-${Date.now().toString().slice(-6)}`;

      // 1. Insert Journal Entry Header
      const { error: entryError } = await supabase.from("journal_entries").insert([
        {
          id: journalEntryId,
          entry_number: entryNumber,
          entry_date: new Date(entryDate).toISOString(),
          description: description || `Manual journal entry created on ${format(new Date(), "MMM dd")}`,
          entry_type: "manual",
          status: "draft",
          total_debit: totalDebit,
          total_credit: totalCredit,
          created_by: currentUserId,
        },
      ]);
      if (entryError) throw entryError;

      // 2. Prepare and Insert Journal Lines
      const linesToInsert = validLines.map((line, index) => ({
        journal_entry_id: journalEntryId,
        line_number: index + 1,
        account_id: line.account_id,
        description: line.description || accounts?.find((a) => a.id === line.account_id)?.account_name || "",
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
        // item_id and store_id are typically null for general manual entries, unless specified
        item_id: null,
        store_id: null,
      }));

      const { error: lineError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
      if (lineError) throw lineError;

      return journalEntryId;
    },
    onSuccess: (newEntryId) => {
      toast.success("Journal entry saved successfully as a Draft");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      navigate(`/accounting/journal-entries/${newEntryId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Error saving journal entry");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate("/accounting/journal-entries")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
        <h1 className="text-3xl font-bold">New Manual Journal Entry</h1>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !isBalanced || totalDebit === 0}
        >
          {saveMutation.isPending ? "Saving..." : "Save Draft Entry"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Entry Date</Label>
              <Input id="date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="type">Entry Type</Label>
              <Input id="type" value="Manual" disabled className="bg-muted/30" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a detailed description of this journal entry (e.g., Recording month-end depreciation)."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Entry Lines</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddLine} disabled={accountsLoading}>
            <Plus className="w-4 h-4 mr-2" />
            Add Line
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Account</TableHead>
                  <TableHead className="w-[35%]">Line Description</TableHead>
                  <TableHead className="w-[15%] text-right">Debit</TableHead>
                  <TableHead className="w-[15%] text-right">Credit</TableHead>
                  <TableHead className="w-[5%] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : (
                  journalLines.map((line) => (
                    <TableRow key={line.temp_id}>
                      <TableCell>
                        <Select
                          value={line.account_id}
                          onValueChange={(value) => handleLineChange(line.temp_id, "account_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {`${account.account_code} - ${account.account_name}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => handleLineChange(line.temp_id, "description", e.target.value)}
                          placeholder="Optional line description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.debit_amount > 0 ? line.debit_amount : ""}
                          onChange={(e) => handleLineChange(line.temp_id, "debit_amount", e.target.value)}
                          min="0"
                          placeholder="0.00"
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.credit_amount > 0 ? line.credit_amount : ""}
                          onChange={(e) => handleLineChange(line.temp_id, "credit_amount", e.target.value)}
                          min="0"
                          placeholder="0.00"
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(line.temp_id)}
                          title="Remove Line"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* Totals Row */}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2} className="text-right">
                    TOTALS:
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg">{formatCurrency(totalDebit, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {formatCurrency(totalCredit, currency)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Balance Warning/Status */}
      <Card>
        <CardContent className="pt-6">
          {!isBalanced ? (
            <div className="text-red-600 font-bold border-l-4 border-red-600 pl-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>
                **UNBALANCED:** Cannot save entry. Debit and Credit must match. Difference:{" "}
                {formatCurrency(balanceDifference, currency)}.
              </p>
            </div>
          ) : (
            <div className="text-green-600 font-bold border-l-4 border-green-600 pl-3">
              <p>**BALANCED:** Total Debit equals Total Credit. Ready to save as Draft.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
