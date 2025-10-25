import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CSVLink } from "react-csv";

interface Item {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  gender?: string;
  season?: string;
  unit?: string;
  quantity?: number;
  min_stock?: number;
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
  min_stock: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
  item: Item;
  store: Store;
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

  // --- Load Inventory ---
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

  // --- Realtime Subscription ---
  useEffect(() => {
    loadInventory();

    const subscription = supabase
      .channel("public:store_inventory")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_inventory" }, async (payload) => {
        setInventory((prev) => {
          const updated = [...prev];
          const index = updated.findIndex((i) => i.id === payload.new?.id);
          if (payload.eventType === "DELETE") {
            if (index !== -1) updated.splice(index, 1);
          } else if (payload.new) {
            const newItem = payload.new;
            // If exists, update
            if (index !== -1) {
              updated[index] = { ...updated[index], ...newItem };
            } else {
              // Fetch item and store data if new
              fetchItemAndStore(newItem.item_id, newItem.store_id).then((entry) =>
                setInventory((prev) => [...prev, entry]),
              );
            }
          }
          return updated;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchItemAndStore = async (item_id: string, store_id: string) => {
    const { data: itemData } = await supabase.from("items").select("*").eq("id", item_id).single();
    const { data: storeData } = await supabase.from("stores").select("*").eq("id", store_id).single();
    return {
      ...itemData,
      store_id,
      item_id,
      quantity: 0,
      min_stock: itemData?.min_stock || 0,
      item: itemData,
      store: storeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      id: `${item_id}-${store_id}-${Date.now()}`,
    } as StoreInventory;
  };

  // --- Filter Inventory ---
  const filteredInventory = useMemo(() => {
    return inventory.filter((i) => {
      const matchesStore = storeFilter === "all" || i.store_id === storeFilter;
      const matchesSearch =
        !searchTerm ||
        i.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSearch;
    });
  }, [inventory, storeFilter, searchTerm]);

  // --- Sorting ---
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

  // --- Pagination ---
  const totalPages = Math.ceil(sortedInventory.length / ITEMS_PER_PAGE);
  const paginatedInventory = sortedInventory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Total Stock Across All Stores ---
  const totalStockMap = useMemo(() => {
    const map: { [itemId: string]: number } = {};
    inventory.forEach((i) => {
      if (!map[i.item_id]) map[i.item_id] = 0;
      map[i.item_id] += i.quantity;
    });
    return map;
  }, [inventory]);

  // --- CSV Export ---
  const csvData = inventory.map((i) => ({
    "Item Name": i.item.name,
    SKU: i.item.sku,
    Store: i.store.name,
    Quantity: i.quantity,
    "Min Stock": i.min_stock,
    "Total Stock": totalStockMap[i.item_id] || i.quantity,
  }));

  // --- Low Stock Count ---
  const lowStockCount = inventory.filter((i) => i.quantity <= (i.min_stock || 0)).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        {lowStockCount > 0 && (
          <span className="px-3 py-1 bg-red-600 text-white rounded">{lowStockCount} Critical Items</span>
        )}
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
        <CSVLink
          data={csvData}
          filename={"inventory_report.csv"}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Export CSV
        </CSVLink>
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
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{i.item.name}</td>
              <td className="px-4 py-2">{i.item.sku}</td>
              <td className="px-4 py-2">{i.store.name}</td>
              <td
                className={`px-4 py-2 text-right ${i.quantity <= (i.min_stock || 0) ? "text-red-600 font-bold" : i.quantity <= (i.min_stock || 0) * 2 ? "text-yellow-600" : "text-green-600"}`}
              >
                {i.quantity}
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
