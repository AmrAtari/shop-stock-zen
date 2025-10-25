import React, { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client"; // ✅ Corrected path

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
  cost?: number;
  category?: string;
  store_id?: string;
  store?: {
    id: string;
    name: string;
  };
  description?: string;
  min_stock?: number;
  max_stock?: number;
  created_at?: string;
  updated_at?: string;
}

interface StoreSummary {
  [storeId: string]: {
    count: number;
    items: InventoryItem[];
    storeName: string;
  };
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // 🧠 Fetch inventory and store data from Supabase
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Join items with their related stores
      const { data, error } = await supabase.from("items") // adjust to your actual table name
        .select(`
          id,
          name,
          sku,
          quantity,
          price,
          cost,
          category,
          store_id,
          description,
          min_stock,
          max_stock,
          created_at,
          updated_at,
          store:store_id ( id, name )
        `);

      if (error) throw error;

      if (data) {
        setInventory(data as InventoryItem[]);
        console.log("✅ Loaded inventory:", data);
      }
    } catch (err: any) {
      console.error("❌ Failed to load inventory:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // 📊 Group items by store
  const analyzeStores = (items: InventoryItem[]): StoreSummary => {
    const stores: StoreSummary = {};
    items.forEach((item) => {
      const storeId = item.store_id || "unknown";
      const storeName = item.store?.name || storeId;
      if (!stores[storeId]) {
        stores[storeId] = { count: 0, items: [], storeName };
      }
      stores[storeId].count++;
      stores[storeId].items.push(item);
    });
    return stores;
  };

  const storeSummary = analyzeStores(inventory);

  // 🔍 Filtering logic
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStore = storeFilter === "all" || item.store_id === storeFilter || item.store?.id === storeFilter;

    return matchesSearch && matchesStore;
  });

  // 🏬 Store filter dropdown
  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((item) => {
      if (item.store_id && item.store?.name) {
        stores[item.store_id] = item.store.name;
      }
    });
    return stores;
  };

  // 🔄 Realtime sync listener — auto-refresh when inventory updates
  useEffect(() => {
    const channel = supabase
      .channel("inventory-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, (payload) => {
        console.log("🔔 Inventory update detected:", payload);
        loadInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">Track and manage items across all stores</p>
        </div>
        <button onClick={loadInventory} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Refresh
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">⚠️ Error: {error}</div>}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Inventory
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:w-64">
            <label htmlFor="store-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Store
            </label>
            <select
              id="store-filter"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(getUniqueStores()).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-600">Loading inventory...</div>
      ) : filteredInventory.length === 0 ? (
        <div className="p-8 text-center text-gray-600">No items found</div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Store Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(storeSummary).map(([storeId, store]) => (
                <div key={storeId} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow transition">
                  <h3 className="font-semibold">{store.storeName}</h3>
                  <p className="text-2xl font-bold text-blue-600">{store.count}</p>
                  <button onClick={() => setStoreFilter(storeId)} className="text-blue-500 text-sm mt-2">
                    View items →
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-700 border-b">
              <div className="col-span-4">Item</div>
              <div className="col-span-2">SKU</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2">Store</div>
            </div>

            {filteredInventory.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-gray-50 transition">
                <div className="col-span-4">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                </div>
                <div className="col-span-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{item.sku || "N/A"}</code>
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className={`font-semibold ${
                      item.quantity <= (item.min_stock || 0)
                        ? "text-red-600"
                        : item.quantity <= (item.min_stock || 0) * 2
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}
                  >
                    {item.quantity}
                  </span>
                </div>
                <div className="col-span-2 text-right">{item.price ? `$${item.price.toFixed(2)}` : "—"}</div>
                <div className="col-span-2">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {item.store?.name || "Unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Inventory;
