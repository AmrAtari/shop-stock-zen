import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

const ITEMS_PER_PAGE = 20;

interface InventoryItem {
  store_id: string;
  store_name: string;
  item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  min_stock: number;
  category: string | null;
  brand: string | null;
  gender: string | null;
  season: string | null;
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    store: "",
    category: "",
    brand: "",
    season: "",
    gender: "",
    search: "",
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Fetch stores
  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("*");
    if (error) console.error(error);
    else setStores(data || []);
  };

  // Fetch inventory with joins
  const fetchInventory = async () => {
    const { data, error } = await supabase.from("v_store_stock_levels").select("*");

    if (error) console.error(error);
    else {
      // Filter out stores with zero quantity if needed
      const filtered = data?.filter((i) => i.quantity && i.store_name) || [];
      setInventory(filtered as InventoryItem[]);
    }
  };

  // Fetch filter options
  const fetchFilters = async () => {
    const [cats, brs, sns, gds] = await Promise.all([
      supabase.from("categories").select("name"),
      supabase.from("brands").select("name"),
      supabase.from("seasons").select("name"),
      supabase.from("genders").select("name"),
    ]);

    if (!cats.error) setCategories(cats.data.map((c) => c.name));
    if (!brs.error) setBrands(brs.data.map((b) => b.name));
    if (!sns.error) setSeasons(sns.data.map((s) => s.name));
    if (!gds.error) setGenders(gds.data.map((g) => g.name));
  };

  useEffect(() => {
    fetchStores();
    fetchInventory();
    fetchFilters();
  }, []);

  // Apply filters
  const filteredStock = useMemo(() => {
    return inventory.filter((item) => {
      return (
        (!filters.store || item.store_name === filters.store) &&
        (!filters.category || item.category === filters.category) &&
        (!filters.brand || item.brand === filters.brand) &&
        (!filters.season || item.season === filters.season) &&
        (!filters.gender || item.gender === filters.gender) &&
        (!filters.search ||
          item.item_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.sku.toLowerCase().includes(filters.search.toLowerCase()))
      );
    });
  }, [inventory, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredStock.length / ITEMS_PER_PAGE);
  const paginatedStock = filteredStock.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // CSV download
  const downloadCSV = (data: InventoryItem[], filename = "inventory.csv") => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ["Store", "Item Name", "SKU", "Quantity", "Min Stock", "Category", "Brand", "Gender", "Season"].join(","),
        ...data.map((d) =>
          [
            d.store_name,
            d.item_name,
            d.sku,
            d.quantity,
            d.min_stock,
            d.category || "",
            d.brand || "",
            d.gender || "",
            d.season || "",
          ].join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Inventory</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filters.store} onChange={(e) => setFilters({ ...filters, store: e.target.value })}>
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}>
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select value={filters.season} onChange={(e) => setFilters({ ...filters, season: e.target.value })}>
          <option value="">All Seasons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
          <option value="">All Genders</option>
          {genders.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by name or SKU"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border px-2"
        />
      </div>

      {/* CSV Export */}
      <button onClick={() => downloadCSV(filteredStock)} className="px-3 py-1 bg-blue-500 text-white rounded mb-4">
        Export CSV
      </button>

      {/* Inventory Table */}
      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Store</th>
            <th className="border px-2 py-1">Item Name</th>
            <th className="border px-2 py-1">SKU</th>
            <th className="border px-2 py-1">Quantity</th>
            <th className="border px-2 py-1">Min Stock</th>
            <th className="border px-2 py-1">Category</th>
            <th className="border px-2 py-1">Brand</th>
            <th className="border px-2 py-1">Gender</th>
            <th className="border px-2 py-1">Season</th>
          </tr>
        </thead>
        <tbody>
          {paginatedStock.map((item) => (
            <tr key={item.item_id + item.store_id}>
              <td className="border px-2 py-1">{item.store_name}</td>
              <td className="border px-2 py-1">{item.item_name}</td>
              <td className="border px-2 py-1">{item.sku}</td>
              <td className="border px-2 py-1">{item.quantity}</td>
              <td className="border px-2 py-1">{item.min_stock}</td>
              <td className="border px-2 py-1">{item.category}</td>
              <td className="border px-2 py-1">{item.brand}</td>
              <td className="border px-2 py-1">{item.gender}</td>
              <td className="border px-2 py-1">{item.season}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Inventory;
