import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CSVLink } from "react-csv";

// Types
interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  gender: string;
  season: string;
  unit: string;
  description: string;
  min_stock: number;
}

interface Store {
  id: string;
  name: string;
  location: string;
}

interface InventoryEntry {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  min_stock: number;
  last_restocked: string;
  created_at: string;
  updated_at: string;
  item: Item;
  store: Store;
}

const ITEMS_PER_PAGE = 20;

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof InventoryEntry | "total_stock">("item.name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch all stores
  useEffect(() => {
    const fetchStores = async () => {
      const { data: storesData, error } = await supabase.from("stores").select("*");
      if (error) console.error(error);
      else setAllStores(storesData || []);
    };
    fetchStores();
  }, []);

  // Fetch inventory with joins
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("store_inventory").select(`
            *,
            item:items (*),
            store:stores (*)
          `);
        if (error) throw error;
        setInventory(data || []);
      } catch (error) {
        console.error("Failed to load inventory:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Calculate total stock across all stores per item
  const totalStockMap = useMemo(() => {
    const map: { [itemId: string]: number } = {};
    inventory.forEach((entry) => {
      if (!map[entry.item_id]) map[entry.item_id] = 0;
      map[entry.item_id] += entry.quantity;
    });
    return map;
  }, [inventory]);

  // Filtered and sorted inventory
  const filteredInventory = useMemo(() => {
    let filtered = inventory.filter((entry) => {
      const matchesSearch =
        searchTerm === "" ||
        entry.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = storeFilter === "all" || entry.store_id === storeFilter;
      return matchesSearch && matchesStore;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      if (sortField === "total_stock") {
        aValue = totalStockMap[a.item_id];
        bValue = totalStockMap[b.item_id];
      } else if (sortField.startsWith("item.")) {
        const key = sortField.split(".")[1] as keyof Item;
        aValue = a.item[key];
        bValue = b.item[key];
      } else {
        aValue = (a as any)[sortField];
        bValue = (b as any)[sortField];
      }
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [inventory, searchTerm, storeFilter, sortField, sortOrder, totalStockMap]);

  const toggleSort = (field: keyof InventoryEntry | "total_stock") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // CSV Export
  const csvData = filteredInventory.map((entry) => ({
    "Item Name": entry.item.name,
    SKU: entry.item.sku,
    Store: entry.store.name,
    Quantity: entry.quantity,
    "Min Stock": entry.min_stock,
    "Total Stock Across All Stores": totalStockMap[entry.item_id],
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border px-3 py-2 rounded flex-1"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All Stores</option>
          {allStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <CSVLink
          data={csvData}
          filename="inventory_report.csv"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Export CSV
        </CSVLink>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("item.name")}>
                Item Name
              </th>
              <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("item.sku")}>
                SKU
              </th>
              <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("store.name")}>
                Store
              </th>
              <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("quantity")}>
                Quantity
              </th>
              <th className="px-4 py-2">Min Stock</th>
              <th className="px-4 py-2 cursor-pointer" onClick={() => toggleSort("total_stock")}>
                Total Stock Across All Stores
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  Loading...
                </td>
              </tr>
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  No items found
                </td>
              </tr>
            ) : (
              filteredInventory.map((entry) => {
                let quantityColor = "text-green-700";
                if (entry.quantity <= entry.min_stock) quantityColor = "text-red-700 font-bold";
                else if (entry.quantity <= entry.min_stock * 2) quantityColor = "text-yellow-600 font-semibold";

                return (
                  <tr key={entry.id} className="border-t">
                    <td className="px-4 py-2">{entry.item.name}</td>
                    <td className="px-4 py-2">{entry.item.sku}</td>
                    <td className="px-4 py-2">{entry.store.name}</td>
                    <td className={`px-4 py-2 ${quantityColor}`}>{entry.quantity}</td>
                    <td className="px-4 py-2">{entry.min_stock}</td>
                    <td className="px-4 py-2">{totalStockMap[entry.item_id]}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
