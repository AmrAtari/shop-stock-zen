import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CSVLink } from "react-csv";

interface Store {
  id: string;
  name: string;
}

interface ItemStock {
  store_id: string;
  store_name: string;
  item_id: string | null;
  item_name: string | null;
  sku: string | null;
  quantity: number | null;
  min_stock: number | null;
}

const ITEMS_PER_PAGE = 20;

const Inventory = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [stock, setStock] = useState<ItemStock[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStoresAndStock();
  }, []);

  const fetchStoresAndStock = async () => {
    setLoading(true);
    // 1️⃣ Fetch all stores
    const { data: storeData, error: storeError } = await supabase.from("stores").select("id, name").order("name");

    if (storeError) {
      console.error(storeError);
      setLoading(false);
      return;
    }

    setStores(storeData || []);

    // 2️⃣ Fetch stock for all stores
    const { data: stockData, error: stockError } = await supabase.from("v_store_stock_levels").select("*");

    if (stockError) {
      console.error(stockError);
      setLoading(false);
      return;
    }

    // 3️⃣ Merge stores with stock so every store appears
    const merged: ItemStock[] = [];

    (storeData || []).forEach((store) => {
      const items = (stockData || []).filter((s) => s.store_id === store.id);
      if (items.length > 0) {
        merged.push(...items);
      } else {
        // store exists but has no items
        merged.push({
          store_id: store.id,
          store_name: store.name,
          item_id: null,
          item_name: null,
          sku: null,
          quantity: null,
          min_stock: null,
        });
      }
    });

    setStock(merged);
    setLoading(false);
  };

  const filteredStock = useMemo(() => {
    return stock.filter(
      (s) =>
        s.store_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.sku?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [stock, search]);

  const paginatedStock = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredStock.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStock, page]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Inventory</h2>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search by store, item, or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <CSVLink
          data={filteredStock}
          filename={`inventory_export.csv`}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Export CSV
        </CSVLink>
      </div>

      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-2 py-1">Store</th>
              <th className="border px-2 py-1">Item Name</th>
              <th className="border px-2 py-1">SKU</th>
              <th className="border px-2 py-1">Quantity</th>
              <th className="border px-2 py-1">Min Stock</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStock.map((s, idx) => (
              <tr key={`${s.store_id}-${s.item_id || idx}`}>
                <td className="border px-2 py-1">{s.store_name}</td>
                <td className="border px-2 py-1">{s.item_name || "-"}</td>
                <td className="border px-2 py-1">{s.sku || "-"}</td>
                <td
                  className={`border px-2 py-1 ${
                    s.quantity !== null && s.min_stock !== null && s.quantity <= s.min_stock ? "bg-red-200" : ""
                  }`}
                >
                  {s.quantity ?? 0}
                </td>
                <td className="border px-2 py-1">{s.min_stock ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-2 flex justify-between">
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} className="px-3 py-1 border rounded">
          Prev
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => (p * ITEMS_PER_PAGE < filteredStock.length ? p + 1 : p))}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Inventory;
