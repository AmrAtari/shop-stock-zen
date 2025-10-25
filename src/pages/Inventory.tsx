import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Types
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

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [debugInfo, setDebugInfo] = useState<any>({});

  /** Debug storage */
  const debugAllStorage = () => {
    const storageData: any = {
      localStorage: {},
      sessionStorage: {},
      urlParams: window.location.search,
      currentPath: window.location.pathname,
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          storageData.localStorage[key] = value ? JSON.parse(value) : null;
        } catch {
          storageData.localStorage[key] = localStorage.getItem(key);
        }
      }
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        try {
          const value = sessionStorage.getItem(key);
          storageData.sessionStorage[key] = value ? JSON.parse(value) : null;
        } catch {
          storageData.sessionStorage[key] = sessionStorage.getItem(key);
        }
      }
    }

    setDebugInfo(storageData);
    return storageData;
  };

  /** Load inventory from Supabase */
  const loadInventory = async () => {
    try {
      setLoading(true);
      debugAllStorage();

      const { data, error } = await supabase.from("store_inventory").select(`
          *,
          item:items (
            id,
            name,
            sku,
            description,
            min_stock
          ),
          store:stores (
            id,
            name
          )
        `);

      if (error) throw error;
      setInventory(data || []);
      console.log(`✅ Loaded ${data?.length || 0} inventory entries from Supabase`);
    } catch (err) {
      console.error("❌ Inventory load failed:", err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  /** Filtered inventory */
  const filteredInventory = useMemo(
    () =>
      inventory.filter((entry) => {
        const matchesSearch =
          !searchTerm ||
          entry.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.item.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStore = storeFilter === "all" || entry.store.id === storeFilter;

        return matchesSearch && matchesStore;
      }),
    [inventory, searchTerm, storeFilter],
  );

  /** Store summary */
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

  /** Unique stores for filter dropdown */
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage and track your inventory across all stores</p>
        </div>
        <button
          onClick={() => debugAllStorage()}
          className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
        >
          Debug Storage
        </button>
      </div>

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

      {/* Store Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.entries(storeSummary).map(([storeId, storeData]) => (
          <div key={storeId} className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900">{storeData.storeName}</h3>
            <div className="text-2xl font-bold text-blue-600">{storeData.count}</div>
            <div className="text-sm text-gray-600">items in stock</div>
            <button onClick={() => setStoreFilter(storeId)} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
              View items →
            </button>
          </div>
        ))}
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
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Min Stock</th>
                  <th className="px-4 py-2">Store</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="px-4 py-2">{entry.item.name}</td>
                    <td className="px-4 py-2">{entry.item.sku || "N/A"}</td>
                    <td
                      className={`px-4 py-2 font-semibold ${entry.quantity <= (entry.min_stock || entry.item.min_stock || 0) ? "text-red-600" : "text-green-600"}`}
                    >
                      {entry.quantity}
                    </td>
                    <td className="px-4 py-2">{entry.min_stock || entry.item.min_stock || "-"}</td>
                    <td className="px-4 py-2">{entry.store.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
