import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
  cost?: number;
  category?: string;
  storeId?: string;
  store_id?: string;
  store?: {
    id: string;
    name: string;
  };
  barcode?: string;
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
  const [showDebug, setShowDebug] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [debugInfo, setDebugInfo] = useState<any>({});

  /** Debug storage and global variables */
  const debugAllStorage = () => {
    const storageData: any = {
      localStorage: {},
      sessionStorage: {},
      globalVariables: {},
      urlParams: window.location.search,
      currentPath: window.location.pathname,
      userAgent: window.navigator.userAgent,
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

    const globalVars = ["inventory", "storeData", "supabase", "queryClient", "react"];
    globalVars.forEach((varName) => {
      if ((window as any)[varName]) {
        storageData.globalVariables[varName] = (window as any)[varName];
      }
    });

    setDebugInfo(storageData);
    return storageData;
  };

  /** Analyze inventory to create store summary */
  const analyzeStores = (inventoryData: InventoryItem[]): StoreSummary => {
    const stores: StoreSummary = {};
    inventoryData.forEach((item) => {
      const storeId = item.storeId || item.store_id || item.store?.id || "unknown-store";
      const storeName = item.store?.name || storeId;
      if (!stores[storeId]) {
        stores[storeId] = { count: 0, items: [], storeName };
      }
      stores[storeId].count++;
      stores[storeId].items.push(item);
    });
    return stores;
  };

  /** Load inventory from Supabase */
  const loadInventory = async () => {
    try {
      setLoading(true);
      debugAllStorage();

      // Fetch inventory with store info if available
      const { data, error } = await supabase.from("inventory").select("*, store:storeId(*)"); // Adjust column and relationship

      if (error) throw error;
      if (data) setInventory(data as InventoryItem[]);
      console.log(`✅ Loaded ${data?.length || 0} items from Supabase`);
    } catch (err) {
      console.error("❌ Inventory load failed:", err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  /** Filtered inventory based on search and store filter */
  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const matchesSearch =
          !searchTerm ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStore =
          storeFilter === "all" ||
          item.storeId === storeFilter ||
          item.store_id === storeFilter ||
          item.store?.id === storeFilter;
        return matchesSearch && matchesStore;
      }),
    [inventory, searchTerm, storeFilter],
  );

  /** Unique stores for dropdown */
  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((item) => {
      const storeId = item.storeId || item.store_id || item.store?.id;
      const storeName = item.store?.name || storeId || "Unknown Store";
      if (storeId) stores[storeId] = storeName;
    });
    return stores;
  };

  /** Memoized store summary */
  const storeSummary = useMemo(() => analyzeStores(inventory), [inventory]);

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
          onClick={() => setShowDebug(!showDebug)}
          className={`px-4 py-2 rounded-md font-medium ${
            showDebug ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {showDebug ? "Hide Debug" : "Show Debug"}
        </button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="mb-6 p-4 border-2 border-red-300 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-3">🛠️ Debug Panel</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={debugAllStorage}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            >
              Debug Storage
            </button>
            <button
              onClick={loadInventory}
              className="px-3 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
            >
              Reload Inventory
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Local Storage:</strong>
              <div className="text-xs text-gray-600 mt-1">
                {Object.keys(debugInfo.localStorage || {}).length > 0
                  ? Object.keys(debugInfo.localStorage || {}).join(", ")
                  : "No inventory data found"}
              </div>
            </div>
            <div>
              <strong>Session Storage:</strong>
              <div className="text-xs text-gray-600 mt-1">
                {Object.keys(debugInfo.sessionStorage || {}).length > 0
                  ? Object.keys(debugInfo.sessionStorage || {}).join(", ")
                  : "No session data"}
              </div>
            </div>
            <div>
              <strong>Total Items:</strong>
              <div className="text-xs text-gray-600 mt-1">{inventory.length} items loaded</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters, Store Summary, and Inventory Table */}
      {/* ... Keep your existing filter and table UI here ... */}
    </div>
  );
};

export default Inventory;
