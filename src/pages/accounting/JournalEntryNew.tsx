import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Store {
  id: string;
  name: string;
}

interface StoreInventoryRow {
  store_id: string;
  store_name: string;
  item_id: string;
  item_name: string;
  sku: string;
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
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [inventoryRows, setInventoryRows] = useState<StoreInventoryRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch stores
  useEffect(() => {
    supabase
      .from("stores")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setStores(data || []);
      });
  }, []);

  // Fetch all accounts (Inventory + Retained Earnings)
  useEffect(() => {
    supabase
      .from("accounts")
      .select("*")
      .in("account_name", [
        "Retained Earnings",
        "Inventory Hebron",
        "Inventory Ramallah",
        "Inventory Jenin",
        "Inventory Main Warehouse",
        "Inventory Lacasa",
      ])
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setAccounts(data || []);
      });
  }, []);

  // Generate Opening Stock for selected store
  const generateOpeningStock = async () => {
    if (!selectedStore) return toast.error("Please select a store first.");
    setIsGenerating(true);

    try {
      const { data: inventoryData, error } = await supabase
        .from("store_inventory")
        .select("item_id, quantity, items(name, sku, cost)")
        .eq("store_id", selectedStore);

      if (error) throw error;
      if (!inventoryData || inventoryData.length === 0) {
        toast.error("No inventory items found for this store.");
        setInventoryRows([]);
        return;
      }

      const rows: StoreInventoryRow[] = inventoryData.map((row: any) => ({
        store_id: selectedStore,
        store_name: stores.find((s) => s.id === selectedStore)?.name || "",
        item_id: row.item_id,
        item_name: row.items?.name || "",
        sku: row.items?.sku || "",
        quantity: row.quantity,
        cost: row.items?.cost || 0,
      }));

      setInventoryRows(rows);
      toast.success(`Loaded ${rows.length} items for ${rows[0]?.store_name}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get store-specific Inventory account
  const getInventoryAccountForStore = (storeName: string) => {
    return accounts.find((a) => a.account_name.includes(storeName));
  };

  // Save journal entry
  const saveJournalEntry = async () => {
    if (inventoryRows.length === 0) return toast.error("No inventory items to save.");

    const retainedEarningsAccount = accounts.find((a) => a.account_name === "Retained Earnings");
    if (!retainedEarningsAccount) return toast.error("Retained Earnings account not found.");

    const inventoryAccount = getInventoryAccountForStore(stores.find((s) => s.id === selectedStore)?.name || "");
    if (!inventoryAccount) return toast.error(`Inventory account not found for this store.`);

    setIsSaving(true);

    try {
      // Insert journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert([
          {
            entry_number: `JE-${Date.now()}`,
            entry_date: new Date().toISOString(),
            description: `Opening Stock for ${stores.find((s) => s.id === selectedStore)?.name || ""}`,
          },
        ])
        .select("*")
        .single();

      if (entryError || !journalEntry) throw entryError || new Error("Failed to create journal entry");

      // Insert journal entry lines
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

      // Retained earnings line (credit)
      lines.push({
        journal_entry_id: journalEntry.id,
        store_id: selectedStore,
        item_id: inventoryRows[0]?.item_id || null,
        account_id: retainedEarningsAccount.id,
        description: "Offset Opening Stock",
        debit_amount: 0,
        credit_amount: lines.reduce((sum, l) => sum + l.debit_amount, 0),
        line_number: lines.length + 1,
      });

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(lines);
      if (linesError) throw linesError;

      toast.success("Journal entry saved successfully!");
      setInventoryRows([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 h-[90vh] flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Generate Opening Stock</h1>

      <div className="flex gap-3 mb-4">
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

        <Button onClick={generateOpeningStock} disabled={isGenerating}>
          {isGenerating ? "Loading..." : "Generate Opening Stock"}
        </Button>
        <Button onClick={saveJournalEntry} disabled={isSaving || inventoryRows.length === 0}>
          {isSaving ? "Saving..." : "Save Journal Entry"}
        </Button>
      </div>

      <ScrollArea className="flex-1 border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryRows.map((row) => (
              <TableRow key={`${row.item_id}-${row.store_id}`}>
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.item_name}</TableCell>
                <TableCell>{row.store_name}</TableCell>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell className="text-right">{row.cost.toFixed(2)}</TableCell>
                <TableCell className="text-right">{(row.quantity * row.cost).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default JournalEntryNew;
