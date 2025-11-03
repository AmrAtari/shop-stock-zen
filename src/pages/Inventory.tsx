import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/PaginationControls";
import { Loader2, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

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

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInventory();
  }, []);

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

      setInventory(data || []);
      setFilteredData(data || []);
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

  // 🔍 Search filtering
  useEffect(() => {
    const filtered = inventory.filter(
      (item) =>
        item.items?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.items?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.stores?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [searchTerm, inventory]);

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Store Inventory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
              <Input
                placeholder="Search items or stores..."
                className="pl-8 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={fetchInventory} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-gray-500">Loading inventory...</div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No inventory items found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.items?.name || "—"}</TableCell>
                    <TableCell>{item.items?.sku || "—"}</TableCell>
                    <TableCell>{item.stores?.name || "—"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        canGoPrev={currentPage > 1}
        canGoNext={currentPage < totalPages}
        startIndex={startIndex}
        endIndex={endIndex > totalItems ? totalItems : endIndex}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Inventory;
