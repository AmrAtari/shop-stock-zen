import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemWithDetails } from "@/types";
import { PaginationControls } from "@/components/PaginationControls";
import { ProductDialogNew } from "@/components/ProductDialogNew";
import { FileImport } from "@/components/FileImport";

const ITEMS_PER_PAGE = 10;

export const Inventory: React.FC = () => {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | undefined>();
  const [importOpen, setImportOpen] = useState(false);

  const fetchInventoryItems = async (): Promise<ItemWithDetails[]> => {
    const { data, error } = await supabase.from("store_inventory").select("*");
    if (error) throw error;
    return data as ItemWithDetails[];
  };

  const {
    data: items = [],
    isLoading,
    isError,
  } = useQuery<ItemWithDetails[], Error>(["inventory-items"], fetchInventoryItems);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const pagedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <h1>Inventory</h1>
      <button onClick={() => setImportOpen(true)}>Import File</button>

      {isLoading && <div>Loading...</div>}
      {isError && <div>Error loading inventory</div>}
      {!isLoading && items.length === 0 && <div>No items found</div>}

      {pagedItems.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>{item.price}</td>
                <td>
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        onChange={setPage}
        totalItems={items.length}
        startIndex={(page - 1) * ITEMS_PER_PAGE}
        endIndex={Math.min(page * ITEMS_PER_PAGE, items.length)}
      />

      <ProductDialogNew open={dialogOpen} onOpenChange={setDialogOpen} editingItem={editingItem} />

      <FileImport
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => console.log("Import complete")}
      />
    </div>
  );
};
