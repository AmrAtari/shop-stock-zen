import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  id: string;
  sku?: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  color_id: string;
  department: string;
  description?: string;
  gender: string;
  item_color_code?: string;
  item_number?: string;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  created_at: string;
}

interface StoreInventory {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  min_stock: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
  item: Item;
  store: Store;
  updating?: boolean; // For inline editing feedback
}

const ITEMS_PER_PAGE = 20;

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<StoreInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof StoreInventory | "item.name" | "total_quantity">("item.name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Load Inventory
  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("store_inventory").select(`*, item:items (*), store:stores (*)`);
      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();

    // Realtime updates
    const subscription = supabase
      .channel("public:store_inventory")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_inventory" }, (payload) => {
        setInventory((prev) => {
          const updated = [...prev];
          const index = updated.findIndex((i) => i.id === payload.new?.id);
          if (payload.eventType === "DELETE") {
            if (index !== -1) updated.splice(index, 1);
          } else if (payload.new) {
            if (index !== -1) updated[index] = { ...updated[index], ...payload.new };
            else updated.push(payload.new as StoreInventory);
          }
          return updated;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // Filter
  const filteredInventory = useMemo(() => {
    return inventory.filter((i) => {
      const matchesStore = storeFilter === "all" || i.store_id === storeFilter;
      const matchesSearch =
        !searchTerm ||
        i.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      return matchesStore && matchesSearch;
    });
  }, [inventory, storeFilter, searchTerm]);

  // Sorting
  const sortedInventory = useMemo(() => {
    return [...filteredInventory].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      if (sortField === "total_quantity") {
        const totalA = inventory.filter((i) => i.item_id === a.item_id).reduce((sum, i) => sum + i.quantity, 0);
        const totalB = inventory.filter((i) => i.item_id === b.item_id).reduce((sum, i) => sum + i.quantity, 0);
        aValue = totalA;
        bValue = totalB;
      } else if (sortField.startsWith("item.")) {
        const key = sortField.split(".")[1] as keyof Item;
        aValue = a.item[key];
        bValue = b.item[key];
      } else {
        aValue = (a as any)[sortField];
        bValue = (b as any)[sortField];
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredInventory, sortField, sortDirection, inventory]);

  // Pagination
  const totalPages = Math.ceil(sortedInventory.length / ITEMS_PER_PAGE);
  const paginatedInventory = sortedInventory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Total stock across all stores
  const totalStockMap = useMemo(() => {
    const map: { [itemId: string]: number } = {};
    inventory.forEach((i) => {
      if (!map[i.item_id]) map[i.item_id] = 0;
      map[i.item_id] += i.quantity;
    });
    return map;
  }, [inventory]);

  // CSV export
  const exportCSV = () => {
    const header = ["Item Name", "SKU", "Store", "Quantity", "Min Stock", "Total Stock"];
    const rows = inventory.map((i) => [
      i.item.name,
      i.item.sku,
      i.store.name,
      i.quantity.toString(),
      i.min_stock.toString(),
      (totalStockMap[i.item_id] || i.quantity).toString(),
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

  // Inline update quantity
  const updateQuantity = async (id: string, value: number) => {
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: value, updating: true } : i)));
    const { error } = await supabase.from("store_inventory").update({ quantity: value }).eq("id", id);
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, updating: false } : i)));
    if (error) alert("Failed to update quantity: " + error.message);
  };

  // Summary
  const totalItems = useMemo(() => new Set(inventory.map((i) => i.item_id)).size, [inventory]);
  const totalQuantity = useMemo(() => inventory.reduce((sum, i) => sum + i.quantity, 0), [inventory]);
  const lowStockCount = useMemo(() => inventory.filter((i) => i.quantity <= i.min_stock).length, [inventory]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

      {/* Dashboard */}
      <div className="flex gap-4 mb-6">
        <div className="px-4 py-2 bg-blue-100 rounded">
          Total Items: <strong>{totalItems}</strong>
        </div>
        <div className="px-4 py-2 bg-green-100 rounded">
          Total Quantity: <strong>{totalQuantity}</strong>
        </div>
        <div className="px-4 py-2 bg-red-100 rounded">
          Low Stock Items: <strong>{lowStockCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name or SKU..."
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
          {inventory
            .map((i) => i.store)
            .filter((v, i, a) => a.findIndex((s) => s.id === v.id) === i)
            .map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
        </select>
        <button onClick={exportCSV} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Export CSV
        </button>
      </div>

      {/* Table */}
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-4 py-2 cursor-pointer"
              onClick={() => {
                setSortField("item.name");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}
            >
              Item
            </th>
            <th
              className="px-4 py-2 cursor-pointer"
              onClick={() => {
                setSortField("item.sku");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}
            >
              SKU
            </th>
            <th className="px-4 py-2">Store</th>
            <th
              className="px-4 py-2 cursor-pointer text-right"
              onClick={() => {
                setSortField("quantity");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}
            >
              Quantity
            </th>
            <th className="px-4 py-2 text-right">Min Stock</th>
            <th
              className="px-4 py-2 text-right cursor-pointer"
              onClick={() => {
                setSortField("total_quantity");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}
            >
              Total Stock
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedInventory.map((i) => (
            <tr key={i.id} className={`hover:bg-gray-50 ${i.updating ? "bg-green-100 animate-pulse" : ""}`}>
              <td className="px-4 py-2">{i.item.name}</td>
              <td className="px-4 py-2">{i.item.sku}</td>
              <td className="px-4 py-2">{i.store.name}</td>
              <td
                className={`px-4 py-2 text-right ${i.quantity <= i.min_stock ? "text-red-600 font-bold" : i.quantity <= i.min_stock * 2 ? "text-yellow-600" : "text-green-600"}`}
              >
                <input
                  type="number"
                  value={i.quantity}
                  onChange={(e) => updateQuantity(i.id, parseInt(e.target.value) || 0)}
                  className="w-16 text-right border rounded px-1 py-0.5"
                />
              </td>
              <td className="px-4 py-2 text-right">{i.min_stock}</td>
              <td className="px-4 py-2 text-right">{totalStockMap[i.item_id] || i.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded"
        >
          Prev
        </button>
        <span className="px-3 py-1">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Inventory;
