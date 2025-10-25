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
  category?: string | null;
  brand?: string | null;
  gender?: string | null;
  season?: string | null;
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);

  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");

  useEffect(() => {
    fetchStores();
    fetchFilters();
    fetchInventory();
  }, []);

  const fetchStores = async () => {
    const { data } = await supabase.from("stores").select("id, name");
    if (data) setStores(data);
  };

  const fetchFilters = async () => {
    const { data: categoriesData } = await supabase.from("categories").select("name");
    if (categoriesData) setCategories(categoriesData.map((c) => c.name));

    const { data: gendersData } = await supabase.from("genders").select("name");
    if (gendersData) setGenders(gendersData.map((g) => g.name));

    const { data: seasonsData } = await supabase.from("seasons").select("name");
    if (seasonsData) setSeasons(seasonsData.map((s) => s.name));
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from("v_store_stock_levels").select("*");
    if (data) {
      const formatted = data.map((item) => ({
        store_id: item.store_id!,
        store_name: item.store_name!,
        item_id: item.item_id!,
        item_name: item.item_name!,
        sku: item.sku!,
        quantity: item.quantity!,
        min_stock: item.min_stock!,
        category: item.category,
        brand: item.brand,
        gender: item.gender,
        season: item.season,
      }));
      setInventory(formatted);
      setFilteredInventory(formatted);
    }
  };

  useEffect(() => {
    let filtered = [...inventory];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (item) => item.item_name.toLowerCase().includes(s) || item.sku.toLowerCase().includes(s),
      );
    }

    if (selectedStore) filtered = filtered.filter((item) => item.store_id === selectedStore);
    if (selectedCategory) filtered = filtered.filter((item) => item.category === selectedCategory);
    if (selectedGender) filtered = filtered.filter((item) => item.gender === selectedGender);
    if (selectedSeason) filtered = filtered.filter((item) => item.season === selectedSeason);

    setFilteredInventory(filtered);
    setPage(1);
  }, [search, selectedStore, selectedCategory, selectedGender, selectedSeason, inventory]);

  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [page, filteredInventory]);

  // CSV Export
  const exportCSV = () => {
    if (!filteredInventory.length) return;

    const headers = ["Store", "Item", "SKU", "Quantity", "Min Stock", "Category", "Brand", "Gender", "Season"];

    const rows = filteredInventory.map((item) => [
      item.store_name,
      item.item_name,
      item.sku,
      item.quantity,
      item.min_stock,
      item.category || "",
      item.brand || "",
      item.gender || "",
      item.season || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-1 rounded"
        />

        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="border p-1 rounded">
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="">All Genders</option>
          {genders.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="">All Seasons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button onClick={exportCSV} className="bg-blue-500 text-white px-2 py-1 rounded">
          Export CSV
        </button>
      </div>

      {/* Inventory Table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className="border p-2">Store</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Min Stock</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Brand</th>
            <th className="border p-2">Gender</th>
            <th className="border p-2">Season</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((item) => (
            <tr key={item.item_id + item.store_id}>
              <td className="border p-2">{item.store_name}</td>
              <td className="border p-2">{item.item_name}</td>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.quantity}</td>
              <td className="border p-2">{item.min_stock}</td>
              <td className="border p-2">{item.category}</td>
              <td className="border p-2">{item.brand}</td>
              <td className="border p-2">{item.gender}</td>
              <td className="border p-2">{item.season}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex gap-2 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="border px-2 py-1 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-2 py-1">
          Page {page} of {Math.ceil(filteredInventory.length / ITEMS_PER_PAGE)}
        </span>
        <button
          disabled={page === Math.ceil(filteredInventory.length / ITEMS_PER_PAGE)}
          onClick={() => setPage((p) => p + 1)}
          className="border px-2 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Inventory;
