import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface Store {
  id: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  cost: number;
  quantity: number;
}

interface StoreInventoryRow {
  store_id: string;
  store_name: string;
  item_id: string;
  sku: string;
  name: string;
  cost: number;
  quantity: number;
  debit_amount: number;
  credit_amount: number;
}

const JournalEntryNew: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [inventoryRows, setInventoryRows] = useState<StoreInventoryRow[]>([]);
  const [journalDescription, setJournalDescription] = useState("");

  // Load stores on mount
  React.useEffect(() => {
    supabase
      .from("stores")
      .select("*")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setStores(data || []);
      });
  }, []);

  // Generate Opening Stock
  const handleGenerateOpeningStock = async () => {
    if (!selectedStore) return toast.error("Please select a store");

    // Get inventory for the selected store
    const { data: inventory, error } = await supabase
      .from("store_inventory")
      .select(
        `
        item_id,
        quantity,
        items(id, sku, name, cost)
      `,
      )
      .eq("store_id", selectedStore.id);

    if (error) return toast.error(error.message);
    if (!inventory || inventory.length === 0) return toast.error("No inventory items found for this store");

    const rows: StoreInventoryRow[] = inventory.map((inv: any) => ({
      store_id: selectedStore.id,
      store_name: selectedStore.name,
      item_id: inv.item_id,
      sku: inv.items.sku,
      name: inv.items.name,
      cost: inv.items.cost,
      quantity: inv.quantity,
      debit_amount: inv.items.cost * inv.quantity,
      credit_amount: inv.items.cost * inv.quantity,
    }));

    setInventoryRows(rows);
    setJournalDescription(`Opening Stock - ${selectedStore.name}`);
    toast.success(`Generated ${rows.length} items for ${selectedStore.name}`);
  };

  // Save journal entry
  const handleSaveJournalEntry = async () => {
    if (!selectedStore || inventoryRows.length === 0) {
      return toast.error("No items to save or store not selected");
    }

    // Validate totals
    const totalDebit = inventoryRows.reduce((sum, r) => sum + r.debit_amount, 0);
    const totalCredit = inventoryRows.reduce((sum, r) => sum + r.credit_amount, 0);
    if (totalDebit !== totalCredit) {
      return toast.error("Total debit and credit must be equal");
    }

    // Insert journal entry
    const { data: entryData, error: entryError } = await supabase
      .from("journal_entries")
      .insert([
        {
          entry_number: `JE-${Date.now()}`,
          entry_date: new Date().toISOString(),
          description: journalDescription,
          entry_type: "opening_stock",
          status: "posted",
          created_by: uuidv4(),
          posted_by: uuidv4(),
        },
      ])
      .select()
      .single();

    if (entryError) return toast.error(entryError.message);

    const entryId = entryData.id;

    // Insert journal lines
    const linesToInsert = inventoryRows.map((row, idx) => ({
      journal_entry_id: entryId,
      account_id: getInventoryAccountId(selectedStore.id), // function to map store to inventory account
      item_id: row.item_id,
      description: row.name,
      debit_amount: row.debit_amount,
      credit_amount: 0, // assume debit to inventory
      store_id: selectedStore.id,
      line_number: idx + 1,
    }));

    const { error: linesError } = await supabase.from("journal_entry_lines").insert(linesToInsert);
    if (linesError) return toast.error(linesError.message);

    toast.success("Journal entry saved successfully");
    setInventoryRows([]);
    setJournalDescription("");
  };

  // Map store to inventory account (replace with your accounts mapping)
  const getInventoryAccountId = (storeId: string) => {
    switch (storeId) {
      case "hebron-store-uuid":
        return "110101"; // Inventory Hebron
      case "ramallah-store-uuid":
        return "110102"; // Inventory Ramallah
      default:
        return "1200"; // default inventory account
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">New Journal Entry - Opening Stock</h1>

      <div className="flex items-center gap-4">
        <Select
          value={selectedStore?.id || ""}
          onValueChange={(v) => setSelectedStore(stores.find((s) => s.id === v) || null)}
        >
          <SelectTrigger className="w-64">
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

      {inventoryRows.length > 0 && (
        <>
          <Input
            placeholder="Journal Description"
            value={journalDescription}
            onChange={(e) => setJournalDescription(e.target.value)}
          />
          <div className="overflow-x-auto max-h-[400px] border rounded mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.cost}</TableCell>
                    <TableCell>{row.debit_amount}</TableCell>
                    <TableCell>{row.credit_amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button className="mt-2" onClick={handleSaveJournalEntry}>
            Save Journal Entry
          </Button>
        </>
      )}
    </div>
  );
};

export default JournalEntryNew;
