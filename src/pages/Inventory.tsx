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

type SortKey = "name" | "totalQty" | "storeQty" | "minStock";
type SortOrder = "asc" | "desc";

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

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

  // --- Total Quantity Map ---
  const totalQuantityMap = useMemo(() => {
    const map: { [itemId: string]: number } = {};
    inventory.forEach((entry) => {
      map[entry.item_id] = (map[entry.item_id] || 0) + entry.quantity;
    });
    return map;
  }, [inventory]);

  // --- Filtered Inventory ---
  const filteredInventory = useMemo(() => {
    return inventory
      .filter((entry) => {
        const matchesSearch =
          !searchTerm ||
          entry.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.item.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStore = storeFilter === "all" || entry.store.id === storeFilter;

        return matchesSearch && matchesStore;
      })
      .sort((a, b) => {
        let valA: string | number = "";
        let valB: string | number = "";

        switch (sortKey) {
          case "name":
            valA = a.item.name.toLowerCase();
            valB = b.item.name.toLowerCase();
            break;
          case "totalQty":
            valA = totalQuantityMap[a.item_id];
            valB = totalQuantityMap[b.item_id];
            break;
          case "storeQty":
            valA = a.quantity;
            valB = b.quantity;
            break;
          case "minStock":
            valA = a.min_stock || a.item.min_stock || 0;
            valB = b.min_stock || b.item.min_stock || 0;
            break;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [inventory, searchTerm, storeFilter, sortKey, sortOrder, totalQuantityMap]);

  // --- Pagination ---
  const paginatedInventory = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredInventory.slice(start, start + PAGE_SIZE);
  }, [filteredInventory, page]);

  const totalPages = Math.ceil(filteredInventory.length / PAGE_SIZE);

  // --- CSV Export ---
  const exportCSV = () => {
    const headers = ["Item", "SKU", "Total Qty", "Store Qty", "Min Stock", "Store"];
    const rows = filteredInventory.map((entry) => [
      entry.item.name,
      entry.item.sku || "",
      totalQuantityMap[entry.item_id],
      entry.quantity,
      entry.min_stock || entry.item.min_stock || "",
      entry.store.name,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((r) => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="md:w-64 px-3 py-2 border rounded-md"
        >
          <option value="name">Sort by Name</option>
          <option value="totalQty">Sort by Total Quantity</option>
          <option value="storeQty">Sort by Store Quantity</option>
          <option value="minStock">Sort by Min Stock</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="md:w-64 px-3 py-2 border rounded-md"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
          Export CSV
        </button>
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

            {/* Pagination */}
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
