import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CSVLink } from "react-csv";

// --- TypeScript Interfaces ---
interface Item {
  id: string;
  name: string;
  sku: string;
  description?: string;
  brand: string;
  category: string;
  color: string;
  color_id: string;
  size?: string;
  gender?: string;
  season?: string;
  unit?: string;
  min_stock?: number;
  max_stock?: number;
  price?: number;
  cost?: number;
  created_at: string;
  updated_at: string;
}

interface Store {
  id: string;
  name: string;
  location?: string;
  created_at: string;
}

interface StoreInventory {
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

// --- Main Component ---
const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<StoreInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof StoreInventory | "total_quantity">("item.name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // --- Load inventory from Supabase ---
  const loadInventory = async () => {
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

  // --- Realtime subscription ---
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
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                ...payload.new,
              };
            } else {
              // INSERT: fetch item and store
              fetchItemAndStore(payload.new.item_id, payload.new.store_id).then((entry) =>
                setInventory((prev) => [...prev, entry]),
              );
            }
          }
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // --- Helper: fetch item & store for new rows ---
  const fetchItemAndStore = async (item_id: string, store_id: string) => {
    const { data: itemData } = await supabase.from("items").select("*").eq("id", item_id).single();

    const { data: storeData } = await supabase.from("stores").select("*").eq("id", store_id).single();

    return {
      ...itemData,
      store_id,
      item_id,
      quantity: 0,
      min_stock: itemData.min_stock,
      item: itemData,
      store: storeData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      id: `${item_id}-${store_id}-${Date.now()}`,
    } as StoreInventory;
  };

  // --- Filtered & Searched Inventory ---
  const filteredInventory = useMemo(() => {
    return inventory.filter((i) => {
      const matchesStore = storeFilter === "all" || i.store_id === storeFilter || i.store?.id === storeFilter;
      const matchesSearch =
        !searchTerm ||
        i.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.item.description?.toLowerCase().includes(searchTerm.toLowerCase());
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

  // --- Total stock across all stores ---
  const totalStockByItem = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((i) => {
      map[i.item_id] = (map[i.item_id] || 0) + i.quantity;
    });
    return map;
  }, [inventory]);

  // --- CSV Export ---
  const csvData = useMemo(() => {
    return inventory.map((i) => ({
      Item: i.item.name,
      SKU: i.item.sku,
      Store: i.store.name,
      Quantity: i.quantity,
      MinStock: i.min_stock,
      TotalStock: totalStockByItem[i.item_id],
    }));
  }, [inventory, totalStockByItem]);

  // --- Highlight stock ---
  const getStockColor = (item: StoreInventory) => {
    if (item.quantity <= (item.min_stock || 0)) return "text-red-600";
    if (item.quantity <= (item.min_stock || 0) * 2) return "text-yellow-600";
    return "text-green-600";
  };

  // --- Render ---
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage and track your inventory across all stores</p>
        </div>
        <CSVLink
          data={csvData}
          filename={"inventory_report.csv"}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Export CSV
        </CSVLink>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name, SKU, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading inventory...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Store</th>
                <th className="px-4 py-2 text-right">Quantity</th>
                <th className="px-4 py-2 text-right">Min Stock</th>
                <th className="px-4 py-2 text-right">Total Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedInventory.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{i.item.name}</td>
                  <td className="px-4 py-2">{i.item.sku}</td>
                  <td className="px-4 py-2">{i.store.name}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${getStockColor(i)}`}>{i.quantity}</td>
                  <td className="px-4 py-2 text-right">{i.min_stock || 0}</td>
                  <td className="px-4 py-2 text-right">{totalStockByItem[i.item_id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inventory;
