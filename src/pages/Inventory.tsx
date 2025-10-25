import React, { useState, useMemo } from "react";
import { useStoreInventoryView, StoreInventoryView } from "@/hooks/useStoreInventoryView";

interface StoreSummary {
  [storeId: string]: {
    count: number;
    items: StoreInventoryView[];
    storeName: string;
  };
}

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");

  // Fetch inventory using your hook
  const { data: inventory = [], isLoading } = useStoreInventoryView();

  /** Filtered inventory */
  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const matchesSearch =
          !searchTerm ||
          item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.brand?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const matchesStore = storeFilter === "all" || item.store_id === storeFilter;

        return matchesSearch && matchesStore;
      }),
    [inventory, searchTerm, storeFilter],
  );

  /** Store summary */
  const storeSummary = useMemo(() => {
    const stores: StoreSummary = {};
    inventory.forEach((item) => {
      const storeId = item.store_id;
      const storeName = item.store_name || storeId;
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
      stores[item.store_id] = item.store_name || item.store_id;
    });
    return stores;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage and track your inventory across all stores</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, SKU, brand, or category..."
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
        {isLoading ? (
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
                  <th className="px-4 py-2">Store</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Brand</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-2">{item.item_name}</td>
                    <td className="px-4 py-2">{item.sku || "N/A"}</td>
                    <td className="px-4 py-2">{item.quantity}</td>
                    <td className="px-4 py-2">{item.store_name || item.store_id}</td>
                    <td className="px-4 py-2">{item.category}</td>
                    <td className="px-4 py-2">{item.brand || "N/A"}</td>
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
