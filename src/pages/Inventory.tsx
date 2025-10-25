import React, { useEffect, useState, useMemo } from "react";

// TypeScript interfaces
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
  const [debugInfo, setDebugInfo] = useState<{
    localStorage: Record<string, any>;
    sessionStorage: Record<string, any>;
    globalVariables: Record<string, any>;
    urlParams?: string;
    currentPath?: string;
  }>({
    localStorage: {},
    sessionStorage: {},
    globalVariables: {},
  });

  // Helper: Get store ID and Name
  const getStoreId = (item: InventoryItem) => item.storeId || item.store_id || item.store?.id || "unknown-store";
  const getStoreName = (item: InventoryItem) => item.store?.name || getStoreId(item);

  // Debugging
  const debugAllStorage = () => {
    console.log("🛠️ === COMPREHENSIVE STORAGE DEBUGGING ===");

    const storageData: any = {
      localStorage: {},
      sessionStorage: {},
      globalVariables: {},
      urlParams: window.location.search,
      currentPath: window.location.pathname,
    };

    // localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        try {
          storageData.localStorage[key] = value ? JSON.parse(value) : null;
        } catch {
          storageData.localStorage[key] = value;
        }
      }
    }

    // sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        try {
          storageData.sessionStorage[key] = value ? JSON.parse(value) : null;
        } catch {
          storageData.sessionStorage[key] = value;
        }
      }
    }

    // global vars
    const globalVars = ["inventory", "storeData", "supabase", "queryClient", "react"];
    globalVars.forEach((varName) => {
      if ((window as any)[varName]) {
        storageData.globalVariables[varName] = (window as any)[varName];
      }
    });

    console.log("📦 Storage Debug Results:", storageData);
    setDebugInfo(storageData);
    return storageData;
  };

  // Analyze inventory by store
  const analyzeStores = (inventoryData: InventoryItem[]): StoreSummary => {
    if (!inventoryData || inventoryData.length === 0) return {};

    const stores: StoreSummary = {};
    inventoryData.forEach((item) => {
      const storeId = getStoreId(item);
      const storeName = getStoreName(item);

      if (!stores[storeId]) stores[storeId] = { count: 0, items: [], storeName };
      stores[storeId].count++;
      stores[storeId].items.push(item);
    });

    return stores;
  };

  const storeSummary = useMemo(() => analyzeStores(inventory), [inventory]);

  // Load inventory
  const loadInventory = async () => {
    try {
      console.log("🔄 Loading inventory...");
      setLoading(true);

      const storageData = debugAllStorage();
      let inventoryData: InventoryItem[] = [];

      // Check localStorage for inventory
      Object.keys(storageData.localStorage).forEach((key) => {
        if (key.toLowerCase().includes("inventory") || key.toLowerCase().includes("items")) {
          const data = storageData.localStorage[key];
          if (Array.isArray(data)) inventoryData = [...inventoryData, ...data];
          else if (data?.items && Array.isArray(data.items)) inventoryData = [...inventoryData, ...data.items];
        }
      });

      // Fallback API endpoints
      if (inventoryData.length === 0) {
        const endpoints = [
          "/api/inventory",
          "/api/items",
          "/api/inventory/items",
          "/api/products",
          "/inventory",
          "/items",
        ];
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint);
            if (!response.ok) continue;

            const data = await response.json();
            if (Array.isArray(data)) inventoryData = data;
            else if (data?.items && Array.isArray(data.items)) inventoryData = data.items;
            else if (data?.data && Array.isArray(data.data)) inventoryData = data.data;
            else if (data && typeof data === "object") inventoryData = [data];

            if (inventoryData.length > 0) break;
          } catch {}
        }
      }

      // Fallback sample data
      if (inventoryData.length === 0) inventoryData = createSampleData();

      setInventory(inventoryData);
      console.log(`✅ Inventory loaded: ${inventoryData.length} items`);
    } catch (error) {
      console.error("❌ Inventory load failed:", error);
      setInventory(createSampleData());
    } finally {
      setLoading(false);
    }
  };

  // Sample data for demo
  const createSampleData = (): InventoryItem[] => {
    const sampleStores = [
      { id: "store-1", name: "Main Store" },
      { id: "store-2", name: "Downtown Branch" },
      { id: "store-3", name: "Westside Mall" },
    ];

    return [
      {
        id: "item-1",
        name: "Laptop Computer",
        sku: "LT-001",
        quantity: 15,
        price: 999.99,
        cost: 750,
        category: "Electronics",
        storeId: "store-1",
        store: sampleStores[0],
        min_stock: 5,
        max_stock: 50,
      },
      {
        id: "item-2",
        name: "Wireless Mouse",
        sku: "WM-002",
        quantity: 42,
        price: 29.99,
        cost: 15,
        category: "Electronics",
        storeId: "store-1",
        store: sampleStores[0],
        min_stock: 10,
        max_stock: 100,
      },
      {
        id: "item-3",
        name: "Office Chair",
        sku: "OC-003",
        quantity: 8,
        price: 199.99,
        cost: 120,
        category: "Furniture",
        storeId: "store-2",
        store: sampleStores[1],
        min_stock: 3,
        max_stock: 25,
      },
      {
        id: "item-4",
        name: "Desk Lamp",
        sku: "DL-004",
        quantity: 23,
        price: 49.99,
        cost: 25,
        category: "Furniture",
        storeId: "store-2",
        store: sampleStores[1],
        min_stock: 5,
        max_stock: 50,
      },
      {
        id: "item-5",
        name: "Notebook Set",
        sku: "NS-005",
        quantity: 67,
        price: 12.99,
        cost: 6.5,
        category: "Stationery",
        storeId: "store-3",
        store: sampleStores[2],
        min_stock: 20,
        max_stock: 200,
      },
    ];
  };

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return inventory.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term);
      const matchesStore = storeFilter === "all" || getStoreId(item) === storeFilter;
      return matchesSearch && matchesStore;
    });
  }, [inventory, searchTerm, storeFilter]);

  // Unique stores for filter
  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((item) => {
      stores[getStoreId(item)] = getStoreName(item);
    });
    return stores;
  };

  // Load inventory on mount
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
          className={`px-4 py-2 rounded-md font-medium ${showDebug ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
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
            <button
              onClick={() => analyzeStores(inventory)}
              className="px-3 py-2 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600"
            >
              Analyze Stores
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Local Storage:</strong>
              <div className="text-xs text-gray-600 mt-1">
                {Object.keys(debugInfo.localStorage || {}).length > 0
                  ? Object.keys(debugInfo.localStorage).join(", ")
                  : "No inventory data found"}
              </div>
            </div>
            <div>
              <strong>Session Storage:</strong>
              <div className="text-xs text-gray-600 mt-1">
                {Object.keys(debugInfo.sessionStorage || {}).length > 0
                  ? Object.keys(debugInfo.sessionStorage).join(", ")
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

      {/* Filters */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(getUniqueStores()).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {filteredInventory.length} of {inventory.length} items
          </span>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-sm text-blue-600 hover:text-blue-800">
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Store Summary */}
      {Object.keys(storeSummary).length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(storeSummary).map(([storeId, storeData]) => (
              <div
                key={storeId}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{storeData.storeName}</h3>
                <div className="text-2xl font-bold text-blue-600 mb-1">{storeData.count}</div>
                <div className="text-sm text-gray-600">items in stock</div>
                <button
                  onClick={() => setStoreFilter(storeId)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  View items →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              {inventory.length === 0
                ? "No inventory data available. Check the debug panel for issues."
                : "No items match your current filters."}
            </p>
            {inventory.length === 0 && (
              <button onClick={loadInventory} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Retry Loading
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              <div className="col-span-4">Item</div>
              <div className="col-span-2">SKU</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2">Store</div>
            </div>
            {filteredInventory.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-4">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</div>
                  )}
                </div>
                <div className="col-span-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{item.sku || "N/A"}</code>
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className={`font-semibold ${item.quantity <= (item.min_stock || 0) ? "text-red-600" : item.quantity <= (item.min_stock || 0) * 2 ? "text-yellow-600" : "text-green-600"}`}
                  >
                    {item.quantity}
                  </span>
                  {item.min_stock && <div className="text-xs text-gray-500 mt-1">min: {item.min_stock}</div>}
                </div>
                <div className="col-span-2 text-right">
                  {item.price ? (
                    <>
                      <div className="font-semibold text-gray-900">${item.price.toFixed(2)}</div>
                      {item.cost && <div className="text-xs text-gray-500">cost: ${item.cost.toFixed(2)}</div>}
                    </>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getStoreName(item)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
