import React, { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

interface InventoryItem {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  gender?: string;
  season?: string;
  unit?: string;
  quantity: number;
  min_stock?: number;
  location?: string;
  supplier?: string;
  last_restocked?: string;
  created_at?: string;
  updated_at?: string;
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
}

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all inventory items
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from("items").select(`
          id,
          sku,
          name,
          category,
          brand,
          size,
          color,
          gender,
          season,
          unit,
          quantity,
          min_stock,
          location,
          supplier,
          last_restocked,
          created_at,
          updated_at,
          description,
          pos_description,
          item_number,
          department,
          main_group,
          origin,
          theme,
          color_id,
          item_color_code,
          tax
        `);

      if (error) throw error;
      setInventory(data as InventoryItem[]);
      console.log(`✅ Loaded ${data.length} items from Supabase`);
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
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Brand</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Min Stock</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Last Restocked</th>
                <th className="px-4 py-2">Updated At</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-2">{item.sku || "-"}</td>
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2">{item.category || "-"}</td>
                  <td className="px-4 py-2">{item.brand || "-"}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      item.quantity <= (item.min_stock || 0) ? "text-red-600" : ""
                    }`}
                  >
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2">{item.min_stock ?? "-"}</td>
                  <td className="px-4 py-2">{item.location || "-"}</td>
                  <td className="px-4 py-2">{item.supplier || "-"}</td>
                  <td className="px-4 py-2">
                    {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : "-"}
                  </td>
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
