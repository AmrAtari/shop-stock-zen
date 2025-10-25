import React, { useMemo, useState, useEffect } from "react";

// Self-contained Inventory page — no path aliases. This file replaces all external @/ imports with
// local lightweight implementations so it can build in environments that don't support tsconfig path aliases.

type Item = {
  id: string;
  sku?: string;
  name?: string;
  category?: string;
  brand?: string | null;
  quantity?: number;
  min_stock?: number;
  unit?: string | null;
  store_name?: string | null;
  store_id?: string | null;
  item_number?: string | null;
  season?: string | null;
  main_group?: string | null;
};

// Simple local Pagination hook replacement
function useSimplePagination({
  totalItems,
  itemsPerPage = 20,
  initialPage = 1,
}: {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage: (p: number) => setCurrentPage(Math.max(1, Math.min(totalPages, p))),
    canGoPrev: currentPage > 1,
    canGoNext: currentPage < totalPages,
  };
}

// Minimal UI primitives (so we don't rely on external component library)
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }> = ({
  children,
  variant,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-3 py-1 rounded border ${variant === "outline" ? "border-gray-300" : "bg-blue-600 text-white"}`}
  >
    {children}
  </button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className="border rounded px-3 py-2" />
);

const Badge: React.FC<{ children: React.ReactNode; variant?: string }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{children}</span>
);

// Small helper: download JSON file
function downloadJSON(data: any, filename = "data.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// The Inventory component
const InventoryNew: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [mainGroupFilter, setMainGroupFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // For demo purposes we use local mock data. In your real app replace this with real data fetch.
  const [inventory, setInventory] = useState<Item[]>([]);
  useEffect(() => {
    // Mock data
    const mock: Item[] = Array.from({ length: 37 }).map((_, i) => ({
      id: String(i + 1),
      sku: `SKU-${i + 1}`,
      name: i % 6 === 0 ? undefined : `Product ${i + 1}`,
      category: i % 5 === 0 ? undefined : ["Shirts", "Shoes", "Accessories"][i % 3],
      brand: i % 4 === 0 ? null : `Brand ${(i % 3) + 1}`,
      quantity: Math.max(0, Math.floor(Math.random() * 30) - 5),
      min_stock: 5,
      unit: "pcs",
      store_name: i % 2 === 0 ? "Main Store" : "Outlet",
      store_id: i % 2 === 0 ? "main" : "outlet",
      season: ["Summer", "Winter"][i % 2],
      main_group: ["Clothing", "Footwear"][i % 2],
      item_number: i % 7 === 0 ? `MN-${Math.ceil((i + 1) / 7)}` : undefined,
    }));

    setInventory(mock);
  }, []);

  const isLoading = false; // no remote fetch in this example

  const filteredInventory = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return inventory.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const sku = (item.sku || "").toLowerCase();
      const category = (item.category || "").toLowerCase();

      const matchesSearch = name.includes(search) || sku.includes(search) || category.includes(search);
      const matchesStore = storeFilter === "all" || item.store_id === storeFilter;
      const matchesSeason = seasonFilter === "all" || item.season === seasonFilter;
      const matchesMainGroup = mainGroupFilter === "all" || item.main_group === mainGroupFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStore && matchesSeason && matchesMainGroup && matchesCategory;
    });
  }, [inventory, searchTerm, storeFilter, seasonFilter, mainGroupFilter, categoryFilter]);

  const pagination = useSimplePagination({ totalItems: filteredInventory.length, itemsPerPage: 10, initialPage: 1 });

  const paginatedInventory = useMemo(
    () => filteredInventory.slice(pagination.startIndex, pagination.endIndex),
    [filteredInventory, pagination.startIndex, pagination.endIndex],
  );

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setInventory((prev) => prev.filter((p) => p.id !== id));
    alert("Item deleted (local demo)");
  }

  function handleExport() {
    downloadJSON(inventory, `inventory_${new Date().toISOString().split("T")[0]}.json`);
    alert("Inventory exported (JSON)");
  }

  function getStockStatus(item: Item) {
    const qty = item.quantity ?? 0;
    const min = item.min_stock ?? 0;
    if (qty === 0) return { label: "Out of Stock" };
    if (qty <= min) return { label: "Low Stock" };
    return { label: "In Stock" };
  }

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div style={{ padding: 20, fontFamily: "Inter, Roboto, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Inventory</h1>
          <div style={{ color: "#777", marginTop: 4 }}>Manage your clothing and shoes inventory</div>
        </div>
        <div>
          <Button variant="outline" onClick={() => alert("Navigate to physical inventory (demo)")}>
            Physical Inventory
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Input
            placeholder="Search by name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div style={{ textAlign: "center", color: "#666", padding: 40 }}>No items found</div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>SKU</th>
                <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                <th style={{ textAlign: "left", padding: 8 }}>Category</th>
                <th style={{ textAlign: "left", padding: 8 }}>Brand</th>
                <th style={{ textAlign: "left", padding: 8 }}>Store</th>
                <th style={{ textAlign: "left", padding: 8 }}>Quantity</th>
                <th style={{ textAlign: "left", padding: 8 }}>Unit</th>
                <th style={{ textAlign: "left", padding: 8 }}>Min Stock</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                <th style={{ textAlign: "right", padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInventory.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #f1f1f1" }}>
                  <td style={{ padding: 8 }}>{item.sku}</td>
                  <td style={{ padding: 8 }}>{item.name ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.category ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.brand ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.store_name ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.quantity ?? 0}</td>
                  <td style={{ padding: 8 }}>{item.unit ?? "-"}</td>
                  <td style={{ padding: 8 }}>{item.min_stock ?? "-"}</td>
                  <td style={{ padding: 8 }}>
                    <Badge>{getStockStatus(item).label}</Badge>
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    <Button variant="outline" onClick={() => handleDelete(item.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#555" }}>
          Showing {Math.min(filteredInventory.length, paginatedInventory.length)} of {filteredInventory.length} items
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={() => pagination.goToPage(1)} disabled={!pagination.canGoPrev}>
            First
          </Button>
          <Button
            variant="outline"
            onClick={() => pagination.goToPage(pagination.currentPage - 1)}
            disabled={!pagination.canGoPrev}
          >
            Prev
          </Button>
          <div style={{ alignSelf: "center" }}>
            Page {pagination.currentPage} / {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => pagination.goToPage(pagination.currentPage + 1)}
            disabled={!pagination.canGoNext}
          >
            Next
          </Button>
          <Button
            variant="outline"
            onClick={() => pagination.goToPage(pagination.totalPages)}
            disabled={!pagination.canGoNext}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryNew;
