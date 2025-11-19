import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

interface Store {
  id: string;
  name: string;
}

interface JournalLine {
  id: string;
  account_id: string;
  item_id: string;
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

  // Save journal entry
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore || journalLines.length === 0) throw new Error("No store selected or no items generated");

      const { data: accountData } = await supabase
        .from("accounts")
        .select("*")
        .ilike("account_name", `%Inventory%${selectedStore}%`)
        .maybeSingle();

      if (!accountData) throw new Error("Inventory account not found");

      const { data: retainedAccount } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_name", "Retained Earnings")
        .maybeSingle();

      if (!retainedAccount) throw new Error("Retained Earnings account not found");

      const journalEntryId = uuidv4();
      const entryNumber = `JE-${Date.now()}`;
      const entryDate = new Date().toISOString();

      const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
      const totalCredit = journalLines.reduce((sum, line) => sum + line.credit_amount, 0);

      // Insert journal entry
      const { error: entryError } = await supabase.from("journal_entries").insert([
        {
          id: journalEntryId,
          entry_number: entryNumber,
          entry_date: entryDate,
          description: `Opening Stock for ${selectedStore}`,
          entry_type: "manual",
          status: "draft",
          total_debit: totalDebit,
          total_credit: totalCredit,
        },
      ]);
      if (entryError) throw entryError;

      // Insert journal lines
      const linesToInsert = journalLines.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntryId,
        account_id: accountData.id,
        line_number: index + 1,
      }));

      const { error: lineError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
      if (lineError) throw lineError;
    },
    onSuccess: () => {
      toast.success("Journal entry saved successfully");
      setJournalLines([]);
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
    onError: (err: any) => toast.error(err.message || "Error saving journal entry"),
  });

  // Generate Opening Stock
  const handleGenerate = async () => {
    if (!selectedStore) return toast.error("Please select a store");
    setIsGenerating(true);

    try {
      const { data: inventoryItems } = await supabase
        .from("store_inventory")
        .select("id, item_id, quantity, items(sku, name, cost)")
        .eq("store_id", selectedStore)
        .order("id", { ascending: true });

      if (!inventoryItems || inventoryItems.length === 0) {
        toast.error("No inventory items found for this store");
        setIsGenerating(false);
        return;
      }

      const lines: JournalLine[] = inventoryItems.map((inv: any, index: number) => ({
        id: uuidv4(),
        account_id: "",
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

  const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredit = journalLines.reduce((sum, line) => sum + line.credit_amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Journal Entry</h1>

      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center gap-4">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Select Store" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map((store) => (
                  <SelectItem key={store.id} value={store.name}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Opening Stock"}
            </Button>
          </div>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => saveMutation.mutate()}>
            Save Journal Entry
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-gray-100 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No lines generated
                    </TableCell>
                  </TableRow>
                ) : (
                  journalLines.map((line, index) => (
                    <TableRow key={line.id} className="hover:bg-gray-50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">${line.debit_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${line.credit_amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Totals Row */}
            {journalLines.length > 0 && (
              <div className="flex justify-end border-t mt-2 pt-2 pr-4">
                <span className="font-semibold mr-6">Total Debit: ${totalDebit.toFixed(2)}</span>
                <span className="font-semibold">Total Credit: ${totalCredit.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryNew;
