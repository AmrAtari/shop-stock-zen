import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PaginationControls from "@/components/PaginationControls";
import { ProductDialogNew } from "@/components/ProductDialogNew";
import { Loader2, PackageSearch } from "lucide-react";

interface InventoryItem {
  id: string;
  quantity: number;
  created_at: string;
  items: {
    id: string;
    name: string;
    sku: string;
  } | null;
  stores: {
    id: string;
    name: string;
  } | null;
}

export const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ Fixed fetchInventory function
  const fetchInventory = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.from("store_inventory").select(
        `
          id,
          quantity,
          created_at,
          items (
            id,
            name,
            sku
          ),
          stores (
            id,
            name
          )
        `,
      );

      if (error) throw error;

      const normalizedData =
        (data || []).map((row: any) => ({
          id: row.id,
          quantity: row.quantity,
          created_at: row.created_at,
          items: Array.isArray(row.items) ? row.items[0] || null : row.items,
          stores: Array.isArray(row.stores) ? row.stores[0] || null : row.stores,
        })) ?? [];

      setInventory(normalizedData);
      setFilteredData(normalizedData);
    } catch (err: any) {
      console.error("Error loading inventory:", err.message);
      toast({
        title: "Error loading inventory",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // 🔍 Search filter
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = inventory.filter(
      (item) =>
        item.items?.name?.toLowerCase().includes(term) ||
        item.items?.sku?.toLowerCase().includes(term) ||
        item.stores?.name?.toLowerCase().includes(term),
    );
    setFilteredData(filtered);
  }, [searchTerm, inventory]);

  // 🧮 Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageSearch className="h-6 w-6 text-primary" />
          Inventory
        </h1>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by item or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button onClick={fetchInventory} variant="outline">
            Refresh
          </Button>
          <ProductDialogNew onAdd={fetchInventory} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredData.length === 0 ? (
        <Card className="text-center p-10">
          <p className="text-gray-500">No inventory items found.</p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inventory List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3 border-b">#</th>
                    <th className="p-3 border-b">Item Name</th>
                    <th className="p-3 border-b">SKU</th>
                    <th className="p-3 border-b">Store</th>
                    <th className="p-3 border-b text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3 border-b">{startIndex + index + 1}</td>
                      <td className="p-3 border-b">{item.items?.name || "—"}</td>
                      <td className="p-3 border-b">{item.items?.sku || "—"}</td>
                      <td className="p-3 border-b">{item.stores?.name || "—"}</td>
                      <td className="p-3 border-b text-right">{item.quantity ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              canGoPrev={currentPage > 1}
              canGoNext={currentPage < totalPages}
              totalItems={filteredData.length}
              startIndex={startIndex + 1}
              endIndex={Math.min(endIndex, filteredData.length)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
