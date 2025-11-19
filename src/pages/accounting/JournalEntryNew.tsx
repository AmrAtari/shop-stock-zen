import React, { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";

interface Store {
  id: string;
  name: string;
}

interface InventoryRow {
  item_id: string;
  sku: string;
  item_name: string;
  store_id: string;
  quantity: number;
  cost: number;
}

interface Account {
  id: string;
  account_name: string;
  account_code: string;
  account_type: string;
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch stores
  React.useEffect(() => {
    supabase
      .from("stores")
      .select("id, name")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setStores(data || []);
      });
  }, []);

  // Generate Opening Stock
  const handleGenerateOpeningStock = async () => {
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }
    setLoading(true);
    try {
      // Get inventory for this store
      const { data: inventory, error: invError } = await supabase
        .from("store_inventory")
        .select(
          `
          item_id,
          quantity,
          qty_on_order,
          items(sku, name, cost)
        `,
        )
        .eq("store_id", selectedStore);

      if (invError) throw invError;

      if (!inventory || inventory.length === 0) {
        toast.error("No inventory items found for this store");
        setInventoryRows([]);
        return;
      }

      const rows: InventoryRow[] = inventory.map((i: any) => ({
        item_id: i.item_id,
        sku: i.items.sku,
        item_name: i.items.name,
        store_id: selectedStore,
        quantity: i.quantity || 0,
        cost: i.items.cost || 0,
      }));

      setInventoryRows(rows);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Journal Entry
  const handleSave = async () => {
    if (!selectedStore) return toast.error("No store selected");
    if (inventoryRows.length === 0) return toast.error("No inventory items to save");

    setLoading(true);
    try {
      // Fetch Inventory and Retained Earnings accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .in("account_name", ["Inventory", "Retained Earnings"]);

      if (accountsError) throw accountsError;

      const inventoryAccount = accountsData.find((a) => a.account_name === "Inventory");
      const retainedEarningsAccount = accountsData.find((a) => a.account_name === "Retained Earnings");

      if (!inventoryAccount || !retainedEarningsAccount) {
        toast.error("Inventory or Retained Earnings account not found");
        return;
      }

      // Insert journal entry
      const entryNumber = `JE-${Date.now()}`;
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: new Date().toISOString(),
          description: `Opening Stock for ${stores.find((s) => s.id === selectedStore)?.name}`,
          entry_type: "manual",
          status: "draft",
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Compute total debit
      const totalDebit = inventoryRows.reduce((sum, row) => sum + row.quantity * row.cost, 0);

      // Prepare lines
      const lines = inventoryRows.map((row, index) => ({
        journal_entry_id: journalEntry.id,
        store_id: row.store_id,
        item_id: row.item_id,
        account_id: inventoryAccount.id,
        description: `Opening Stock: ${row.sku} - ${row.item_name}`,
        debit_amount: row.quantity * row.cost,
        credit_amount: 0,
        line_number: index + 1,
      }));

      // Retained Earnings line
      lines.push({
        journal_entry_id: journalEntry.id,
        store_id: selectedStore,
        item_id: inventoryRows[0]?.item_id || null,
        account_id: retainedEarningsAccount.id,
        description: "Offset Opening Stock",
        debit_amount: 0,
        credit_amount: totalDebit,
        line_number: lines.length + 1,
      });

      // Insert lines
      const { error: linesError } = await supabase.from("journal_entry_lines").insert(lines);
      if (linesError) throw linesError;

      toast.success("Journal Entry saved successfully");
      setInventoryRows([]);
      setSelectedStore("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-h-screen overflow-auto space-y-6">
      <div className="flex items-center gap-4">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger>
            <SelectValue placeholder="Select Store" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleGenerateOpeningStock} disabled={loading}>
          Generate Opening Stock
        </Button>
        <Button onClick={handleSave} disabled={loading || inventoryRows.length === 0}>
          Save Journal Entry
        </Button>
      </div>

      {inventoryRows.length > 0 && (
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryRows.map((row) => (
                <TableRow key={row.item_id}>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.item_name}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{formatCurrency(row.cost)}</TableCell>
                  <TableCell>{formatCurrency(row.quantity * row.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default JournalEntryNew;
