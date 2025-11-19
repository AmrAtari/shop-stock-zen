import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";

interface Store {
  id: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  cost: number;
}

interface StoreInventoryRow {
  item_id: string;
  store_id: string;
  quantity: number;
  item: Item;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalEntryLine {
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  store_id?: string;
  item_id?: string;
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [inventory, setInventory] = useState<StoreInventoryRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entryDate, setEntryDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState<string>("");
  const [lines, setLines] = useState<JournalEntryLine[]>([]);

  // Load stores
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

  // Load accounts
  useEffect(() => {
    supabase
      .from("accounts")
      .select("*")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setAccounts(data || []);
      });
  }, []);

  // Load inventory per store
  useEffect(() => {
    if (!selectedStore) return;
    supabase
      .from("store_inventory")
      .select("*, item:items(id, sku, name, cost)")
      .eq("store_id", selectedStore)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setInventory(data || []);
      });
  }, [selectedStore]);

  const generateOpeningStock = async () => {
    if (!selectedStore) return toast.error("Please select a store first.");

    const inventoryAccount = accounts.find((a) => a.account_type === "inventory");
    const retainedEarningsAccount = accounts.find((a) => a.account_type === "retained_earnings");

    if (!inventoryAccount || !retainedEarningsAccount) {
      return toast.error("Inventory or Retained Earnings account not found");
    }

    if (!inventory || inventory.length === 0) {
      return toast.error("No inventory items found for this store");
    }

    const newLines: JournalEntryLine[] = inventory.map((row) => ({
      account_id: inventoryAccount.id,
      description: `Opening stock for ${row.item.name} (${row.item.sku})`,
      debit_amount: Number(row.quantity) * Number(row.item.cost),
      credit_amount: 0,
      store_id: row.store_id,
      item_id: row.item_id,
    }));

    // Retained Earnings line (credit total)
    const totalDebit = newLines.reduce((sum, l) => sum + l.debit_amount, 0);
    newLines.push({
      account_id: retainedEarningsAccount.id,
      description: `Offset Opening Stock for ${stores.find((s) => s.id === selectedStore)?.name}`,
      debit_amount: 0,
      credit_amount: totalDebit,
    });

    setLines(newLines);
    toast.success("Opening stock journal lines generated successfully");
  };

  const saveJournalEntry = async () => {
    if (!description) return toast.error("Please fill entry description");
    if (lines.length === 0) return toast.error("No journal lines to save");

    // Insert into journal_entries
    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        entry_date: entryDate,
        description,
        entry_type: "opening_stock",
        status: "draft",
      })
      .select()
      .single();

    if (entryError || !entry) return toast.error(entryError?.message || "Failed to create journal entry");

    // Insert lines
    const { error: linesError } = await supabase.from("journal_entry_lines").insert(
      lines.map((l) => ({
        journal_entry_id: entry.id,
        account_id: l.account_id,
        description: l.description,
        debit_amount: l.debit_amount,
        credit_amount: l.credit_amount,
        store_id: l.store_id || null,
        item_id: l.item_id || null,
      })),
    );

    if (linesError) return toast.error(linesError.message);

    toast.success("Journal entry saved successfully");
    setLines([]);
    setDescription("");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">New Journal Entry</h1>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Entry Date</label>
          <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Store</label>
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button onClick={generateOpeningStock}>Generate Opening Stock</Button>
        <Button onClick={saveJournalEntry} variant="secondary">
          Save Journal Entry
        </Button>
      </div>

      {lines.length > 0 && (
        <div className="mt-4 border rounded p-4">
          <h2 className="font-semibold mb-2">Journal Lines Preview</h2>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Account</th>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2">Debit</th>
                <th className="text-right p-2">Credit</th>
                <th className="text-left p-2">Store</th>
                <th className="text-left p-2">Item</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{accounts.find((a) => a.id === line.account_id)?.account_name || "-"}</td>
                  <td className="p-2">{line.description}</td>
                  <td className="p-2 text-right">{line.debit_amount.toFixed(2)}</td>
                  <td className="p-2 text-right">{line.credit_amount.toFixed(2)}</td>
                  <td className="p-2">{stores.find((s) => s.id === line.store_id)?.name || "-"}</td>
                  <td className="p-2">{inventory.find((i) => i.item_id === line.item_id)?.item.name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JournalEntryNew;
