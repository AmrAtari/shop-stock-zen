import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, History, Clipboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ProductDialogNew from "@/components/ProductDialogNew";
import FileImport from "@/components/FileImport";
import PriceHistoryDialog from "@/components/PriceHistoryDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { supabase } from "@/integrations/supabase/client";
import { Item } from "@/types/database";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { Label } from "@/components/ui/label";
import { useStoreInventoryView, useAggregatedInventory } from "@/hooks/useStoreInventoryView";
import { useStores } from "@/hooks/usePurchaseOrders";

interface BulkActionsProps {
  selectedItems: Item[];
  onBulkUpdate: () => void;
  onClearSelection: () => void;
}

// Confirmation Dialog for Bulk Actions
interface BulkUpdateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (applyToAll: boolean) => void;
  selectedCount: number;
  parentItemsCount: number;
}

const BulkUpdateConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  parentItemsCount,
}: BulkUpdateConfirmationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Update Scope</DialogTitle>
          <DialogDescription>
            How would you like to apply changes to {selectedCount} selected item(s)?
            {parentItemsCount > 0 && (
              <div className="mt-2 text-sm">{parentItemsCount} of the selected items belong to product groups.</div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Apply to all related SKUs</h4>
            <p className="text-sm text-blue-700">
              Update all products with the same model numbers. This ensures consistency across all variants.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">Apply only to selected SKUs</h4>
            <p className="text-sm text-gray-700">
              Update only the specifically selected products. Other variants will remain unchanged.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onConfirm(false)}>
            Only Selected SKUs
          </Button>
          <Button onClick={() => onConfirm(true)}>All Related SKUs</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BulkActions = ({ selectedItems, onBulkUpdate, onClearSelection }: BulkActionsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [bulkFormData, setBulkFormData] = useState<Partial<Item>>({});

  const updateRelatedSKUs = async (itemNumber: string, updateData: any) => {
    const sharedFields = [
      "name",
      "category",
      "brand",
      "department",
      "supplier",
      "season",
      "main_group",
      "origin",
      "theme",
    ];

    const sharedUpdateData: any = {};
    sharedFields.forEach((field) => {
      if (updateData[field] !== undefined && updateData[field] !== "") {
        sharedUpdateData[field] = updateData[field];
      }
    });

    if (Object.keys(sharedUpdateData).length === 0) return;

    const { error } = await supabase.from("items").update(sharedUpdateData).eq("item_number", itemNumber);

    if (error) throw error;
  };

  const handleBulkUpdateClick = () => {
    // Check if any selected items have item_numbers
    const hasParentItems = (selectedItems as Item[]).some((item) => item.item_number);

    if (hasParentItems) {
      setShowBulkConfirmation(true);
    } else {
      // No parent items, proceed directly to bulk update form
      setIsDialogOpen(true);
    }
  };

  const handleBulkConfirmation = (applyToAll: boolean) => {
    setShowBulkConfirmation(false);
    if (applyToAll) {
      // Show bulk update form
      setIsDialogOpen(true);
    } else {
      // Apply only to selected items - show bulk update form
      setIsDialogOpen(true);
    }
  };

  const performBulkUpdate = async (applyToAll: boolean) => {
    try {
      let totalUpdated = 0;

      if (applyToAll) {
        // Group items by item_number to update all related SKUs
        // FIX: Add explicit cast to selectedItems for .reduce()
        const itemsByParent = (selectedItems as Item[]).reduce(
          (acc, item) => {
            const parentKey = item.item_number || item.id;
            if (!acc[parentKey]) {
              acc[parentKey] = [];
            }
            acc[parentKey].push(item);
            return acc;
          },
          {} as Record<string, Item[]>,
        );

        // Update each parent group
        for (const [parentKey, items] of Object.entries(itemsByParent)) {
          if (items[0].item_number) {
            // This is a parent item with related SKUs
            await updateRelatedSKUs(items[0].item_number, bulkFormData);
            totalUpdated += items.length;
          } else {
            // Update individual items
            for (const item of items) {
              await supabase.from("items").update(bulkFormData).eq("id", item.id);
              totalUpdated++;
            }
          }
        }
      } else {
        // Apply only to selected items
        // FIX: Add explicit cast to selectedItems for iteration
        for (const item of selectedItems as Item[]) {
          await supabase.from("items").update(bulkFormData).eq("id", item.id);
          totalUpdated++;
        }
      }

      toast.success(`Updated ${totalUpdated} item(s)`);
      setIsDialogOpen(false);
      onBulkUpdate();
      onClearSelection();
    } catch (error: any) {
      toast.error("Failed to bulk update: " + error.message);
    }
  };

  // FIX: Add explicit cast to resolve TS2339 (Property 'length' does not exist on type 'unknown')
  if ((selectedItems as Item[]).length === 0) return null;

  // FIX: Add explicit cast to resolve TS2488 (Type 'unknown' must have a '[Symbol.iterator]()' method)
  const parentItemsCount = (selectedItems as Item[]).filter((item) => item.item_number).length;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <span className="text-sm font-medium">{(selectedItems as Item[]).length} item(s) selected</span>
        <Button variant="outline" size="sm" onClick={handleBulkUpdateClick}>
          Bulk Update
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>

      {/* Bulk Update Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update {(selectedItems as Item[]).length} Items</DialogTitle>
            <DialogDescription>
              Update shared fields across selected items. Leave fields empty to keep current values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={bulkFormData.name || ""}
                onChange={(e) => setBulkFormData({ ...bulkFormData, name: e.target.value })}
                placeholder="Leave empty to keep current value"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={bulkFormData.category || ""}
                onChange={(e) => setBulkFormData({ ...bulkFormData, category: e.target.value })}
                placeholder="Leave empty to keep current value"
              />
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={bulkFormData.brand || ""}
                onChange={(e) => setBulkFormData({ ...bulkFormData, brand: e.target.value })}
                placeholder="Leave empty to keep current value"
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                value={bulkFormData.supplier || ""}
                onChange={(e) => setBulkFormData({ ...bulkFormData, supplier: e.target.value })}
                placeholder="Leave empty to keep current value"
              />
            </div>

            <div className="space-y-2">
              <Label>Season</Label>
              <Input
                value={bulkFormData.season || ""}
                onChange={(e) => setBulkFormData({ ...bulkFormData, season: e.target.value })}
                placeholder="Leave empty to keep current value"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => performBulkUpdate(parentItemsCount > 0)}>Apply Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Confirmation Dialog */}
      <BulkUpdateConfirmationDialog
        open={showBulkConfirmation}
        onOpenChange={setShowBulkConfirmation}
        onConfirm={handleBulkConfirmation}
        selectedCount={(selectedItems as Item[]).length}
        parentItemsCount={parentItemsCount}
      />
    </>
  );
};

const InventoryNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<{ id: string; name: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [fallbackInventory, setFallbackInventory] = useState<Item[]>([]);

  // Filter states
  const [modelNumberFilter, setModelNumberFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [mainGroupFilter, setMainGroupFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch stores for filtering
  const { data: stores = [] } = useStores();

  // Fetch store-based inventory or aggregated view
  const { data: storeInventory = [], isLoading: storeInvLoading } = useStoreInventoryView(
    storeFilter !== "all" ? storeFilter : undefined,
  );
  const { data: aggregatedInventory = [], isLoading: aggLoading } = useAggregatedInventory();

  // Debug: Log the raw data
  useEffect(() => {
    console.log("🔍 DEBUG INVENTORY DATA:");
    console.log("Store Inventory:", storeInventory);
    console.log("Aggregated Inventory:", aggregatedInventory);
    console.log("Store Filter:", storeFilter);
    console.log("Store Inventory count:", storeInventory.length);
    console.log("Aggregated Inventory count:", aggregatedInventory.length);
  }, [storeInventory, aggregatedInventory, storeFilter]);

  // Use store inventory when a specific store is selected, otherwise use aggregated
  const inventory = useMemo(() => {
    if (storeFilter === "all") {
      return aggregatedInventory;
    } else {
      return storeInventory.map((si) => ({
        id: si.item_id || si.id,
        sku: si.sku,
        name: si.item_name || si.name,
        category: si.category || "",
        brand: si.brand || "",
        quantity: si.quantity || 0,
        min_stock: si.min_stock || 0,
        unit: si.unit || "pcs",
        store_name: si.store_name,
        store_id: si.store_id,
        item_number: si.item_number,
        season: si.season,
        main_group: si.main_group,
      }));
    }
  }, [storeFilter, aggregatedInventory, storeInventory]);

  console.log("Final Inventory count:", inventory.length);

  // Fallback direct fetch if hooks don't return data
  useEffect(() => {
    const fetchAllItemsDirectly = async () => {
      console.log("🔄 Attempting direct fetch from database...");
      const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Direct fetch error:", error);
        return;
      }

      console.log("Direct fetch result:", data?.length, "items");
      setFallbackInventory(data || []);
    };

    // Only use fallback if no data from hooks after loading completes
    if (!storeInvLoading && !aggLoading && inventory.length === 0) {
      console.log("📦 No data from hooks, using fallback...");
      fetchAllItemsDirectly();
    }
  }, [inventory.length, storeInvLoading, aggLoading]);

  // Use fallback if main inventory is empty
  const finalInventory = useMemo(() => {
    if (inventory.length > 0) {
      console.log("✅ Using inventory from hooks:", inventory.length, "items");
      return inventory;
    } else if (fallbackInventory.length > 0) {
      console.log("🔄 Using fallback inventory:", fallbackInventory.length, "items");
      return fallbackInventory;
    }
    console.log("❌ No inventory data available");
    return [];
  }, [inventory, fallbackInventory]);

  const isLoading = storeInvLoading || aggLoading;

  const filteredInventory = useMemo(() => {
    console.log("🔍 Filtering inventory. Total items:", finalInventory.length);
    console.log("Search term:", searchTerm);

    const filtered = (finalInventory as Item[]).filter((item) => {
      // Safely handle potentially undefined properties with fallbacks
      const name = item.name || "";
      const sku = item.sku || "";
      const category = item.category || "";

      const matchesSearch =
        searchTerm === "" ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModelNumber = modelNumberFilter === "all" || (item as any).item_number === modelNumberFilter;
      const matchesStore = storeFilter === "all" || (item as any).store_id === storeFilter;
      const matchesSeason = seasonFilter === "all" || (item as any).season === seasonFilter;
      const matchesMainGroup = mainGroupFilter === "all" || item.main_group === mainGroupFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return (
        matchesSearch && matchesModelNumber && matchesStore && matchesSeason && matchesMainGroup && matchesCategory
      );
    });

    console.log("✅ Filtered result:", filtered.length, "items");
    return filtered;
  }, [finalInventory, searchTerm, modelNumberFilter, storeFilter, seasonFilter, mainGroupFilter, categoryFilter]);

  // Unique values for filters
  const uniqueModelNumbers = useMemo(
    () => [...new Set((finalInventory as Item[]).map((i) => i.item_number).filter(Boolean))].sort(),
    [finalInventory],
  );
  const uniqueSeasons = useMemo(
    () => [...new Set((finalInventory as Item[]).map((i) => i.season).filter(Boolean))].sort(),
    [finalInventory],
  );
  const uniqueMainGroups = useMemo(
    () => [...new Set((finalInventory as Item[]).map((i) => i.main_group).filter(Boolean))].sort(),
    [finalInventory],
  );
  const uniqueCategories = useMemo(
    () => [...new Set((finalInventory as Item[]).map((i) => i.category).filter(Boolean))].sort(),
    [finalInventory],
  );

  console.log("📊 Filter counts:", {
    modelNumbers: uniqueModelNumbers.length,
    seasons: uniqueSeasons.length,
    mainGroups: uniqueMainGroups.length,
    categories: uniqueCategories.length,
  });

  const pagination = usePagination({
    totalItems: filteredInventory.length,
    itemsPerPage: 50, // Increased to show more items
    initialPage: 1,
  });

  const paginatedInventory = useMemo(() => {
    const result = filteredInventory.slice(pagination.startIndex, pagination.endIndex);
    console.log("📄 Pagination:", {
      total: filteredInventory.length,
      start: pagination.startIndex,
      end: pagination.endIndex,
      showing: result.length,
    });
    return result;
  }, [filteredInventory, pagination.startIndex, pagination.endIndex]);

  const toggleItemSelection = (item: Item) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((selected) => selected.id === item.id);
      if (isSelected) {
        return prev.filter((selected) => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedInventory);
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkUpdateComplete = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await supabase.from("price_levels").delete().eq("item_id", id);
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      toast.success("Item deleted successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.categoryDistribution });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.lowStock });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(finalInventory);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `inventory_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Inventory exported successfully");
  };

  const getStockStatus = (item: Item) => {
    if (item.quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (item.quantity <= item.min_stock) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  if (isLoading) {
    return <div className="p-8">Loading inventory data...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your clothing and shoes inventory</p>
          <p className="text-sm text-blue-600 mt-1">
            Showing {filteredInventory.length} of {finalInventory.length} total items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/inventory/physical")}>
            <Clipboard className="w-4 h-4 mr-2" />
            Physical Inventory
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={() => {
                setEditingItem(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Select value={modelNumberFilter} onValueChange={setModelNumberFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Model Number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Model Numbers ({uniqueModelNumbers.length})</SelectItem>
              {uniqueModelNumbers.map((num) => (
                <SelectItem key={num} value={num}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores ({stores.length})</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons ({uniqueSeasons.length})</SelectItem>
              {uniqueSeasons.map((season) => (
                <SelectItem key={season} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={mainGroupFilter} onValueChange={setMainGroupFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Main Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Main Groups ({uniqueMainGroups.length})</SelectItem>
              {uniqueMainGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({uniqueCategories.length})</SelectItem>
              {uniqueCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <BulkActions
        selectedItems={selectedItems}
        onBulkUpdate={handleBulkUpdateComplete}
        onClearSelection={() => setSelectedItems([])}
      />

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.length === paginatedInventory.length && paginatedInventory.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {finalInventory.length === 0 ? "No inventory items found." : "No items match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedInventory.map((item) => {
                const status = getStockStatus(item);
                const isSelected = selectedItems.some((selected) => selected.id === item.id);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleItemSelection(item)} />
                    </TableCell>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>{item.brand || "-"}</TableCell>
                    <TableCell>
                      {storeFilter === "all" ? (
                        <div className="space-y-1">
                          <div className="font-medium text-sm">Multiple Stores</div>
                          <div className="text-xs text-muted-foreground">
                            {(item as any).stores?.map((s: any) => (
                              <div key={s.store_id}>
                                {s.store_name}: {s.quantity}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        (item as any).store_name || "-"
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {storeFilter === "all" ? (item as any).total_quantity : item.quantity}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.min_stock}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
              })
            )}
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
