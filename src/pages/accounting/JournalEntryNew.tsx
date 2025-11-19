import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryRow {
  item_id: string;
  sku: string;
  item_name: string;
  quantity: number;
  cost: number;
  store_id: string;
}

const JournalEntryNew = () => {
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load stores
  useEffect(() => {
    supabase
      .from("stores")
      .select("*")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setStores(data || []);
      });
  }, []);

  // Generate Opening Stock
  const handleGenerate = async () => {
    if (!selectedStore) return toast.error("Select a store first");
    setLoading(true);
    try {
      const { data: items, error } = await supabase
        .from("store_inventory")
        .select(`*, items(*)`)
        .eq("store_id", selectedStore);

      if (error) throw error;

      const rows: InventoryRow[] = (items || []).map((row: any) => ({
        item_id: row.item_id,
        sku: row.items.sku,
        item_name: row.items.name,
        quantity: Number(row.quantity),
        cost: Number(row.items.cost),
        store_id: row.store_id,
      }));

      if (rows.length === 0) toast.error("No inventory items found");
      setInventoryRows(rows);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compute total Debit per row
  const computeDebit = (row: InventoryRow) => row.quantity * row.cost;

  // Compute total Debit for the whole table
  const totalDebit = inventoryRows.reduce((sum, row) => sum + computeDebit(row), 0);

  // Save Journal Entry
  const handleSave = async () => {
    if (!selectedStore) return toast.error("No store selected");
    if (inventoryRows.length === 0) return toast.error("No inventory items to save");

    setLoading(true);
    try {
      // Fetch Inventory & Retained Earnings accounts
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

      // Insert journal lines
      const lines = inventoryRows.map((row, index) => ({
        journal_entry_id: journalEntry.id,
        store_id: row.store_id,
        item_id: row.item_id,
        account_id: inventoryAccount.id,
        description: `Opening Stock: ${row.sku} - ${row.item_name}`,
        debit_amount: computeDebit(row),
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
    <div className="p-4 max-h-screen overflow-auto">
      <h2 className="text-xl font-bold mb-4">Opening Stock</h2>

      <div className="mb-4 flex gap-2">
        <select className="border p-2 rounded" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
          <option value="">Select Store</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          Generate Opening Stock
        </button>
        <button className="btn btn-success" onClick={handleSave} disabled={loading || inventoryRows.length === 0}>
          Save
        </button>
      </div>

      {inventoryRows.length > 0 && (
        <div className="overflow-auto max-h-[60vh] border rounded">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border p-2">SKU</th>
                <th className="border p-2">Item Name</th>
                <th className="border p-2">Quantity</th>
                <th className="border p-2">Cost</th>
                <th className="border p-2">Debit</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{row.sku}</td>
                  <td className="border p-2">{row.item_name}</td>
                  <td className="border p-2">{row.quantity}</td>
                  <td className="border p-2">{row.cost.toFixed(2)}</td>
                  <td className="border p-2">{computeDebit(row).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border p-2" colSpan={4}>
                  Total
                </td>
                <td className="border p-2">{totalDebit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JournalEntryNew;
