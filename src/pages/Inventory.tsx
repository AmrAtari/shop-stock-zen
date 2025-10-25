import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  size?: string;
  color?: string;
  gender?: string;
  season?: string;
  unit?: string;
  quantity?: number;
  min_stock?: number;
  location?: string;
  supplier?: string;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  pos_description?: string;
  item_number?: string;
  department?: string;
  main_group?: string;
  origin?: string;
  theme?: string;
  color_id?: string;
  item_color_code?: string;
  tax?: number;
}

interface Store {
  id: string;
  name: string;
  location?: string;
  created_at: string;
}

interface InventoryEntry {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  min_stock?: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
  item: Item;
  store: Store;
}

const ITEMS_PER_PAGE = 10;

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof InventoryEntry | "item.name">("item.name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // --- Fetch inventory from Supabase ---
  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("store_inventory").select(`
          *,
          item:items (
            id, sku, name, category, brand, min_stock, description, created_at, updated_at
          ),
          store:stores (
            id, name, location, created_at
          )
        `);

      if (error) throw error;
      if (data) setInventory(data as InventoryEntry[]);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Realtime subscription ---
  useEffect(() => {
    loadInventory();

    const channel = supabase
      .channel("inventory_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_inventory" }, (payload) => {
        const updatedEntry = payload.new as InventoryEntry;
        setInventory((prev) => {
          const filtered = prev.filter((e) => e.id !== updatedEntry.id);
          return [...filtered, updatedEntry];
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // --- Filtered & Sorted Inventory ---
  const filteredInventory = useMemo(() => {
    let data = inventory.filter((entry) => {
      const matchesSearch =
        searchTerm === "" ||
        entry.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStore = storeFilter === "all" || entry.store_id === storeFilter;
      return matchesSearch && matchesStore;
    });

    data.sort((a, b) => {
      let aVal: any = sortKey === "item.name" ? a.item.name : a[sortKey];
      let bVal: any = sortKey === "item.name" ? b.item.name : b[sortKey];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [inventory, searchTerm, storeFilter, sortKey, sortOrder]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
  const paginatedInventory = filteredInventory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // --- Unique stores for filter dropdown ---
  const stores = useMemo(() => {
    const map: Record<string, string> = { all: "All Stores" };
    inventory.forEach((entry) => {
      map[entry.store.id] = entry.store.name;
    });
    return map;
  }, [inventory]);

  // --- Determine row color based on stock ---
  const getStockColor = (entry: InventoryEntry) => {
    const minStock = entry.min_stock || entry.item.min_stock || 0;
    if (entry.quantity <= minStock) return "bg-red-50 text-red-600";
    if (entry.quantity <= minStock * 2) return "bg-yellow-50 text-yellow-600";
    return "bg-green-50 text-green-600";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border rounded w-full md:w-1/2"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-3 py-2 border rounded w-full md:w-1/4"
        >
          {Object.entries(stores).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th
                className="px-4 py-2 cursor-pointer"
                onClick={() => {
                  setSortKey("item.name");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              >
                Item Name
              </th>
              <th
                className="px-4 py-2 cursor-pointer"
                onClick={() => {
                  setSortKey("item.sku");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              >
                SKU
              </th>
              <th
                className="px-4 py-2 cursor-pointer text-right"
                onClick={() => {
                  setSortKey("quantity");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              >
                Quantity
              </th>
              <th className="px-4 py-2 text-right">Min Stock</th>
              <th className="px-4 py-2">Store</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedInventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              paginatedInventory.map((entry) => (
                <tr key={entry.id} className={getStockColor(entry)}>
                  <td className="px-4 py-2">{entry.item.name}</td>
                  <td className="px-4 py-2">{entry.item.sku || "N/A"}</td>
                  <td className="px-4 py-2 text-right font-semibold">{entry.quantity}</td>
                  <td className="px-4 py-2 text-right">{entry.min_stock || entry.item.min_stock}</td>
                  <td className="px-4 py-2">{entry.store.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1 border rounded">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Inventory;
