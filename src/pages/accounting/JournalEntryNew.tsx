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

interface JournalLine {
  id: string;
  account_id: string | null; // UUID fields that might be empty must be nullable
  item_id: string | null; // UUID fields that might be empty must be nullable
  description: string;
  debit_amount: number;
  credit_amount: number;
  store_id: string;
  line_number: number;
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

      // Find Inventory account dynamically
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id")
        .ilike("account_name", `%Inventory%`)
        .eq("is_active", true)
        .order("account_code", { ascending: true })
        .limit(1);

      const inventoryAccount = accountsData?.[0];

      if (!inventoryAccount) {
        throw new Error("Inventory account not found. Check if an active account exists with 'Inventory' in the name.");
      }

      // Find Retained Earnings account
      const { data: retainedAccountData } = await supabase
        .from("accounts")
        .select("id")
        .eq("account_name", "Retained Earnings")
        .maybeSingle();

      if (!retainedAccountData) throw new Error("Retained Earnings account not found.");

      // Calculate Total Debit from the generated lines (Inventory Asset Debits)
      const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);

      // CRITICAL ADDITION: Create the Balancing Credit Line to Retained Earnings
      const retainedEarningsCreditLine: JournalLine = {
        id: crypto.randomUUID(),
        account_id: retainedAccountData.id,
        item_id: null, // FIX: Use null for item_id instead of ""
        description: `Opening Stock (Credit to Retained Earnings)`,
        debit_amount: 0,
        credit_amount: totalDebit,
        store_id: selectedStore,
        line_number: journalLines.length + 1,
      };

      // Combine Debit lines (journalLines) with the new Credit line
      const finalLines = [...journalLines, retainedEarningsCreditLine];

      // Calculate the final totals (now balanced)
      const finalTotalDebit = finalLines.reduce((sum, line) => sum + line.debit_amount, 0);
      const finalTotalCredit = finalLines.reduce((sum, line) => sum + line.credit_amount, 0);

      // Safety Check: Ensure the entry is balanced before insertion
      if (finalTotalDebit !== finalTotalCredit) {
        throw new Error("Journal entry failed balancing check.");
      }
      // -----------------------------------------------------------

      const journalEntryId = crypto.randomUUID();
      const entryNumber = `JE-${Date.now()}`;
      const entryDate = new Date().toISOString();

      // Insert journal entry
      const { error: entryError } = await supabase.from("journal_entries").insert([
        {
          id: journalEntryId,
          entry_number: entryNumber,
          entry_date: entryDate,
          description: `Opening Stock for ${stores?.find((s) => s.id === selectedStore)?.name}`,
          entry_type: "manual",
          status: "draft",
          total_debit: finalTotalDebit,
          total_credit: finalTotalCredit,
        },
      ]);
      if (entryError) throw entryError;

      // Insert journal lines
      const linesToInsert = finalLines.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntryId,
        line_number: index + 1,
        // Use the found Inventory account ID for the debit lines.
        // If line.account_id is null (the inventory lines), use inventoryAccount.id.
        // If line.account_id is set (the Retained Earnings line), use its value.
        account_id: line.account_id || inventoryAccount.id,
      }));

      const { error: lineError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
      if (lineError) throw lineError;

      return journalEntryId;
    },
    onSuccess: () => {
      toast.success("Journal entry saved successfully");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setJournalLines([]);
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

      // Create Debit Lines for Inventory Asset
      const debitLines: JournalLine[] = inventoryItems.map((inv: any, index: number) => ({
        id: crypto.randomUUID(),
        account_id: null, // FIX: Use null instead of ""
        item_id: inv.item_id,
        description: `Opening Stock (Inventory): ${inv.items.sku} - ${inv.items.name}`,
        debit_amount: inv.quantity * inv.items.cost,
        credit_amount: 0,
        store_id: selectedStore,
        line_number: index + 1,
      }));

      setJournalLines(debitLines);
      toast.success("Inventory lines generated. Press 'Save' to complete the entry.");
    } catch (err: any) {
      toast.error(err.message || "Error generating opening stock");
    }
    setIsGenerating(false);
  };

  const totalDebitSum = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Journal Entry</h1>

      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
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
            <Button onClick={handleGenerate} disabled={isGenerating || !selectedStore}>
              {isGenerating ? "Generating..." : "Generate Opening Stock"}
            </Button>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || journalLines.length === 0}>
            {saveMutation.isPending ? "Saving..." : "Save Journal Entry"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[60%]">Description</TableHead>
                  <TableHead className="w-[15%] text-right">Debit</TableHead>
                  <TableHead className="w-[15%] text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      Select a store and click "Generate Opening Stock"
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Inventory Debit Lines */}
                    {journalLines.map((line, index) => (
                      <TableRow key={line.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="text-right">${line.debit_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${line.credit_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Retained Earnings Credit Line (Shown only for display purposes) */}
                    <TableRow className="bg-slate-50/50">
                      <TableCell>{journalLines.length + 1}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        Opening Stock (Credit to Retained Earnings)
                      </TableCell>
                      <TableCell className="text-right">${(0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${totalDebitSum.toFixed(2)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
              <TableHeader>
                <TableRow className="bg-gray-100 font-bold border-t-2">
                  <TableHead colSpan={2} className="text-left">
                    TOTAL
                  </TableHead>
                  <TableHead className="text-right">${totalDebitSum.toFixed(2)}</TableHead>
                  <TableHead className="text-right">${totalDebitSum.toFixed(2)}</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
