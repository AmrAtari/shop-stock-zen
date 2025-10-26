import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, History, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProductDialogNew from "@/components/ProductDialogNew";
import FileImport from "@/components/FileImport";
import PriceHistoryDialog from "@/components/PriceHistoryDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/types/database";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";

// Define a local interface that extends the imported Item type.
interface ItemWithDetails extends Item {
  location: string;
  min_stock: number;
  quantity: number;
  unit: string;
  sellingPrice?: number | null;
}

// Supabase Data Fetching Function
const fetchInventory = async (): Promise<ItemWithDetails[]> => {
  const { data, error } = await supabase.from("items").select("*");

  if (error) {
    console.error("Supabase Inventory Fetch Error:", error);
    throw new Error("Failed to fetch inventory data.");
  }
  return data as ItemWithDetails[];
};

// Data Hook connected to React Query
const useInventoryQuery = () => {
  return useQuery<ItemWithDetails[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: fetchInventory,
  });
};

interface BulkActionsProps {
  selectedItems: ItemWithDetails[];
  onBulkUpdate: () => void;
  onClearSelection: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedItems, onBulkUpdate, onClearSelection }) => {
  if (selectedItems.length === 0) return null;

  return (
    <div className="flex items-center space-x-2 py-2 px-4 bg-blue-50 border-b border-blue-200">
      <span className="text-sm font-medium text-blue-800">{selectedItems.length} items selected.</span>
      <Button variant="secondary" size="sm" onClick={onBulkUpdate}>
        Bulk Update
      </Button>
      <Button variant="outline" size="sm" onClick={onClearSelection}>
        Clear Selection
      </Button>
    </div>
  );
};

const InventoryNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemWithDetails | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemWithDetails[]>([]);

  const { data: inventoryData, isLoading, error } = useInventoryQuery();
  const allInventory = inventoryData || [];

  const filteredInventory = useMemo(() => {
    return allInventory.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allInventory, searchTerm]);

  const pagination = usePagination({
    totalItems: filteredInventory.length,
    itemsPerPage: 10,
  });

  const currentItems = useMemo(() => {
    return filteredInventory.slice(pagination.startIndex, pagination.endIndex);
  }, [filteredInventory, pagination.startIndex, pagination.endIndex]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }
    try {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;

      toast.success("Product deleted successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    } catch (error) {
      console.error("Deletion error:", error);
      toast.error("Failed to delete product.");
    }
  };

  const handleBulkUpdate = () => {
    toast.info(`Attempting bulk update for ${selectedItems.length} items.`);
    // Logic for opening a bulk update dialog goes here
  };

  const toggleSelectItem = (item: ItemWithDetails) => {
    setSelectedItems((prev) =>
      prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item],
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading inventory...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error loading inventory: {error.message}</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <div className="flex space-x-3">
          {/* FIX: Changed navigation to the Physical Inventory List page */}
          <Button
            variant="outline"
            onClick={() => navigate("/inventory/physical")} // <-- Navigates to the List page
            className="bg-purple-100 text-purple-800 hover:bg-purple-200"
          >
            <Layers className="w-4 h-4 mr-2" />
            View/Manage Counts
          </Button>

          <Button
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex space-x-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bulk Action Buttons (Download/Upload) */}
        <Button variant="outline" onClick={() => toast.info("Download Inventory TBD")}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
      </div>

      <BulkActions
        selectedItems={selectedItems}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedItems([])}
      />

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={selectedItems.length > 0 && selectedItems.length === currentItems.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[100px]">SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">Stock Qty</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-center w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.map((item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id);
              const isLowStock = item.quantity <= item.min_stock;
              const price = item.sellingPrice ?? 0;

              return (
                <TableRow key={item.id} className={isSelected ? "bg-blue-50" : ""}>
                  <TableCell className="text-center">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectItem(item)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      {isLowStock && (
                        <Badge variant="destructive" className="ml-2">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.location || "N/A"}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right">${price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItemForHistory(item);
                          setPriceHistoryOpen(true);
                        }}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        goToPage={pagination.goToPage}
        canGoPrev={pagination.canGoPrev}
        canGoNext={pagination.canGoNext}
        totalItems={filteredInventory.length}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
      />

      <ProductDialogNew
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        }}
      />
      <FileImport open={importOpen} onOpenChange={setImportOpen} onImportComplete={() => {}} />

      {selectedItemForHistory && (
        <PriceHistoryDialog
          open={priceHistoryOpen}
          onOpenChange={setPriceHistoryOpen}
          itemId={selectedItemForHistory.id}
          itemName={selectedItemForHistory.name}
        />
      )}
    </div>
  );
};

export default InventoryNew;
