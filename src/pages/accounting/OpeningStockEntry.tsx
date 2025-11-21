import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // <--- ADDED THIS IMPORT
import { ArrowLeft, Box, CheckCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

// Define Interfaces for clarity (Assuming these tables exist)
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

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

const OpeningStockEntry = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  const [selectedStore, setSelectedStore] = useState<string>("");
  const [inventoryAssetAccount, setInventoryAssetAccount] = useState<string>("");
  const [equityOpeningBalanceAccount, setEquityOpeningBalanceAccount] = useState<string>("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // 1. Fetch Stores
  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Inventory Items
  const { data: inventoryItems, isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      // Assuming the inventory table has a 'cost' field
      const { data, error } = await supabase.from("inventory_items").select("id, sku, name, cost");
      if (error) throw error;
      return data;
    },
  });

  // 3. Fetch Accounts (Filtered for Asset and Equity)
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      // Assuming a structure for filtering accounts (e.g., account_code starting with '1' for Assets, '3' for Equity)
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name")
        .order("account_code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Filtered lists for easier selection
  const assetAccounts = accounts?.filter((a) => a.account_code.startsWith("1")) || [];
  const equityAccounts = accounts?.filter((a) => a.account_code.startsWith("3")) || [];

  // 4. Calculate Total Stock Value (Memoized)
  const totalStockValue = useMemo(() => {
    // Simple calculation: Sum of cost for all items. In a real ERP, this would involve stock quantity * cost per store.
    // For simplicity, we assume we are setting the TOTAL inventory value.
    return inventoryItems?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
  }, [inventoryItems]);

  const isReadyToGenerate =
    selectedStore && inventoryAssetAccount && equityOpeningBalanceAccount && totalStockValue > 0;

  // 5. Generate and Save Journal Entry Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!isReadyToGenerate) {
        throw new Error("Missing store, inventory account, or equity account selection, or total stock value is zero.");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("User session expired. Please log in again.");
      }
      const currentUserId = userData.user.id;
      const journalEntryId = crypto.randomUUID();
      const entryNumber = `JE-OS-${Date.now().toString().slice(-6)}`;

      // DEBIT: Inventory Asset (increases asset)
      // CREDIT: Opening Balance Equity (increases equity)

      const linesToInsert = [
        // DEBIT LINE: Inventory Asset
        {
          journal_entry_id: journalEntryId,
          line_number: 1,
          account_id: inventoryAssetAccount,
          description: `Initial valuation of retail stock in store: ${stores?.find((s) => s.id === selectedStore)?.name || "N/A"}`,
          debit_amount: totalStockValue,
          credit_amount: 0,
          store_id: selectedStore,
        },
        // CREDIT LINE: Opening Balance Equity
        {
          journal_entry_id: journalEntryId,
          line_number: 2,
          account_id: equityOpeningBalanceAccount,
          description: "Equity contra account for initial inventory setup.",
          debit_amount: 0,
          credit_amount: totalStockValue,
          store_id: selectedStore,
        },
      ];

      // 1. Insert Journal Entry Header
      const { error: entryError } = await supabase.from("journal_entries").insert([
        {
          id: journalEntryId,
          entry_number: entryNumber,
          entry_date: new Date(entryDate).toISOString(),
          description: `System-generated Opening Stock Entry for ${stores?.find((s) => s.id === selectedStore)?.name || "N/A"}`,
          entry_type: "system_stock",
          status: "posted", // System entries should usually post immediately
          total_debit: totalStockValue,
          total_credit: totalStockValue,
          created_by: currentUserId,
          posted_by: currentUserId, // System post
          posted_at: new Date().toISOString(),
        },
      ]);
      if (entryError) {
        console.error("Entry Insert Error:", entryError);
        throw new Error(`Failed to insert journal entry header: ${entryError.message}`);
      }

      // 2. Insert Journal Lines
      const { error: lineError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
      if (lineError) {
        console.error("Lines Insert Error:", lineError);
        throw new Error(`Failed to insert journal lines: ${lineError.message}`);
      }

      return journalEntryId;
    },
    onSuccess: (newEntryId) => {
      toast.success("Opening Stock Entry successfully posted!");
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      navigate(`/accounting/journal-entries/${newEntryId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Error generating opening stock entry.");
    },
  });

  // Loading state for all queries
  const isLoading = storesLoading || itemsLoading || accountsLoading || generateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate("/accounting")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Box className="w-6 h-6" />
          Opening Stock Entry Wizard
        </h1>
        <Button onClick={() => generateMutation.mutate()} disabled={!isReadyToGenerate || generateMutation.isPending}>
          <CheckCheck className="w-4 h-4 mr-2" />
          {generateMutation.isPending ? "Posting..." : "Post Opening Entry"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Store Selection */}
          <div>
            <Label htmlFor="store">Target Store</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore} disabled={isLoading}>
              <SelectTrigger id="store">
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

          {/* Entry Date */}
          <div>
            <Label htmlFor="date">Entry Date</Label>
            <Input
              id="date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Accounting Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inventory Asset Account (DEBIT) */}
          <div>
            <Label htmlFor="asset-account">Inventory Asset Account (DEBIT)</Label>
            <Select value={inventoryAssetAccount} onValueChange={setInventoryAssetAccount} disabled={isLoading}>
              <SelectTrigger id="asset-account">
                <SelectValue placeholder="Select Asset Account (e.g., 1200 - Inventory)" />
              </SelectTrigger>
              <SelectContent>
                {assetAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {`${account.account_code} - ${account.account_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opening Balance Equity Account (CREDIT) */}
          <div>
            <Label htmlFor="equity-account">Opening Balance Equity Account (CREDIT)</Label>
            <Select
              value={equityOpeningBalanceAccount}
              onValueChange={setEquityOpeningBalanceAccount}
              disabled={isLoading}
            >
              <SelectTrigger id="equity-account">
                <SelectValue placeholder="Select Equity Account (e.g., 3900 - Opening Balance Equity)" />
              </SelectTrigger>
              <SelectContent>
                {equityAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {`${account.account_code} - ${account.account_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Entry Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell className="font-semibold">
                  {accounts?.find((a) => a.id === inventoryAssetAccount)?.account_name || "— Inventory Asset"}
                </TableCell>
                <TableCell className="text-right font-mono text-lg">
                  {formatCurrency(totalStockValue, currency)}
                </TableCell>
                <TableCell className="text-right font-mono text-lg">—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell className="font-semibold">
                  {accounts?.find((a) => a.id === equityOpeningBalanceAccount)?.account_name ||
                    "— Opening Balance Equity"}
                </TableCell>
                <TableCell className="text-right font-mono text-lg">—</TableCell>
                <TableCell className="text-right font-mono text-lg">
                  {formatCurrency(totalStockValue, currency)}
                </TableCell>
              </TableRow>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2} className="text-right">
                  TOTALS:
                </TableCell>
                <TableCell className="text-right font-mono text-lg">
                  {formatCurrency(totalStockValue, currency)}
                </TableCell>
                <TableCell className="text-right font-mono text-lg">
                  {formatCurrency(totalStockValue, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="pt-6">
          {!isReadyToGenerate && (
            <div className="text-red-600 font-bold border-l-4 border-red-600 pl-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>
                **REQUIRED:** Please select a Store, Inventory Asset Account, and Opening Equity Account to proceed.
              </p>
            </div>
          )}
          {totalStockValue === 0 && isReadyToGenerate && (
            <div className="text-orange-600 font-bold border-l-4 border-orange-600 pl-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>
                **WARNING:** The calculated Total Stock Value is zero. The resulting journal entry will have zero
                amounts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OpeningStockEntry;
