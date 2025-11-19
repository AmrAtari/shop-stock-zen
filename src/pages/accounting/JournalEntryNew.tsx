import React, { useEffect, useState } from "react";
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

interface Store {
  id: string;
  name: string;
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
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

  // Generate Opening Stock for selected stores
  const handleGenerate = async () => {
    if (selectedStores.length === 0) return toast.error("Select at least one store");

    setLoading(true);
    try {
      let allRows: InventoryRow[] = [];

      for (const storeId of selectedStores) {
        const { data: items, error } = await supabase
          .from("store_inventory")
          .select(`*, items(*)`)
          .eq("store_id", storeId);

        if (error) throw error;

        const rows: InventoryRow[] = (items || []).map((row: any) => ({
          item_id: row.item_id,
          sku: row.items.sku,
          item_name: row.items.name,
          quantity: Number(row.quantity),
          cost: Number(row.items.cost),
          store_id: row.store_id,
        }));

        allRows = [...allRows, ...rows];
      }

      if (allRows.length === 0) toast.error("No inventory items found for selected stores");
      setInventoryRows(allRows);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const computeDebit = (row: InventoryRow) => row.quantity * row.cost;
  const totalDebit = inventoryRows.reduce((sum, row) => sum + computeDebit(row), 0);

  // Save Journal Entry
  const handleSave = async () => {
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
          description: `Opening Stock for selected stores`,
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

      // Retained Earnings line (one per entry)
      lines.push({
        journal_entry_id: journalEntry.id,
        store_id: selectedStores[0],
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
      setSelectedStores([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-h-screen overflow-auto">
      <h2 className="text-2xl font-bold mb-6">Opening Stock Journal Entry</h2>

      {/* Store Selection */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <select
          multiple
          className="border rounded p-2 min-w-[250px]"
          value={selectedStores}
          onChange={(e) => setSelectedStores(Array.from(e.target.selectedOptions, (option) => option.value))}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleGenerate}
          disabled={loading}
        >
          Generate Opening Stock
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleSave}
          disabled={loading || inventoryRows.length === 0}
        >
          Save
        </button>
      </div>

      {/* Inventory Table */}
      {inventoryRows.length > 0 && (
        <div className="overflow-auto max-h-[70vh] border rounded">
          <table className="min-w-full table-auto border-collapse">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="border p-2">Store</th>
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
                  <td className="border p-2">{stores.find((s) => s.id === row.store_id)?.name}</td>
                  <td className="border p-2">{row.sku}</td>
                  <td className="border p-2">{row.item_name}</td>
                  <td className="border p-2">{row.quantity}</td>
                  <td className="border p-2">{row.cost.toFixed(2)}</td>
                  <td className="border p-2">{computeDebit(row).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border p-2" colSpan={5}>
                  Total Debit
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
