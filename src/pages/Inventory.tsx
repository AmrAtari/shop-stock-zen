import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemWithDetails, FileImportProps, ProductDialogNewProps } from "@/types";
import { PaginationControls } from "@/components/PaginationControls";
import { ProductDialogNew } from "@/components/ProductDialogNew";
import { FileImport } from "@/components/FileImport";

export const Inventory: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFileImportOpen, setIsFileImportOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<ItemWithDetails[], Error>(["inventory-items"], async () => {
    const { data, error } = await supabase.from("store_inventory").select("*");
    if (error) throw error;
    return data as ItemWithDetails[];
  });

  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Inventory</h1>
      <button className="mb-4 px-4 py-2 bg-green-500 text-white rounded" onClick={() => setIsFileImportOpen(true)}>
        Import File
      </button>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th>ID</th>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="text-center p-4">
                Loading...
              </td>
            </tr>
          ) : paginatedItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center p-4">
                No items found
              </td>
            </tr>
          ) : (
            paginatedItems.map((item) => (
              <tr key={item.id} className="border-t">
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>{item.price}</td>
                <td>
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                    onClick={() => {
                      setEditingItem(item);
                      setIsDialogOpen(true);
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <ProductDialogNew open={isDialogOpen} onOpenChange={setIsDialogOpen} editingItem={editingItem} />

      <FileImport
        open={isFileImportOpen}
        onOpenChange={setIsFileImportOpen}
        onImportComplete={() => console.log("File imported")}
      />
    </div>
  );
};
