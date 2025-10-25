import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"];
type Store = Database["public"]["Tables"]["stores"]["Row"];
type StoreInventory = Database["public"]["Tables"]["store_inventory"]["Row"];

interface InventoryEntry extends StoreInventory {
  item: Item;
  store: Store;
}

interface StoreSummary {
  [storeId: string]: {
    count: number;
    items: InventoryEntry[];
    storeName: string;
  };
}

const PAGE_SIZE = 20;

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [page, setPage] = useState(1);

  // --- Load Inventory from Supabase ---
  const loadInventory = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.from("store_inventory").select(`
          *,
          item:items (*),
          store:stores (*)
        `);

      if (error) throw error;
      setInventory(data || []);
      setPage(1);
    } catch (err) {
      console.error("Inventory load failed:", err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Filtered Inventory ---
  const filteredInventory = useMemo(() => {
    const filtered = inventory.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStore = storeFilter === "all" || entry.store.id === storeFilter;

      return matchesSearch && matchesStore;
    });
    return filtered;
  }, [inventory, searchTerm, storeFilter]);

  // --- Pagination ---
  const paginatedInventory = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredInventory.slice(start, start + PAGE_SIZE);
  }, [filteredInventory, page]);

  const totalPages = Math.ceil(filteredInventory.length / PAGE_SIZE);

  // --- Total Quantity per Item ---
  const totalQuantityMap = useMemo(() => {
    const map: { [itemId: string]: number } = {};
    inventory.forEach((entry) => {
      map[entry.item_id] = (map[entry.item_id] || 0) + entry.quantity;
    });
    return map;
  }, [inventory]);

  // --- Store Summary ---
  const storeSummary = useMemo(() => {
    const stores: StoreSummary = {};
    inventory.forEach((entry) => {
      const storeId = entry.store.id || "unknown-store";
      const storeName = entry.store.name || storeId;
      if (!stores[storeId]) stores[storeId] = { count: 0, items: [], storeName };
      stores[storeId].count++;
      stores[storeId].items.push(entry);
    });
    return stores;
  }, [inventory]);

  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((entry) => {
      const storeId = entry.store.id;
      const storeName = entry.store.name;
      if (storeId) stores[storeId] = storeName;
    });
    return stores;
  };

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, SKU, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="md:w-64 px-3 py-2 border rounded-md"
        >
          {Object.entries(getUniqueStores()).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center">No items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Total Qty</th>
                  <th className="px-4 py-2">Store Qty</th>
                  <th className="px-4 py-2">Min Stock</th>
                  <th className="px-4 py-2">Store</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventory.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="px-4 py-2">{entry.item.name}</td>
                    <td className="px-4 py-2">{entry.item.sku || "N/A"}</td>
                    <td className="px-4 py-2 font-semibold">{totalQuantityMap[entry.item_id]}</td>
                    <td
                      className={`px-4 py-2 font-semibold ${
                        entry.quantity <= (entry.min_stock || entry.item.min_stock || 0)
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {entry.quantity}
                    </td>
                    <td className="px-4 py-2">{entry.min_stock || entry.item.min_stock || "-"}</td>
                    <td className="px-4 py-2">{entry.store.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
