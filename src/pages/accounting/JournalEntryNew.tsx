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
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  // Fetch stores
  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Save Journal Entry mutation - FIXED ACCOUNTING LOGIC
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore || journalLines.length === 0) throw new Error("No store selected or no items generated");

      // Filter out only lines with positive values for the actual journal
      const linesWithValue = journalLines.filter((line) => line.debit_amount > 0);

      if (linesWithValue.length === 0) {
        throw new Error("No items with positive value to record. Journal entry must have non-zero amounts.");
      }

      // --- Find Inventory Account ---
      const { data: inventoryAccount } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_code", "1200")
        .eq("is_active", true)
        .single();

      if (!inventoryAccount) {
        throw new Error("Inventory account (1200) not found. Please ensure this account exists and is active.");
      }

      // --- Find CASH/BANK Account (1010) instead of Retained Earnings ---
      const { data: cashAccount } = await supabase
        .from("accounts")
        .select("*")
        .eq("account_code", "1010")
        .eq("is_active", true)
        .single();

      if (!cashAccount) {
        throw new Error(
          "Primary Business Checking account (1010) not found. This is needed to record cash outflow for inventory purchases.",
        );
      }

      // --- Get current user for created_by ---
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Cannot get current user: session may have expired. Please try logging in again.");
      }

      const currentUserId = userData.user.id;

      const journalEntryId = crypto.randomUUID();
      const entryNumber = `JE-${Date.now()}`;
      const entryDate = new Date().toISOString();

      const totalDebit = linesWithValue.reduce((sum, line) => sum + line.debit_amount, 0);
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
          created_by: currentUserId,
        },
      ]);
      if (entryError) throw entryError;

      // Prepare journal lines (only those with value)
      const debitLinesToInsert = linesWithValue.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntryId,
        line_number: index + 1,
        account_id: inventoryAccount.id, // DEBIT to Inventory
      }));

      // CREDIT to Cash/Bank account instead of Retained Earnings
      const creditLineToInsert: any = {
        id: crypto.randomUUID(),
        journal_entry_id: journalEntryId,
        line_number: debitLinesToInsert.length + 1,
        account_id: cashAccount.id, // CHANGED: Now credits Cash account
        item_id: null,
        description: "Cash payment for inventory purchase", // CHANGED: Better description
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
      toast.success("Journal entry saved successfully with proper cash accounting");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setJournalLines([]);
      setSelectedStore("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error saving journal entry");
    },
  });

  // Generate Opening Stock - PROFESSIONAL APPROACH
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

      // Create lines for ALL items, but mark zero-value ones
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

      // Count zero-value items for reporting
      const zeroValueCount = lines.filter((line) => line.debit_amount === 0).length;
      const positiveValueCount = lines.filter((line) => line.debit_amount > 0).length;

      setJournalLines(lines);

      if (zeroValueCount > 0) {
        toast.info(
          `Generated ${positiveValueCount} items with value and ${zeroValueCount} zero-value items for complete inventory record.`,
          { duration: 5000 },
        );
      } else {
        toast.success(`Generated ${positiveValueCount} journal lines`);
      }
    } catch (err: any) {
      toast.error(err.message || "Error generating opening stock");
    }
    setIsGenerating(false);
  };

  const totalDebitDisplay = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
  const expectedTotalCreditDisplay = totalDebitDisplay > 0 ? totalDebitDisplay : 0;
  const zeroValueCount = journalLines.filter((line) => line.debit_amount === 0).length;
  const positiveValueCount = journalLines.filter((line) => line.debit_amount > 0).length;

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
          {/* Summary Stats */}
          {journalLines.length > 0 && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  {positiveValueCount} items with value
                </Badge>
                {zeroValueCount > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {zeroValueCount} zero-value items
                  </Badge>
                )}
                <div className="text-muted-foreground">
                  Total value: <span className="font-semibold">{formatCurrency(totalDebitDisplay, currency)}</span>
                </div>
              </div>
              {zeroValueCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Zero-value items are shown for inventory completeness but will not be included in the final journal
                  entry.
                </p>
              )}
            </div>
          )}

          <div className="overflow-x-auto max-h-[500px]">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No lines generated
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {journalLines.map((line, index) => (
                      <TableRow key={line.id} className={line.debit_amount === 0 ? "bg-muted/30 opacity-60" : ""}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(line.debit_amount, currency)}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(line.credit_amount, currency)}</TableCell>
                        <TableCell>
                          {line.debit_amount === 0 ? (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              Zero Value
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {totalDebitDisplay > 0 && (
                      <TableRow className="bg-green-50/50 font-semibold">
                        <TableCell>{journalLines.length + 1}</TableCell>
                        <TableCell className="italic">Cash payment for inventory purchase</TableCell>
                        <TableCell className="font-mono">{formatCurrency(0, currency)}</TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(expectedTotalCreditDisplay, currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            System
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2} className="text-right">
                    Total Debit/Credit:
                  </TableCell>
                  <TableCell className="font-mono">{formatCurrency(totalDebitDisplay, currency)}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(expectedTotalCreditDisplay, currency)}</TableCell>
                  <TableCell></TableCell>
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
