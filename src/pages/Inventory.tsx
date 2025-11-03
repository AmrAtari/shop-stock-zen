import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/PaginationControls";
import { ProductDialogNew } from "@/components/ProductDialogNew";
import { toast } from "sonner";

interface ItemWithDetails {
  id: number;
  name: string;
  sku: string;
  category?: string;
  quantity?: number;
  store_name?: string;
  updated_at?: string;
}

const ITEMS_PER_PAGE = 10;

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ✅ Fetch inventory items from Supabase
  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ItemWithDetails[], Error>({
    queryKey: ["inventory", searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_inventory")
        .select("id, name, sku, category, quantity, store_name, updated_at")
        .ilike("name", `%${searchTerm}%`)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching inventory:", error.message);
        throw error;
      }
      return data || [];
    },
  });

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, endIndex);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Inventory refreshed");
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex gap-2">
          <Input placeholder="Search items..." value={searchTerm} onChange={handleSearch} className="w-64" />
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)}>+ Add Item</Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading inventory...</p>
      ) : error ? (
        <p className="text-red-600">Error loading inventory: {error.message}</p>
      ) : paginatedItems.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Name</th>
                <th className="p-2">SKU</th>
                <th className="p-2">Category</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Store</th>
                <th className="p-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{item.id}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.sku}</td>
                  <td className="p-2">{item.category || "-"}</td>
                  <td className="p-2">{item.quantity ?? 0}</td>
                  <td className="p-2">{item.store_name || "-"}</td>
                  <td className="p-2">{item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex + 1}
        endIndex={Math.min(endIndex, totalItems)}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPageChange={setCurrentPage}
      />

      <ProductDialogNew open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Inventory;
