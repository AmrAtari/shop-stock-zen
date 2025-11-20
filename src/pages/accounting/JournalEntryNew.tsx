import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2 } from "lucide-react"; // <-- FIXED: Missing import

// ⚠️ PLACEHOLDER: Replace this with your actual implementation that fetches the system's default currency symbol.
const useCurrencySymbol = () => "$";
// ------------------------------------------------------------------------------------------------------

interface Store {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  cost: number;
}

interface JournalLine {
  id: string;
  account_id: string;
  item_id: string | null;
  description: string;
  debit_amount: number;
  credit_amount: number;
  store_id: string;
  line_number: number;
  journal_entry_id?: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

const JournalEntryNew = () => {
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const currencySymbol = useCurrencySymbol();

  // Fetch stores
  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch chart of accounts (simplified)
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("id, account_code, account_name");
      if (error) throw error;
      return data;
    },
    // FIXED: Corrected useQuery syntax for staleTime
    staleTime: 1000 * 60 * 5,
  });

  // Fetch inventory items (simplified)
  const { data: items } = useQuery<InventoryItem[]>({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("id, sku, name, cost");
      if (error) throw error;
      return data;
    },
    // FIXED: Corrected useQuery syntax for staleTime
    staleTime: 1000 * 60 * 5,
  });

  // Calculate totals and expected balancing entry
  const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredit = journalLines.reduce((sum, line) => sum + line.credit_amount, 0);
  const difference = totalDebit - totalCredit;

  const totalDebitDisplay = difference >= 0 ? totalDebit : totalCredit;
  const expectedTotalCreditDisplay = difference >= 0 ? totalDebit : totalCredit;
  const isBalanced = Math.abs(difference) < 0.01; // Allow for floating point precision

  // Helper to find account name
  const getAccountName = (accountId: string) => {
    return accounts?.find((a) => a.id === accountId)?.account_name || "Unknown Account";
  };

  // Helper to find item details
  const getItemDetails = (itemId: string | null) => {
    if (!itemId) return "N/A";
    const item = items?.find((i) => i.id === itemId);
    return item ? `${item.sku} - ${item.name}` : "Unknown Item";
  };

  // Add a new empty line to the journal entry
  const addJournalLine = () => {
    setJournalLines((prevLines) => [
      ...prevLines,
      {
        id: `temp-${Date.now()}`,
        account_id: accounts ? accounts[0].id : "",
        item_id: null,
        description: "",
        debit_amount: 0,
        credit_amount: 0,
        store_id: selectedStore,
        line_number: prevLines.length + 1,
      },
    ]);
  };

  // Update a journal line field
  const updateJournalLine = (index: number, field: keyof JournalLine, value: any) => {
    setJournalLines((prevLines) => {
      const newLines = [...prevLines];
      newLines[index] = { ...newLines[index], [field]: value };
      return newLines;
    });
  };

  // Remove a journal line
  const removeJournalLine = (id: string) => {
    setJournalLines((prevLines) => prevLines.filter((line) => line.id !== id));
  };

  // Mutation to create a new journal entry
  const createMutation = useMutation({
    mutationFn: async (newEntryData: any) => {
      const { data, error } = await supabase.from("journal_entries").insert(newEntryData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      toast.success("Journal Entry successfully created.");
      // Reset form state after successful creation
      setJournalLines([]);
      setSelectedStore("");
    },
    onError: (error) => {
      toast.error(`Error creating journal entry: ${error.message}`);
    },
  });

  const handleSubmit = (status: "draft" | "posted") => {
    if (!selectedStore) {
      toast.error("Please select a store before submitting.");
      return;
    }

    if (journalLines.length === 0) {
      toast.error("Journal entry must have at least one line item.");
      return;
    }

    if (status === "posted" && !isBalanced) {
      toast.error("Journal entry must be balanced to be posted.");
      return;
    }

    const totalDebitToPost = totalDebitDisplay;
    const totalCreditToPost = expectedTotalCreditDisplay;

    // Prepare line items for submission
    let linesToSubmit = journalLines.map((line) => ({
      ...line,
      id: undefined, // Remove temporary ID
      journal_entry_id: undefined, // Will be set by database trigger/foreign key
      debit_amount: parseFloat(line.debit_amount.toFixed(2)),
      credit_amount: parseFloat(line.credit_amount.toFixed(2)),
      store_id: selectedStore,
    }));

    // Add the automatic balancing entry if necessary and status is draft
    // Note: Balancing entry is typically handled by database procedures or later stages.
    // For simplicity, we assume the user ensures balance or status remains draft.

    const newEntry = {
      entry_date: format(new Date(), "yyyy-MM-dd"), // Use current date for simplicity
      description: "Manual Journal Entry", // User should input this
      status: status,
      store_id: selectedStore,
      total_debit: parseFloat(totalDebitToPost.toFixed(2)),
      total_credit: parseFloat(totalCreditToPost.toFixed(2)),
      line_items: linesToSubmit, // Assuming the backend handles nested inserts
    };

    createMutation.mutate(newEntry);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">New Journal Entry</h1>
        <div className="space-x-2">
          <Button
            onClick={() => handleSubmit("draft")}
            disabled={createMutation.isPending || journalLines.length === 0}
            variant="outline"
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit("posted")}
            disabled={createMutation.isPending || !isBalanced}
            className="bg-green-600 hover:bg-green-700"
          >
            Post Entry
          </Button>
        </div>
      </div>

      {/* Entry Details Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Entry Details</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Store / Location</label>
            <Select onValueChange={setSelectedStore} value={selectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="Select Store" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entry Date</label>
            <Input type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} disabled />
          </div>
          {/* Add fields for description, reference number, etc. */}
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Line Items</h2>
          <Button onClick={addJournalLine} variant="outline" size="sm" disabled={!selectedStore}>
            Add Line
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[200px]">Account</TableHead>
                  <TableHead className="w-[150px]">Item (Optional)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[120px]">Debit</TableHead>
                  <TableHead className="text-right w-[120px]">Credit</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.map((line, index) => (
                  <TableRow key={line.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Select
                        value={line.account_id}
                        onValueChange={(value) => updateJournalLine(index, "account_id", value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.item_id || ""}
                        onValueChange={(value) => updateJournalLine(index, "item_id", value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">N/A</SelectItem>
                          {items?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.sku}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateJournalLine(index, "description", e.target.value)}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={line.debit_amount}
                        onChange={(e) => updateJournalLine(index, "debit_amount", parseFloat(e.target.value) || 0)}
                        className="text-right font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={line.credit_amount}
                        onChange={(e) => updateJournalLine(index, "credit_amount", parseFloat(e.target.value) || 0)}
                        className="text-right font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeJournalLine(line.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Summary and Balance Check</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Account / Description</TableHead>
                  <TableHead className="text-right w-[120px]">Debit</TableHead>
                  <TableHead className="text-right w-[120px]">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No line items added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {journalLines.map((line, index) => (
                      <TableRow key={line.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <p>{getAccountName(line.account_id)}</p>
                          <p className="text-xs text-muted-foreground max-w-sm truncate">{line.description}</p>
                        </TableCell>
                        {/* FIXED: Use currencySymbol */}
                        <TableCell className="font-mono">
                          {currencySymbol}
                          {line.debit_amount.toFixed(2)}
                        </TableCell>
                        {/* FIXED: Use currencySymbol */}
                        <TableCell className="font-mono">
                          {currencySymbol}
                          {line.credit_amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* FIXED: Use currencySymbol in Balancing Entry (if applicable) */}
                    {totalDebitDisplay > 0 && (
                      <TableRow className="bg-green-50/50">
                        <TableCell>{journalLines.length + 1}</TableCell>
                        <TableCell className="italic">Balancing Entry (Retained Earnings)</TableCell>
                        <TableCell className="font-mono">{currencySymbol}0.00</TableCell>
                        <TableCell className="font-mono">
                          {currencySymbol}
                          {expectedTotalCreditDisplay.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
                <TableRow className={`font-bold ${isBalanced ? "bg-green-100/50" : "bg-red-100/50"}`}>
                  <TableCell colSpan={2} className="text-right">
                    Total Debit/Credit:
                  </TableCell>
                  {/* FIXED: Use currencySymbol in Total Debit */}
                  <TableCell className="font-mono">
                    {currencySymbol}
                    {totalDebitDisplay.toFixed(2)}
                  </TableCell>
                  {/* FIXED: Use currencySymbol in Total Credit */}
                  <TableCell className="font-mono">
                    {currencySymbol}
                    {expectedTotalCreditDisplay.toFixed(2)}
                  </TableCell>
                </TableRow>
                {!isBalanced && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center font-semibold text-red-600">
                      Unbalanced by: {currencySymbol}
                      {Math.abs(difference).toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
