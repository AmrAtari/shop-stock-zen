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
  item_id?: string; // optional for summary lines
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [storeInventory, setStoreInventory] = useState<StoreInventory[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([]);

  const [inventoryAccount, setInventoryAccount] = useState<Account | null>(null);
  const [retainedEarningsAccount, setRetainedEarningsAccount] = useState<Account | null>(null);

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

    const inv = data.find((a: Account) => a.account_name.toLowerCase().includes("inventory"));
    const re = data.find((a: Account) => a.account_name.toLowerCase().includes("retained earnings"));

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

    const lines: JournalLine[] = storeInventory.map((inv) => {
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

    const totalDebit = lines.reduce((sum, l) => sum + l.debit_amount, 0);

    // Retained Earnings summary line (no item_id)
    lines.push({
      account_id: retainedEarningsAccount.id,
      description: "Opening Stock Adjustment",
      debit_amount: 0,
      credit_amount: totalDebit,
      store_id: selectedStore.id,
    });

    setLines(lines);
    toast.success("Opening stock lines generated successfully");
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
        <div className="mt-4 border rounded p-4">
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
                return (
                  <tr key={idx}>
                    <td className="border p-2">{line.account_id}</td>
                    <td className="border p-2">{item?.name || "-"}</td>
                    <td className="border p-2">{line.description}</td>
                    <td className="border p-2">{line.debit_amount.toFixed(2)}</td>
                    <td className="border p-2">{line.credit_amount.toFixed(2)}</td>
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
