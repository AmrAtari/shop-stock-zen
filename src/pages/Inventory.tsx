import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  gender: string;
  season: string;
  unit: string;
  quantity: number;
  min_stock: number;
  location: string;
  supplier: string;
  last_restocked: string;
  created_at: string;
  updated_at: string;
  description: string;
  pos_description: string;
  item_number: string;
  department: string;
  main_group: string;
  origin: string;
  theme: string;
  color_id: string;
  item_color_code: string;
  tax: number;
}

const PAGE_SIZE = 10;

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    gender: "all",
    season: "all",
    model: "",
    store: "all",
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from("items").select("*", { count: "exact" });

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      if (filters.category !== "all") query = query.eq("category", filters.category);
      if (filters.gender !== "all") query = query.eq("gender", filters.gender);
      if (filters.season !== "all") query = query.eq("season", filters.season);
      if (filters.model.trim()) query = query.ilike("item_number", `%${filters.model}%`);
      if (filters.store !== "all") query = query.eq("location", filters.store);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      setItems(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filters, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 🔄 Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("realtime:items")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => fetchItems())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  // 🎹 Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          setSelectedIndex((prev) => (prev === null ? 0 : Math.min(items.length - 1, prev + 1)));
          break;
        case "ArrowUp":
          setSelectedIndex((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
          break;
        case "ArrowRight":
          setPage((p) => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1));
          break;
        case "ArrowLeft":
          setPage((p) => Math.max(1, p - 1));
          break;
        case "Enter":
          if (selectedIndex !== null) {
            const item = items[selectedIndex];
            alert(`Open details for: ${item.name}`);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, totalCount]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 🔍 Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <Input
              placeholder="Search name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Shoes">Shoes</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.gender} onValueChange={(v) => setFilters((f) => ({ ...f, gender: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Men">Men</SelectItem>
                <SelectItem value="Women">Women</SelectItem>
                <SelectItem value="Unisex">Unisex</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.season} onValueChange={(v) => setFilters((f) => ({ ...f, season: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Summer">Summer</SelectItem>
                <SelectItem value="Winter">Winter</SelectItem>
                <SelectItem value="Spring">Spring</SelectItem>
                <SelectItem value="Fall">Fall</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Model number..."
              value={filters.model}
              onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
            />
          </div>

          {/* 🧾 Table */}
          {loading ? (
            <p>Loading inventory...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, i) => (
                    <TableRow
                      key={item.id}
                      className={selectedIndex === i ? "bg-muted border-l-4 border-blue-500" : ""}
                    >
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.gender}</TableCell>
                      <TableCell>{item.season}</TableCell>
                      <TableCell>{item.item_number}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.min_stock}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* 📄 Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline">
              ← Previous
            </Button>
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} variant="outline">
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
