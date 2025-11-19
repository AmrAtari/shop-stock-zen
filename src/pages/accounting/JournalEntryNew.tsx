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

// FIX: Added journal_entry_id to the interface
interface JournalLine {
  id: string;
  account_id: string;
  item_id: string | null;
  description: string;
  debit_amount: number;
  credit_amount: number;
  store_id: string;
  line_number: number;
  journal_entry_id?: string; // Made optional as it's added during the save mutation
}

const JournalEntryNew = () => {
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch stores
  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Save Journal Entry mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore || journalLines.length === 0) throw new Error("No store selected or no items generated");

      // 1. Find Inventory Asset account
      const { data: inventoryAccount } = await supabase
        .from("accounts")
        .select("*")
        .ilike("account_name", `%Inventory%`)
        .eq("is_active", true)
        .maybeSingle();

      if (!inventoryAccount)
        throw new Error("Inventory Asset account not found (Search for 'Inventory' in active accounts)");

      // 2. Find Retained Earnings account (for balancing entry)
      const { data: retainedAccount } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_name", "Retained Earnings")
        .maybeSingle();

      if (!retainedAccount) throw new Error("Retained Earnings account not found");

      const journalEntryId = crypto.randomUUID();
      const entryNumber = `JE-${Date.now()}`;
      const entryDate = new Date().toISOString();

      const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);

      // If the current lines are unbalanced (only debits generated), the total debit will be the amount to credit.
      const amountToCredit = totalDebit;

      // Check for zero balance if no inventory items were generated
      if (amountToCredit === 0) throw new Error("Journal entry total is $0.00. Cannot save empty entry.");

      // Insert journal entry
      const { error: entryError } = await supabase.from("journal_entries").insert([
        {
          id: journalEntryId,
          entry_number: entryNumber,
          entry_date: entryDate,
          description: `Opening Stock for ${stores?.find((s) => s.id === selectedStore)?.name}`,
          entry_type: "manual",
          status: "draft",
          // The total debit and credit must be equal for a balanced entry
          total_debit: totalDebit,
          total_credit: amountToCredit,
        },
      ]);
      if (entryError) throw entryError;

      // Prepare journal lines (debit lines for inventory)
      const debitLinesToInsert = journalLines.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntryId, // Now correctly typed and assigned
        line_number: index + 1,
        account_id: inventoryAccount.id, // Set the Inventory Asset account ID
      }));

      // Create the single balancing credit line (to Retained Earnings)
      // Note: We cast this object to 'any' for insertion since it matches the table schema,
      // even if the TS interface slightly differs for the state handling (like journal_entry_id being optional).
      const creditLineToInsert: any = {
        id: crypto.randomUUID(),
        journal_entry_id: journalEntryId,
        line_number: debitLinesToInsert.length + 1,
        account_id: retainedAccount.id, // Set the Retained Earnings account ID
        item_id: null, // No specific item for the balancing entry
        description: "Balancing entry for Opening Stock",
        debit_amount: 0,
        credit_amount: amountToCredit, // Credit the total amount
        store_id: selectedStore,
      };

      const linesToInsert = [...debitLinesToInsert, creditLineToInsert];

      // Insert journal lines
      const { error: lineError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
      if (lineError) throw lineError;

      return journalEntryId;
    },
    onSuccess: () => {
      toast.success("Journal entry saved successfully");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setJournalLines([]);
      setSelectedStore(""); // Reset state after successful save
    },
    onError: (err: any) => {
      toast.error(err.message || "Error saving journal entry");
    },
  });

  // Generate Opening Stock
  const handleGenerate = async () => {
    if (!selectedStore) return toast.error("Please select a store");
    setIsGenerating(true);

    try {
      const { data: inventoryItems } = await supabase
        .from("store_inventory")
        .select("item_id, quantity, items(sku, name, cost)")
        .eq("store_id", selectedStore);

      if (!inventoryItems || inventoryItems.length === 0) {
        toast.error("No inventory items found for this store");
        setIsGenerating(false);
        return;
      }

      const lines: JournalLine[] = inventoryItems.map((inv: any, index: number) => ({
        id: crypto.randomUUID(),
        account_id: "", // Will set during save
        item_id: inv.item_id,
        description: `Opening Stock: ${inv.items.sku} - ${inv.items.name}`,
        debit_amount: inv.quantity * inv.items.cost,
        credit_amount: 0,
        store_id: selectedStore,
        line_number: index + 1,
      }));

      setJournalLines(lines);
    } catch (err: any) {
      toast.error(err.message || "Error generating opening stock");
    }
    setIsGenerating(false);
  };

  // Calculate total debit and credit for display
  const totalDebitDisplay = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCreditDisplay = journalLines.reduce((sum, line) => sum + line.credit_amount, 0);
  // Add the expected balancing credit for display
  const expectedTotalCreditDisplay = totalDebitDisplay > 0 ? totalDebitDisplay : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Journal Entry</h1>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-60">
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
            <Button onClick={handleGenerate} disabled={isGenerating || saveMutation.isPending}>
              {isGenerating ? "Generating..." : "Generate Opening Stock"}
            </Button>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || journalLines.length === 0 || totalDebitDisplay === 0}
          >
            {saveMutation.isPending ? "Saving..." : "Save Journal Entry"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No lines generated
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Debit Lines (Inventory) */}
                    {journalLines.map((line, index) => (
                      <TableRow key={line.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="font-mono">${line.debit_amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono">${line.credit_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Balancing Credit Line (Retained Earnings - Display only) */}
                    {totalDebitDisplay > 0 && (
                      <TableRow className="bg-green-50/50">
                        <TableCell>{journalLines.length + 1}</TableCell>
                        <TableCell className="italic">Balancing Entry (Retained Earnings)</TableCell>
                        <TableCell className="font-mono">$0.00</TableCell>
                        <TableCell className="font-mono">${expectedTotalCreditDisplay.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                  </>
                )}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2} className="text-right">
                    Total Debit/Credit:
                  </TableCell>
                  <TableCell className="font-mono">${totalDebitDisplay.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">${expectedTotalCreditDisplay.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
