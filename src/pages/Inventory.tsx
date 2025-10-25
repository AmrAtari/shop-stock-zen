import React, { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
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

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from("items").select(`
          id,
          name,
          sku,
          quantity,
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
        console.log(`✅ Loaded ${data.length} items from Supabase`);
      }
    } catch (err: any) {
      console.error("❌ Error loading inventory:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>

      {loading && <p>Loading inventory...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Store</th>
                <th className="px-4 py-2">Min Stock</th>
                <th className="px-4 py-2">Max Stock</th>
                <th className="px-4 py-2">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2">{item.sku || "-"}</td>
                  <td className="px-4 py-2">{item.category || "-"}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      item.quantity <= (item.min_stock || 0) ? "text-red-600" : ""
                    }`}
                  >
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2">{item.store ? item.store.name : "-"}</td>
                  <td className="px-4 py-2">{item.min_stock ?? "-"}</td>
                  <td className="px-4 py-2">{item.max_stock ?? "-"}</td>
                  <td className="px-4 py-2">{item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Inventory;
