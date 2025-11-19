import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Store {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  cost: number;
}

interface StoreInventory {
  item_id: string;
  store_id: string;
  quantity: number;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

interface JournalLine {
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  store_id: string;
  item_id?: string;
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [storeInventory, setStoreInventory] = useState<StoreInventory[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [inventoryAccount, setInventoryAccount] = useState<Account | null>(null);
  const [retainedEarningsAccount, setRetainedEarningsAccount] = useState<Account | null>(null);

  const [journalDescription, setJournalDescription] = useState("");

  useEffect(() => {
    fetchStores();
    fetchAccounts();
    fetchItems();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("*").order("name");
    if (error) return toast.error(error.message);
    setStores(data);
  };

  const fetchItems = async () => {
    const { data, error } = await supabase.from("items").select("*");
    if (error) return toast.error(error.message);
    setItems(data);
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase.from("accounts").select("*");
    if (error) return toast.error(error.message);
    setAccounts(data);

    const inv = data.find((a) => a.account_name.toLowerCase().includes("inventory"));
    const re = data.find((a) => a.account_name.toLowerCase().includes("retained earnings"));

    if (!inv || !re) {
      toast.error("Inventory or Retained Earnings account not found");
      return;
    }

    setInventoryAccount(inv);
    setRetainedEarningsAccount(re);
  };

  const fetchStoreInventory = async (storeId: string) => {
    const { data, error } = await supabase.from("store_inventory").select("*").eq("store_id", storeId);
    if (error) return toast.error(error.message);
    setStoreInventory(data);
  };

  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId) || null;
    setSelectedStore(store);
    if (store) fetchStoreInventory(store.id);
  };

  const handleGenerateOpeningStock = () => {
    if (!selectedStore || !inventoryAccount || !retainedEarningsAccount) {
      toast.error("Please select a store and ensure accounts are set");
      return;
    }

    if (!storeInventory || storeInventory.length === 0) {
      toast.error("No inventory items found for this store");
      return;
    }

    const generatedLines: JournalLine[] = storeInventory.map((inv) => {
      const item = items.find((i) => i.id === inv.item_id);
      const cost = item?.cost || 0;
      return {
        account_id: inventoryAccount.id,
        item_id: inv.item_id,
        description: `Opening Stock - ${item?.name || inv.item_id}`,
        debit_amount: inv.quantity * cost,
        credit_amount: 0,
        store_id: selectedStore.id,
      };
    });

    const totalDebit = generatedLines.reduce((sum, l) => sum + l.debit_amount, 0);

    // Retained Earnings summary line (no item_id)
    generatedLines.push({
      account_id: retainedEarningsAccount.id,
      description: "Opening Stock Adjustment",
      debit_amount: 0,
      credit_amount: totalDebit,
      store_id: selectedStore.id,
    });

    setLines(generatedLines);
    toast.success("Opening stock lines generated successfully");
  };

  const handleLineChange = (index: number, field: "debit_amount" | "credit_amount", value: number) => {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  };

  const handleSaveJournalEntry = async () => {
    if (!selectedStore || lines.length === 0) {
      return toast.error("No lines to save or store not selected");
    }

    // Insert journal entry
    const { data: entryData, error: entryError } = await supabase
      .from("journal_entries")
      .insert([
        {
          entry_number: `JE-${Date.now()}`,
          entry_date: new Date().toISOString(),
          description: journalDescription || `Opening Stock - ${selectedStore.name}`,
          entry_type: "opening_stock",
          status: "posted",
          created_by: "system",
        },
      ])
      .select()
      .single();

    if (entryError) return toast.error(entryError.message);
    const entryId = entryData.id;

    // Insert lines
    const linesToInsert = lines.map((line) => ({
      journal_entry_id: entryId,
      account_id: line.account_id,
      description: line.description,
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
      store_id: line.store_id,
      item_id: line.item_id || null,
      line_number: 0, // optional auto-generated
    }));

    const { error: linesError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
    if (linesError) return toast.error(linesError.message);

    toast.success("Journal entry saved successfully");
    setLines([]);
    setJournalDescription("");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">New Journal Entry</h1>

      <div className="flex items-center gap-4">
        <Select value={selectedStore?.id || ""} onValueChange={handleStoreChange}>
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

        <Button onClick={handleGenerateOpeningStock}>Generate Opening Stock</Button>
      </div>

      {lines.length > 0 && (
        <div className="mt-4 border rounded p-4 overflow-x-auto max-h-[400px]">
          <h2 className="font-semibold mb-2">Journal Lines</h2>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border p-2">Account</th>
                <th className="border p-2">Item</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Debit</th>
                <th className="border p-2">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const item = items.find((i) => i.id === line.item_id);
                const account = accounts.find((a) => a.id === line.account_id);
                return (
                  <tr key={idx}>
                    <td className="border p-2">{account?.account_name || line.account_id}</td>
                    <td className="border p-2">{item?.name || "-"}</td>
                    <td className="border p-2">{line.description}</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        value={line.debit_amount}
                        onChange={(e) => handleLineChange(idx, "debit_amount", parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        value={line.credit_amount}
                        onChange={(e) => handleLineChange(idx, "credit_amount", parseFloat(e.target.value))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Journal Description"
              value={journalDescription}
              onChange={(e) => setJournalDescription(e.target.value)}
            />
            <Button onClick={handleSaveJournalEntry}>Save Journal Entry</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntryNew;
