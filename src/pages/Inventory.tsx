import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"] & {
  store?: { id: string; name: string };
  gender?: string | null;
  season?: string | null;
};

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

      const { data, error } = await supabase.from("inventory").select("*, store:storeId(*)"); // include related store info

      if (error) throw error;

      // ensure optional fields exist
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        gender: item.gender || null,
        season: item.season || null,
      }));

      setInventory(formattedData);
      console.log(`✅ Loaded ${data?.length || 0} items from Supabase`);
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

  /** Store summary */
  const storeSummary = useMemo(() => {
    const stores: StoreSummary = {};
    inventory.forEach((item) => {
      const storeId = item.storeId || item.store_id || item.store?.id || "unknown-store";
      const storeName = item.store?.name || storeId;
      if (!stores[storeId]) stores[storeId] = { count: 0, items: [], storeName };
      stores[storeId].count++;
      stores[storeId].items.push(item);
    });
    return stores;
  }, [inventory]);

  /** Unique stores for filter dropdown */
  const getUniqueStores = () => {
    const stores: { [key: string]: string } = { all: "All Stores" };
    inventory.forEach((item) => {
      const storeId = item.storeId || item.store_id || item.store?.id;
      const storeName = item.store?.name || storeId || "Unknown Store";
      if (storeId) stores[storeId] = storeName;
    });
    return stores;
  };

  /** CSV export helper */
  const exportCSV = () => {
    if (inventory.length === 0) return;
    const headers = Object.keys(inventory[0]);
    const csvRows = [
      headers.join(","), // header row
      ...inventory.map((item) => headers.map((h) => `"${(item as any)[h] ?? ""}"`).join(",")),
    ];
    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory.csv");
    link.click();
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
        <div className="flex gap-2">
          <button
            onClick={() => debugAllStorage()}
            className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            Debug Storage
          </button>
          <button
            onClick={() => exportCSV()}
            className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600"
          >
            Export CSV
          </button>
        </div>
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
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Store</th>
                  <th className="px-4 py-2">Gender</th>
                  <th className="px-4 py-2">Season</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.sku || "N/A"}</td>
                    <td className="px-4 py-2">{item.quantity}</td>
                    <td className="px-4 py-2">{item.price ? `$${item.price.toFixed(2)}` : "N/A"}</td>
                    <td className="px-4 py-2">{item.store?.name || item.storeId || "Unknown"}</td>
                    <td className="px-4 py-2">{item.gender || "N/A"}</td>
                    <td className="px-4 py-2">{item.season || "N/A"}</td>
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
