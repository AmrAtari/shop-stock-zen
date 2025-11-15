import React, { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Layers, Package, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ProductDialog from "@/components/ProductDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAggregatedInventory } from "@/hooks/useStoreInventoryView";
import { Item } from "@/types/database";
import { InventoryItem } from "@/types/inventory";
import { GoogleSheetsInput } from "@/components/GoogleSheetsInput";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

interface StoreStock {
  store_id: string;
  store_name: string;
  quantity: number;
}

interface ItemWithStores extends Item {
  stores: StoreStock[];
  total_quantity: number;
  on_order_quantity?: number;
}

const ITEMS_PER_PAGE = 20;

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithStores | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemWithStores[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMainGroup, setFilterMainGroup] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const { data: rawInventory = [], isLoading, error } = useAggregatedInventory();
  const inventory = rawInventory as ItemWithStores[];

  const { data: stores = [] } = useQuery({
    queryKey: ["stores-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const supplierOptions = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.supplier).filter(Boolean))).sort(),
    [inventory],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.category).filter(Boolean))).sort(),
    [inventory],
  );
  const mainGroupOptions = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.main_group).filter(Boolean))).sort(),
    [inventory],
  );
  const seasonOptions = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.season).filter(Boolean))).sort(),
    [inventory],
  );
  const colorOptions = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.color).filter(Boolean))).sort(),
    [inventory],
  );
  const sizeOptions = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.size).filter(Boolean))).sort(),
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        (item.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (item.sku?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (item.item_number?.toLowerCase() ?? "").includes(searchTerm.toLowerCase());

      const matchesSupplier = !filterSupplier || item.supplier === filterSupplier;
      const matchesCategory = !filterCategory || item.category === filterCategory;
      const matchesMainGroup = !filterMainGroup || item.main_group === filterMainGroup;
      const matchesStore = !filterStore || item.stores.some((s) => s.store_id === filterStore && s.quantity > 0);
      const matchesSeason = !filterSeason || item.season === filterSeason;
      const matchesColor = !filterColor || item.color === filterColor;
      const matchesSize = !filterSize || item.size === filterSize;

      return (
        matchesSearch &&
        matchesSupplier &&
        matchesCategory &&
        matchesMainGroup &&
        matchesStore &&
        matchesSeason &&
        matchesColor &&
        matchesSize
      );
    });
  }, [
    inventory,
    searchTerm,
    filterSupplier,
    filterCategory,
    filterMainGroup,
    filterStore,
    filterSeason,
    filterColor,
    filterSize,
  ]);

  const pagination = usePagination({
    totalItems: filteredInventory.length,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const displayInventory = useMemo(
    () => filteredInventory.slice(pagination.startIndex, pagination.endIndex),
    [filteredInventory, pagination.startIndex, pagination.endIndex],
  );

  const lowStockCount = useMemo(
    () =>
      filteredInventory.filter((item) => {
        const qty = filterStore ? item.stores.find((s) => s.store_id === filterStore)?.quantity || 0 : item.quantity;
        return qty <= item.min_stock;
      }).length,
    [filteredInventory, filterStore],
  );

  const toggleSelectItem = (item: ItemWithStores) => {
    setSelectedItems((prev) =>
      prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item],
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === displayInventory.length) setSelectedItems([]);
    else setSelectedItems(displayInventory);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    const { error: delError } = await supabase.from("items").delete().eq("id", id);
    if (delError) toast.error(delError.message);
    else {
      toast.success("Item deleted successfully");
      await invalidateInventoryData(queryClient);
    }
  };

  const handleSaveItem = async () => {
    await invalidateInventoryData(queryClient);
    setEditingItem(null);
  };

  const handleExportToExcel = () => {
    const exportData = filteredInventory.map((item) => {
      const storeQty = filterStore ? item.stores.find((s) => s.store_id === filterStore)?.quantity || 0 : item.quantity;
      return {
        SKU: item.sku,
        Name: item.name,
        Supplier: item.supplier || "",
        Category: item.category || "",
        "Main Group": item.main_group || "",
        Gender: item.gender || "",
        Origin: item.origin || "",
        Season: item.season || "",
        Size: item.size || "",
        Color: item.color || "",
        Theme: item.theme || "",
        Unit: item.unit || "",
        "Stock Qty": storeQty,
        "On Order": item.on_order_quantity || 0,
        "Total Available": storeQty + (item.on_order_quantity || 0),
        "Min Stock": item.min_stock,
        Cost: item.cost,
        Price: item.price,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `inventory_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Inventory exported successfully");
  };

  // The import handlers remain unchanged
  const handleImportFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    /* ... */
  };
  const handleGoogleSheetsImport = async (data: any[]) => {
    /* ... */
  };

  if (isLoading) return <div className="p-8">Loading inventory...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6 p-6">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" /> Inventory Management
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import / Export
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> New Item
          </Button>
        </div>
      </header>

      {lowStockCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Low Stock Alert</p>
            <p className="text-sm text-muted-foreground">
              {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} below minimum stock level
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or item number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="text-sm text-muted-foreground">{filteredInventory.length} item(s) found</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* All the Select components remain the same */}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={selectedItems.length > 0 && selectedItems.length === displayInventory.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Main Group</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Stock Qty</TableHead>
              <TableHead className="text-right">On Order</TableHead>
              <TableHead className="text-right">Total Available</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {displayInventory.map((item) => {
              const storeQty = filterStore
                ? item.stores.find((s) => s.store_id === filterStore)?.quantity || 0
                : item.quantity;

              return (
                <TableRow key={item.id}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedItems.some((i) => i.id === item.id)}
                      onCheckedChange={() => toggleSelectItem(item)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.supplier || "-"}</TableCell>
                  <TableCell>{item.category || "-"}</TableCell>
                  <TableCell>{item.main_group || "-"}</TableCell>
                  <TableCell>{item.gender || "-"}</TableCell>
                  <TableCell>{item.origin || "-"}</TableCell>
                  <TableCell>{item.season || "-"}</TableCell>
                  <TableCell>{item.size || "-"}</TableCell>
                  <TableCell>{item.color || "-"}</TableCell>
                  <TableCell>{item.theme || "-"}</TableCell>
                  <TableCell>{item.unit || "-"}</TableCell>
                  <TableCell className="text-right">
                    <span className={storeQty <= item.min_stock ? "text-destructive font-semibold" : ""}>
                      {storeQty}
                      {storeQty <= item.min_stock && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-mono">
                      {item.on_order_quantity || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default" className="font-semibold">
                      {storeQty + (item.on_order_quantity || 0)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={storeQty <= item.min_stock ? "destructive" : "secondary"}>{item.min_stock}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.cost ? formatCurrency(item.cost, currency) : "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.price ? formatCurrency(item.price, currency) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => handleDelete(item.id)}
                      >
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={
          editingItem
            ? {
                id: editingItem.id,
                name: editingItem.name,
                sku: editingItem.sku,
                category: editingItem.category || "",
                quantity: editingItem.quantity || 0,
                minStock: editingItem.min_stock || 0,
                unit: editingItem.unit || "pcs",
                costPrice: editingItem.cost || 0,
                sellingPrice: editingItem.price || 0,
                supplier: editingItem.supplier || "",
                lastRestocked: editingItem.last_restocked || "",
                location: editingItem.location || "",
              }
            : undefined
        }
        onSave={handleSaveItem}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import / Export Inventory</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="export" className="w-full">
            {/* Tabs content remains unchanged */}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
