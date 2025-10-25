import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

const ITEMS_PER_PAGE = 20;

interface Item {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  gender?: string;
  season?: string;
  unit?: string;
  quantity: number;
  min_stock?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface Store {
  id: string;
  name: string;
  location?: string;
  created_at?: string;
}

interface StoreInventory {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  min_stock?: number;
  last_restocked?: string;
  created_at?: string;
  updated_at?: string;
  item: Item;
  store: Store;
}

const Inventory = () => {
  const [inventory, setInventory] = useState<StoreInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Load inventory data from Supabase
  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("store_inventory").select(`
          *,
          item:items (
            id, sku, name, description, min_stock
          ),
          store:stores (
            id, name, location
          )
        `);

      if (error) {
        console.error("Error fetching inventory:", error);
      } else if (data) {
        setInventory(data as StoreInventory[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((entry) => {
      const matchesSearch =
        entry.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStore = storeFilter === "all" || entry.store.id === storeFilter;

      return matchesSearch && matchesStore;
    });
  }, [inventory, searchTerm, storeFilter]);

  // Pagination
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventory, currentPage]);

  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);

  // Get unique stores for filter dropdown
  const uniqueStores = useMemo(() => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((inv) => {
      if (inv.store) stores[inv.store.id] = inv.store.name;
    });
    return stores;
  }, [inventory]);

  // Compute total stock per item across all stores
  const totalStockMap = useMemo(() => {
    const map: { [itemId: string]: number } = {};
    inventory.forEach((entry) => {
      map[entry.item_id] = (map[entry.item_id] || 0) + entry.quantity;
    });
    return map;
  }, [inventory]);

  // CSV export
  const exportCSV = () => {
    const csvRows = [
      ["Item Name", "SKU", "Store", "Quantity", "Min Stock", "Total Stock"],
      ...filteredInventory.map((entry) => [
        entry.item.name,
        entry.item.sku || "",
        entry.store.name,
        entry.quantity,
        entry.item.min_stock || 0,
        totalStockMap[entry.item_id] || 0,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="border rounded px-3 py-2 md:w-64"
        >
          {Object.entries(uniqueStores).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow border">
        {loading ? (
          <div className="p-8 text-center">Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center">No items found.</div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-left px-4 py-2">SKU</th>
                <th className="text-left px-4 py-2">Store</th>
                <th className="text-right px-4 py-2">Quantity</th>
                <th className="text-right px-4 py-2">Min Stock</th>
                <th className="text-right px-4 py-2">Total Stock</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInventory.map((entry) => {
                const qty = entry.quantity;
                const min = entry.item.min_stock || 0;
                let colorClass = "text-green-600";
                if (qty <= min) colorClass = "text-red-600";
                else if (qty <= min * 2) colorClass = "text-yellow-600";

                return (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{entry.item.name}</td>
                    <td className="px-4 py-2">{entry.item.sku || "N/A"}</td>
                    <td className="px-4 py-2">{entry.store.name}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${colorClass}`}>{qty}</td>
                    <td className="px-4 py-2 text-right">{min}</td>
                    <td className="px-4 py-2 text-right">{totalStockMap[entry.item_id]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} className="px-3 py-1 border rounded">
            Prev
          </button>
          <span>
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Inventory;
