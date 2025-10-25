import React, { useEffect, useState } from "react";
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

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchItems = async () => {
    try {
      setLoading(true);
      let query = supabase.from("items").select("*", { count: "exact" });

      if (search.trim()) {
        query = query.ilike("name", `%${search}%`);
      }

      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching items:", error.message);
        return;
      }

      setItems(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Unexpected error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, categoryFilter, page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="md:w-1/3"
            />

            <Select
              onValueChange={(value) => {
                setCategoryFilter(value === "all" ? null : value);
                setPage(1);
              }}
              value={categoryFilter || "all"}
            >
              <SelectTrigger className="md:w-1/4">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Shoes">Shoes</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p>Loading inventory...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.min_stock}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <Button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline">
              Previous
            </Button>
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} variant="outline">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
