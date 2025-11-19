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
  quantity: number;
}

interface Account {
  id: string;
  account_name: string;
  account_type: string;
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalLines, setJournalLines] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchStores();
    fetchAccounts();
    fetchItems();
  }, []);

  // Fetch all stores
  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("*");
    if (error) return toast.error(error.message);
    setStores(data || []);
  };

  // Fetch all items (for cost info)
  const fetchItems = async () => {
    const { data, error } = await supabase.from("items").select("*");
    if (error) return toast.error(error.message);
    setItems(data || []);
  };

  // Fetch all accounts
  const fetchAccounts = async () => {
    const { data, error } = await supabase.from("accounts").select("*");
    if (error) return toast.error(error.message);
    setAccounts(data || []);
  };

  // Generate Opening Stock Journal
  const handleGenerateOpeningStock = async () => {
    if (!selectedStore) return toast.error("Please select a store first");

    // Find Inventory account for the selected store
    const inventoryAccount = accounts.find(
      (a) =>
        a.account_type.toLowerCase() === "asset" &&
        a.account_name.toLowerCase().includes("inventory") &&
        a.account_name.toLowerCase().includes(selectedStore.name.toLowerCase()),
    );
    if (!inventoryAccount) return toast.error("Inventory account for this store not found");

    // Find Retained Earnings account
    const retainedEarningsAccount = accounts.find(
      (a) => a.account_type.toLowerCase() === "equity" && a.account_name.toLowerCase().includes("retained earnings"),
    );
    if (!retainedEarningsAccount) return toast.error("Retained Earnings account not found");

    // Fetch store inventory for selected store
    const { data: storeInventoryData, error } = await supabase
      .from("store_inventory")
      .select("*")
      .eq("store_id", selectedStore.id);
    if (error) return toast.error(error.message);
    if (!storeInventoryData || storeInventoryData.length === 0)
      return toast.error("No inventory items found for this store");

    // Build journal lines
    const lines = storeInventoryData.map((inv: StoreInventory) => {
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

    // Add Retained Earnings line (total credit)
    const totalDebit = lines.reduce((sum, l) => sum + l.debit_amount, 0);
    lines.push({
      account_id: retainedEarningsAccount.id,
      description: "Opening Stock Adjustment",
      debit_amount: 0,
      credit_amount: totalDebit,
      store_id: selectedStore.id,
    });

    setJournalLines(lines);
    toast.success(`Generated opening stock journal with ${lines.length} lines`);
  };

  // Save Journal Entry
  const handleSaveJournalEntry = async () => {
    if (journalLines.length === 0) return toast.error("No journal lines to save");

    // Create journal entry
    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .insert([{ entry_date: entryDate, description }])
      .select()
      .single();
    if (entryError) return toast.error(entryError.message);

    // Add journal lines
    const linesToInsert = journalLines.map((line) => ({
      journal_entry_id: entry.id,
      ...line,
    }));
    const { error: linesError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
    if (linesError) return toast.error(linesError.message);

    toast.success("Journal entry saved successfully");
    setJournalLines([]);
    setDescription("");
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">New Journal Entry</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Entry Date</label>
          <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Store</label>
          <Select onValueChange={(val) => setSelectedStore(stores.find((s) => s.id === val) || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a store" />
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

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={handleGenerateOpeningStock}>Generate Opening Stock</Button>
        <Button onClick={handleSaveJournalEntry} variant="secondary">
          Save Journal Entry
        </Button>
      </div>

      {journalLines.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Journal Lines</h2>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Account</th>
                <th className="p-2 border">Description</th>
                <th className="p-2 border text-right">Debit</th>
                <th className="p-2 border text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {journalLines.map((line, idx) => {
                const account = accounts.find((a) => a.id === line.account_id);
                return (
                  <tr key={idx} className="border-b">
                    <td className="p-2 border">{account?.account_name}</td>
                    <td className="p-2 border">{line.description}</td>
                    <td className="p-2 border text-right">{line.debit_amount.toFixed(2)}</td>
                    <td className="p-2 border text-right">{line.credit_amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JournalEntryNew;
