import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, History, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- 1. FULLY DEFINED INTERFACE ---
interface ItemWithDetails extends Item {
  brand: string | null;
  color_id: string | null;
  item_color_code: string | null;
  origin: string | null;
  department: string | null; // Placeholder

  created_at: string;
  updated_at: string;
  last_restocked: string | null;

  location: string;
  min_stock: number;
  quantity: number;
  unit: string;
  sellingPrice?: number | null;
  cost: number | null;
  tax_rate: number | null;

  item_number: string;
  pos_description: string; // Added from products
  description: string; // Added from products
  season: string;
  color: string;
  size: string;
  category: string;
  main_group: string; // Placeholder
  store_name: string;
  supplier: string;
  gender: string;
}

// --- 2. FINAL CORRECTED Supabase Fetch Function (UNCHANGED) ---
const fetchInventory = async (): Promise<ItemWithDetails[]> => {
  const { data, error } = await supabase.from("variants").select(`
            variant_id, 
            sku, 
            selling_price, 
            cost, 
            tax_rate, 
            unit, 
            color,
            size,
            season,
            color_id, 
            item_color_code, 
            cost_price,
            created_at,        
            updated_at,        
            last_restocked,    
            supplier_id, 
            
            products!inner (
                product_id,
                name, 
                pos_description, 
                description, 
                item_number,
                brand:brand_id(name),
                category:category_id(name), 
                gender:gender_id(name),
                origin:origin_id(name)
            ),
            
            supplier:suppliers(name), 
            
            stock_on_hand (quantity, min_stock, stores (name))
        `);

  if (error) {
    console.error("Error fetching inventory:", error.message);
    throw new Error(`Failed to fetch inventory data. Supabase Error: ${error.message}`);
  }

  return data.map((variant: any) => ({
    id: variant.variant_id,
    sku: variant.sku,
    name: variant.products?.name || "N/A",
    pos_description: variant.products?.pos_description,
    description: variant.products?.description,
    item_number: variant.products?.item_number,

    // Mapped relationship fields (using the new aliases)
    supplier: variant.supplier?.name || "N/A",
    category: variant.products.category?.name || "N/A",
    gender: variant.products.gender?.name || "N/A",
    brand: variant.products.brand?.name || null,
    origin: variant.products.origin?.name || null,

    created_at: variant.created_at,
    updated_at: variant.updated_at,
    last_restocked: variant.last_restocked,

    season: variant.season,
    size: variant.size,
    color: variant.color,
    color_id: variant.color_id || null,
    item_color_code: variant.item_color_code || null,
    department: "N/A",
    main_group: "N/A",

    sellingPrice: variant.selling_price,
    cost: variant.cost || variant.cost_price,
    tax: variant.tax_rate,
    unit: variant.unit,

    // Data access uses the correct 'stock_on_hand' relationship name
    quantity: variant.stock_on_hand[0]?.quantity || 0,
    min_stock: variant.stock_on_hand[0]?.min_stock || 0,
    store_name: variant.stock_on_hand[0]?.stores?.name || "N/A",
    location: variant.stock_on_hand[0]?.stores?.name || "N/A",
  })) as ItemWithDetails[];
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

const ITEMS_PER_PAGE = 20; // Changed to 20 for better table view

const InventoryNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemWithDetails | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemWithDetails[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterItemNumber, setFilterItemNumber] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMainGroup, setFilterMainGroup] = useState("");
  const [filterStore, setFilterStore] = useState("");

  const { data: inventory = [], isLoading, error } = useInventoryQuery();

  // --- FIX APPLIED: Robust filter generation for all options ---

  // Option filters generation
  const itemNumberOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.item_number || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );

  const seasonOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.season || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );

  const colorOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.color || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );

  const sizeOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.size || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.category || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );

  const mainGroupOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.main_group || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );

  const storeOptions = useMemo(
    () =>
      Array.from(
        new Set(inventory.map((item) => String(item.store_name || "")).filter((val) => val.trim().length > 0)),
      ).sort(),
    [inventory],
  );
  // --- END OF FIX ---

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        (item.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (item.sku?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (item.item_number?.toLowerCase() ?? "").includes(searchTerm.toLowerCase());

      const matchesItemNumber = !filterItemNumber || item.item_number === filterItemNumber;
      const matchesSeason = !filterSeason || item.season === filterSeason;
      const matchesColor = !filterColor || item.color === filterColor;
      const matchesSize = !filterSize || item.size === filterSize;
      const matchesCategory = !filterCategory || item.category === filterCategory;
      const matchesMainGroup = !filterMainGroup || item.main_group === filterMainGroup;
      const matchesStore = !filterStore || item.store_name === filterStore;

      return (
        matchesSearch &&
        matchesItemNumber &&
        matchesSeason &&
        matchesColor &&
        matchesSize &&
        matchesCategory &&
        matchesMainGroup &&
        matchesStore
      );
    });
  }, [
    inventory,
    searchTerm,
    filterItemNumber,
    filterSeason,
    filterColor,
    filterSize,
    filterCategory,
    filterMainGroup,
    filterStore,
  ]);

  const pagination = usePagination({
    data: filteredInventory,
    totalItems: filteredInventory.length,
    itemsPerPage: ITEMS_PER_PAGE,
  } as any);

  const displayInventory: ItemWithDetails[] = (pagination as any).data || (pagination as any).paginatedData || [];

  const handleEdit = (item: ItemWithDetails) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item and all its stock?")) return;

    const { error: variantError } = await supabase.from("variants").delete().eq("variant_id", id);

    if (variantError) {
      toast.error(`Failed to delete item: ${variantError.message}`);
    } else {
      toast.success("Item deleted successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
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
    if (selectedItems.length === displayInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(displayInventory);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading inventory...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error loading inventory: {error.message}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" />
          Inventory Management
        </h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate("/inventory/physical")}
            className="bg-purple-100 text-purple-800 hover:bg-purple-200"
          >
            <Layers className="w-4 h-4 mr-2" />
            View/Manage Counts
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Export/Import Data
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>
      </header>

      {/* --- FILTER AND SEARCH BAR --- */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or item number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-sm"
          />
          <div className="text-sm text-muted-foreground">{filteredInventory.length} item(s) found</div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Item Number Filter */}
          <Select value={filterItemNumber} onValueChange={setFilterItemNumber}>
            <SelectTrigger>
              <SelectValue placeholder="Item Number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Item Numbers</SelectItem>
              {itemNumberOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Season Filter */}
          <Select value={filterSeason} onValueChange={setFilterSeason}>
            <SelectTrigger>
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Seasons</SelectItem>
              {seasonOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Color Filter */}
          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger>
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Colors</SelectItem>
              {colorOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Size Filter */}
          <Select value={filterSize} onValueChange={setFilterSize}>
            <SelectTrigger>
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sizes</SelectItem>
              {sizeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Main Group Filter */}
          <Select value={filterMainGroup} onValueChange={setFilterMainGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Main Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Main Groups</SelectItem>
              {mainGroupOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Store/Location Filter */}
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger>
              <SelectValue placeholder="Store/Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Stores</SelectItem>
              {storeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* --- END OF FILTER AND SEARCH BAR --- */}

      <BulkActions
        selectedItems={selectedItems}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedItems([])}
      />

      <div className="border rounded-lg overflow-hidden">
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
              <TableHead>Item No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Loc/Store</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(displayInventory) &&
              displayInventory.map((item: ItemWithDetails) => {
                const isSelected = selectedItems.some((i) => i.id === item.id);
                const isLowStock = item.quantity <= item.min_stock;
                return (
                  <TableRow key={item.id} className={isSelected ? "bg-blue-50" : isLowStock ? "bg-red-50/50" : ""}>
                    <TableCell className="text-center">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectItem(item)} />
                    </TableCell>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.item_number}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.gender}</TableCell>
                    <TableCell>{item.season}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: item.color?.toLowerCase() }}
                          title={item.color || "N/A"}
                        />
                        {item.color}
                      </div>
                    </TableCell>
                    <TableCell>{item.store_name}</TableCell>
                    <TableCell className="text-right">${item.cost ? item.cost.toFixed(2) : "N/A"}</TableCell>
                    <TableCell className="text-right">
                      ${item.sellingPrice ? item.sellingPrice.toFixed(2) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={isLowStock ? "destructive" : "secondary"}>
                        {item.quantity} {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPriceHistoryOpen(true);
                            setSelectedItemForHistory(item);
                          }}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
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
