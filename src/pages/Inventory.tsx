import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, History, Clipboard, Eye } from "lucide-react";
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

// Item Details Dialog
interface ItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

const ItemDetailsDialog = ({ open, onOpenChange, item }: ItemDetailsDialogProps) => {
  if (!item) return null;

  // Safe property access with type checking
  const safeItem = item as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Item Details</DialogTitle>
          <DialogDescription>Complete information for {item.name}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">SKU</Label>
              <p className="text-sm mt-1">{item.sku}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-sm mt-1">{item.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <p className="text-sm mt-1">{item.category || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Brand</Label>
              <p className="text-sm mt-1">{item.brand || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Model Number</Label>
              <p className="text-sm mt-1">{item.item_number || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Size</Label>
              <p className="text-sm mt-1">{safeItem.size || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Color</Label>
              <p className="text-sm mt-1">{safeItem.color || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Gender</Label>
              <p className="text-sm mt-1">{safeItem.gender || "-"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Current Quantity</Label>
              <p className="text-sm mt-1">{item.quantity}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Minimum Stock</Label>
              <p className="text-sm mt-1">{item.min_stock}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Unit</Label>
              <p className="text-sm mt-1">{item.unit}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Season</Label>
              <p className="text-sm mt-1">{item.season || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Main Group</Label>
              <p className="text-sm mt-1">{item.main_group || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Color Code</Label>
              <p className="text-sm mt-1">{safeItem.item_color_code || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <p className="text-sm mt-1">{safeItem.location || "-"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Additional Information</Label>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Supplier:</span> {item.supplier || "-"}
            </div>
            <div>
              <span className="font-medium">Department:</span> {item.department || "-"}
            </div>
            <div>
              <span className="font-medium">Origin:</span> {item.origin || "-"}
            </div>
            <div>
              <span className="font-medium">Theme:</span> {item.theme || "-"}
            </div>
            <div>
              <span className="font-medium">Barcode:</span> {safeItem.barcode || "-"}
            </div>
          </div>
        </div>

        {(safeItem.description || safeItem.pos_description) && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Descriptions</Label>
            <div className="space-y-2 text-sm">
              {safeItem.description && (
                <div>
                  <span className="font-medium">Description:</span> {safeItem.description}
                </div>
              )}
              {safeItem.pos_description && (
                <div>
                  <span className="font-medium">POS Description:</span> {safeItem.pos_description}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
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
    const hasParentItems = selectedItems.some((item) => item.item_number);

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
        const itemsByParent = selectedItems.reduce(
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
        for (const item of selectedItems) {
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

  if (selectedItems.length === 0) return null;

  const parentItemsCount = selectedItems.filter((item) => item.item_number).length;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <span className="text-sm font-medium">{selectedItems.length} item(s) selected</span>
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
            <DialogTitle>Bulk Update {selectedItems.length} Items</DialogTitle>
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
        selectedCount={selectedItems.length}
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);
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
    console.log("Aggregated Inventory count:", aggregatedInventory?.length);
    console.log("Available stores:", stores);
  }, [storeInventory, aggregatedInventory, storeFilter, stores]);

  // Use store inventory when a specific store is selected, otherwise use aggregated
  const inventory = useMemo(() => {
    if (storeFilter === "all") {
      return aggregatedInventory || [];
    } else {
      console.log("🔄 Using aggregated data with store filtering for store:", storeFilter);

      // Instead of relying on storeInventory, filter the aggregated data
      // This ensures we always have data to work with
      const storeSpecificItems = (aggregatedInventory || []).filter((item: any) => {
        const hasStore = item.stores?.some((store: any) => store.store_id === storeFilter);
        return hasStore;
      });

      console.log("Store-specific items found:", storeSpecificItems.length);

      // Transform to include store-specific quantity
      const transformedItems = storeSpecificItems.map((item: any) => {
        const storeData = item.stores?.find((store: any) => store.store_id === storeFilter);

        return {
          ...item,
          quantity: storeData?.quantity || 0,
          store_name: storeData?.store_name || "",
          store_id: storeFilter,
        };
      });

      console.log("✅ Transformed store inventory:", transformedItems);
      return transformedItems as unknown as Item[];
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
    console.log("Store filter:", storeFilter);

    const filtered = finalInventory.filter((item) => {
      // Safely handle potentially undefined properties with fallbacks
      const name = item.name || "";
      const sku = item.sku || "";
      const category = item.category || "";

      const matchesSearch =
        searchTerm === "" ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModelNumber = modelNumberFilter === "all" || item.item_number === modelNumberFilter;

      // IMPROVED: More robust store matching
      const matchesStore = storeFilter === "all" || (item as any).store_id === storeFilter;

      const matchesSeason = seasonFilter === "all" || item.season === seasonFilter;
      const matchesMainGroup = mainGroupFilter === "all" || item.main_group === mainGroupFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      const shouldInclude =
        matchesSearch && matchesModelNumber && matchesStore && matchesSeason && matchesMainGroup && matchesCategory;

      if (shouldInclude && storeFilter !== "all") {
        console.log("✅ Including item for store filter:", {
          name: item.name,
          store_id: (item as any).store_id,
          store_name: (item as any).store_name,
          quantity: item.quantity,
        });
      }

      return shouldInclude;
    });

    console.log("✅ Filtered result:", filtered.length, "items");
    if (storeFilter !== "all" && filtered.length === 0) {
      console.log("❌ No items matched store filter. Available store data:");
      finalInventory.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          name: item.name,
          store_id: (item as any).store_id,
          store_name: (item as any).store_name,
          has_store_id: !!(item as any).store_id,
          has_store_name: !!(item as any).store_name,
          stores: (item as any).stores,
        });
      });
    }
    return filtered;
  }, [finalInventory, searchTerm, modelNumberFilter, storeFilter, seasonFilter, mainGroupFilter, categoryFilter]);

  // Add this debug effect to understand the data flow - MOVED AFTER filteredInventory definition
  useEffect(() => {
    console.log("=== INVENTORY DATA FLOW DEBUG ===");
    console.log("storeFilter:", storeFilter);
    console.log("storeInventory length:", storeInventory.length);
    console.log("aggregatedInventory length:", aggregatedInventory?.length || 0);
    console.log("inventory length:", inventory.length);
    console.log("finalInventory length:", finalInventory.length);
    console.log("filteredInventory length:", filteredInventory.length);

    if (storeFilter !== "all" && aggregatedInventory && aggregatedInventory.length > 0) {
      console.log("🔍 DEEP STORE INVENTORY ANALYSIS:");

      // Check which items have the selected store
      const itemsWithStore = aggregatedInventory.filter((item: any) =>
        item.stores?.some((store: any) => store.store_id === storeFilter),
      );

      console.log(`Items with store ${storeFilter}:`, itemsWithStore.length);
      console.log("First item with store data:", itemsWithStore[0]?.stores);
    }
  }, [storeFilter, storeInventory, aggregatedInventory, inventory, finalInventory, filteredInventory]);

  // Unique values for filters - handle cases where properties might not exist
  const uniqueModelNumbers = useMemo(
    () => [...new Set(finalInventory.map((i) => i.item_number).filter(Boolean))].sort(),
    [finalInventory],
  );
  const uniqueSeasons = useMemo(
    () => [...new Set(finalInventory.map((i) => i.season).filter(Boolean))].sort(),
    [finalInventory],
  );
  const uniqueMainGroups = useMemo(
    () => [...new Set(finalInventory.map((i) => i.main_group).filter(Boolean))].sort(),
    [finalInventory],
  );
  const uniqueCategories = useMemo(
    () => [...new Set(finalInventory.map((i) => i.category).filter(Boolean))].sort(),
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

  const handleViewDetails = (item: Item) => {
    setSelectedItemForDetails(item);
    setDetailsOpen(true);
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
                      {storeFilter === "all" ? (item as any).total_quantity || item.quantity : item.quantity}
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
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingItem(item);
                            setDialogOpen(true);
                          }}
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Delete Item">
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

      <ItemDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} item={selectedItemForDetails} />

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
