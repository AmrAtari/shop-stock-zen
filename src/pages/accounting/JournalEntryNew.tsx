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
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Save Journal Entry mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore || journalLines.length === 0) throw new Error("No store selected or no items generated");

      // --- Find Inventory Account ---
      let inventoryAccount: any;
      const { data: nameSearchData } = await supabase
        .from("accounts")
        .select("*")
        .ilike("account_name", `%Inventory%`)
        .eq("is_active", true)
        .maybeSingle();

      if (nameSearchData) inventoryAccount = nameSearchData;
      else {
        const { data: fallbackSearchData } = await supabase
          .from("accounts")
          .select("*")
          .or("account_type.ilike.Asset,account_name.ilike.Current Assets")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (fallbackSearchData) {
          inventoryAccount = fallbackSearchData;
          toast.warning(
            `Using fallback account: ${inventoryAccount.account_name} as Inventory Asset not specifically named.`,
          );
        }
      }

      if (!inventoryAccount)
        throw new Error(
          "Inventory Asset account not found. Please ensure you have an active account named 'Inventory' or an 'Asset' type account.",
        );

      // --- Find Retained Earnings ---
      const { data: retainedAccount } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_name", "Retained Earnings")
        .maybeSingle();
      if (!retainedAccount) throw new Error("Retained Earnings account not found");

      // --- Get current user for created_by ---
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData) throw new Error("Cannot get current user");

      // 🛑 FIX START: Convert Auth User ID (userData.user.id) to Profile ID (user_profiles.id)
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error("User profile not found. Cannot set 'created_by' foreign key.");
      }
      const profileId = userProfile.id;
      // 🛑 FIX END

      const journalEntryId = crypto.randomUUID();
      const entryNumber = `JE-${Date.now()}`;
      const entryDate = new Date().toISOString();

      const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
      const amountToCredit = totalDebit;

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
          total_debit: totalDebit,
          total_credit: amountToCredit,
          created_by: profileId, // ✅ CORRECT: Insert the Profile ID
        },
      ]);
      if (entryError) throw entryError;

      // Prepare journal lines
      const debitLinesToInsert = journalLines.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntryId,
        line_number: index + 1,
        account_id: inventoryAccount.id,
      }));

      const creditLineToInsert: any = {
        id: crypto.randomUUID(),
        journal_entry_id: journalEntryId,
        line_number: debitLinesToInsert.length + 1,
        account_id: retainedAccount.id,
        item_id: null,
        description: "Balancing entry for Opening Stock",
        debit_amount: 0,
        credit_amount: amountToCredit,
        store_id: selectedStore,
      };

      const linesToInsert = [...debitLinesToInsert, creditLineToInsert];
      const { error: lineError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
      if (lineError) throw lineError;

      return journalEntryId;
    },
    onSuccess: () => {
      toast.success("Journal entry saved successfully");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setJournalLines([]);
      setSelectedStore("");
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

  const totalDebitDisplay = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
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
                    {journalLines.map((line, index) => (
                      <TableRow key={line.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="font-mono">
                          {currencySymbol}
                          {line.debit_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {currencySymbol}
                          {line.credit_amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
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
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2} className="text-right">
                    Total Debit/Credit:
                  </TableCell>
                  <TableCell className="font-mono">
                    {currencySymbol}
                    {totalDebitDisplay.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {currencySymbol}
                    {expectedTotalCreditDisplay.toFixed(2)}
                  </TableCell>
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
