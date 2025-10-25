import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  gender: string;
  season: string;
  unit: string;
  min_stock: number;
  max_stock?: number;
  department: string;
  item_number: string;
  item_color_code: string;
  origin: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  created_at: string;
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

type SortKey = keyof InventoryEntry | "item.name" | "item.sku" | "store.name";

const PAGE_SIZE = 20;

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("item.name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Load inventory
  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("store_inventory").select(`
          *,
          item:items(*),
          store:stores(*)
        `);

      if (error) throw error;
      if (!data) return;

      setInventory(data as InventoryEntry[]);
    } catch (err) {
      console.error("Error loading inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    const fetchData = async () => await loadInventory();
    fetchData();

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter & Sort
  const filteredInventory = inventory
    .filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStore = storeFilter === "all" || item.store_id === storeFilter;

      return matchesSearch && matchesStore;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case "item.name":
          aVal = a.item.name;
          bVal = b.item.name;
          break;
        case "item.sku":
          aVal = a.item.sku;
          bVal = b.item.sku;
          break;
        case "store.name":
          aVal = a.store.name;
          bVal = b.store.name;
          break;
        default:
          aVal = a[sortKey as keyof InventoryEntry];
          bVal = b[sortKey as keyof InventoryEntry];
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / PAGE_SIZE);
  const paginatedInventory = filteredInventory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((item) => {
      stores[item.store_id] = item.store.name;
    });
    return stores;
  };

  // Total Stock per Item
  const totalStockMap: { [itemId: string]: number } = {};
  inventory.forEach((entry) => {
    totalStockMap[entry.item_id] = (totalStockMap[entry.item_id] || 0) + entry.quantity;
  });

  // CSV Export
  const exportCSV = () => {
    const header = ["Item Name", "SKU", "Store", "Quantity", "Total Stock", "Min Stock", "Description"];
    const rows = filteredInventory.map((entry) => [
      entry.item.name,
      entry.item.sku,
      entry.store.name,
      entry.quantity,
      totalStockMap[entry.item_id],
      entry.min_stock,
      entry.item.description,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, SKU, or description"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // reset page when searching
          }}
          className="px-3 py-2 border rounded-md flex-1"
        />
        <select
          value={storeFilter}
          onChange={(e) => {
            setStoreFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border rounded-md md:w-64"
        >
          {Object.entries(getUniqueStores()).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="col-span-3 cursor-pointer" onClick={() => setSortKey("item.name")}>
            Item {sortKey === "item.name" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
          </div>
          <div className="col-span-2 cursor-pointer" onClick={() => setSortKey("item.sku")}>
            SKU {sortKey === "item.sku" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
          </div>
          <div className="col-span-2 text-right cursor-pointer" onClick={() => setSortKey("quantity")}>
            Quantity
          </div>
          <div className="col-span-2 text-right">Total Stock</div>
          <div className="col-span-1 text-right">Min Stock</div>
          <div className="col-span-2 cursor-pointer" onClick={() => setSortKey("store.name")}>
            Store
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : paginatedInventory.length === 0 ? (
          <div className="p-8 text-center">No items found.</div>
        ) : (
          paginatedInventory.map((entry) => {
            const stockColor =
              entry.quantity <= entry.min_stock
                ? "text-red-600"
                : entry.quantity <= entry.min_stock * 2
                  ? "text-yellow-600"
                  : "text-green-600";

            return (
              <div
                key={entry.id}
                className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-3">{highlightText(entry.item.name)}</div>
                <div className="col-span-2">{highlightText(entry.item.sku)}</div>
                <div className={`col-span-2 text-right font-semibold ${stockColor}`}>{entry.quantity}</div>
                <div className="col-span-2 text-right">{totalStockMap[entry.item_id]}</div>
                <div className="col-span-1 text-right">{entry.min_stock}</div>
                <div className="col-span-2">{entry.store.name}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Inventory;
