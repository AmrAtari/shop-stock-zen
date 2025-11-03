// File: src/pages/Inventory.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PaginationControls from "@/components/PaginationControls";
import FileImport from "@/components/FileImport";
import ProductDialogNew from "@/components/ProductDialogNew";
import { ItemWithDetails } from "@/types";

interface UsePaginationReturn {
  pageIndex: number;
  pageCount: number;
  setPage: (index: number) => void;
}

const Inventory: React.FC = () => {
  const [fileImportOpen, setFileImportOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | undefined>(undefined);

  // --- Pagination state ---
  const [pagination, setPagination] = useState<UsePaginationReturn>({
    pageIndex: 0,
    pageCount: 1,
    setPage: (index: number) => setPagination((p) => ({ ...p, pageIndex: index })),
  });

  // --- Fetch inventory items ---
  const { data: items, refetch } = useQuery(["inventory", pagination.pageIndex], async () => {
    const { data, error } = await supabase
      .from<ItemWithDetails>("store_inventory")
      .select("*")
      .range(pagination.pageIndex * 20, (pagination.pageIndex + 1) * 20 - 1);
    if (error) throw error;
    return data || [];
  });

  const handleImportComplete = () => {
    refetch();
  };

  const handleEditItem = (item: ItemWithDetails) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Inventory</h1>
        <Button onClick={() => setFileImportOpen(true)}>Import File</Button>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Supplier</th>
            <th>Main Group</th>
            <th>Category</th>
            <th>Price</th>
            <th>Cost</th>
            <th>Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((item) => (
            <tr key={item.sku} className="hover:bg-gray-50">
              <td>{item.sku}</td>
              <td>{item.name}</td>
              <td>{item.supplier}</td>
              <td>{item.main_group}</td>
              <td>{item.category}</td>
              <td>{item.price}</td>
              <td>{item.cost}</td>
              <td>{item.quantity}</td>
              <td>
                <Button onClick={() => handleEditItem(item)}>Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <PaginationControls
          currentPage={pagination.pageIndex + 1}
          totalPages={pagination.pageCount}
          onChange={(page) => pagination.setPage(page - 1)}
        />
      </div>

      {/* --- File Import Dialog --- */}
      <FileImport open={fileImportOpen} onOpenChange={setFileImportOpen} onImportComplete={handleImportComplete} />

      {/* --- Product Edit Dialog --- */}
      <ProductDialogNew open={dialogOpen} onOpenChange={setDialogOpen} editingItem={selectedItem} />
    </div>
  );
};

export default Inventory;
