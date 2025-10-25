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

  // --- Filtered and Sorted Inventory ---
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

  // --- Unique Stores ---
  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((entry) => {
      const storeId = entry.store.id;
      const storeName = entry.store.name;
      if (storeId) stores[storeId] = storeName;
    });
    return stores;
  };

  // --- Low Stock Alerts ---
  const lowStockItems = useMemo(() => {
    return filteredInventory.filter((entry) => {
      const minStock = entry.min_stock || entry.item.min_stock || 0;
      return entry.quantity <= minStock;
    });
  }, [filteredInventory]);

  const lowStockSummary = useMemo(() => {
    const summary: { [storeId: string]: number } = {};
    lowStockItems.forEach((entry) => {
      summary[entry.store.id] = (summary[entry.store.id] || 0) + 1;
    });
    return summary;
  }, [lowStockItems]);

  // --- Browser Notification for Low Stock ---
  useEffect(() => {
    if (lowStockItems.length > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("⚠️ Low Stock Alert", {
          body: `${lowStockItems.length} items are below min stock`,
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("⚠️ Low Stock Alert", {
              body: `${lowStockItems.length} items are below min stock`,
            });
          }
        });
      }
    }
  }, [lowStockItems]);

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

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">⚠️ Low Stock Alerts</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(lowStockSummary).map(([storeId, count]) => (
              <div key={storeId} className="bg-red-100 px-3 py-2 rounded-md text-red-900 font-medium">
                {count} item{count > 1 ? "s" : ""} low in <strong>{getUniqueStores()[storeId]}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-right">Total Qty</th>
              <th className="px-4 py-2 text-right">Store Qty</th>
              <th className="px-4 py-2 text-right">Min Stock</th>
              <th className="px-4 py-2 text-left">Store</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedInventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              paginatedInventory.map((entry) => {
                const minStock = entry.min_stock || entry.item.min_stock || 0;
                const isLow = entry.quantity <= minStock;

                return (
                  <tr key={entry.id} className={isLow ? "bg-red-50" : ""}>
                    <td className="px-4 py-2">{entry.item.name}</td>
                    <td className="px-4 py-2">{entry.item.sku || "N/A"}</td>
                    <td className="px-4 py-2 text-right">{totalQuantityMap[entry.item_id]}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${isLow ? "text-red-600" : "text-green-600"}`}>
                      {entry.quantity}
                    </td>
                    <td className="px-4 py-2 text-right">{minStock}</td>
                    <td className="px-4 py-2">{entry.store.name}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
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
