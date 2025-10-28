import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, History, Layers } from "lucide-react";
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
import { Item } from "@/types/database"; // Assuming your base Item type is here
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 1. TYPE FIX: Define a local interface that extends the imported Item type,
// ensuring all mandatory fields are covered either by the base Item or the new fields.
// We explicitly make the optional/placehoder fields nullable/optional.
interface ItemWithDetails extends Item {
  // Required fields from the base Item type that might be missing in fetch's mapping
  brand: string | null;
  color_id: string | null;
  item_color_code: string | null;
  theme: string | null;
  origin: string | null;
  wholesale_price: number | null;

  // Fields coming from store_inventory
  location: string;
  min_stock: number;
  quantity: number;
  unit: string;
  sellingPrice?: number | null;

  // NEW ATTRIBUTES FROM IMPORT (Now explicitly defined)
  item_number: string;
  season: string;
  color: string;
  size: string;
  category: string;
  main_group: string;
  store_name: string; // The location/store name
}

// Supabase Data Fetching Function - MODIFIED TO PULL ALL REQUIRED FIELDS
const fetchInventory = async (): Promise<ItemWithDetails[]> => {
  const { data, error } = await supabase.from("variants").select(`
            id, 
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
            products!inner (
                name, 
                pos_description, 
                description, 
                gender,
                item_number,
                theme,
                brand_id,
                categories!inner (name), 
                main_groups!inner (name)
            ),
            suppliers!inner (name),
            store_inventory!inner (quantity, min_stock, stores!inner (name))
        `);

  if (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("Failed to fetch inventory data.");
  }

  // Map and flatten the data structure to ItemWithDetails array
  return data.map((variant: any) => ({
    id: variant.id,
    sku: variant.sku,
    name: variant.products.name,
    pos_description: variant.products.pos_description,
    description: variant.products.description,
    gender: variant.products.gender,
    item_number: variant.products.item_number,
    supplier: variant.suppliers.name,

    // Mapped fields to satisfy ItemWithDetails
    category: variant.products.categories.name,
    main_group: variant.products.main_groups.name,
    season: variant.season,
    size: variant.size,
    color: variant.color,
    color_id: variant.color_id || null, // Mapped
    item_color_code: variant.item_color_code || null, // Mapped
    brand: variant.products.brand_id || null, // Mapped (assuming brand_id holds the brand name/ID)
    theme: variant.products.theme || null, // Mapped
    origin: "N/A", // Placeholder since not imported/stored directly
    department: "N/A", // Placeholder for missing Item fields
    wholesale_price: null, // Placeholder for missing Item fields

    sellingPrice: variant.selling_price,
    cost: variant.cost,
    tax: variant.tax_rate,
    unit: variant.unit,

    // Flatten store_inventory data
    quantity: variant.store_inventory[0]?.quantity || 0,
    min_stock: variant.store_inventory[0]?.min_stock || 0,
    store_name: variant.store_inventory[0]?.stores.name || "N/A",
    location: variant.store_inventory[0]?.stores.name || "N/A", // Using store_name for location
  }));
};

// Renamed the component to match the file
const InventoryNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemWithDetails | null>(null);

  // NEW FILTER STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [filterItemNumber, setFilterItemNumber] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMainGroup, setFilterMainGroup] = useState("");
  const [filterStore, setFilterStore] = useState("");

  const {
    data: inventory = [],
    isLoading,
    error,
  } = useQuery<ItemWithDetails[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: fetchInventory,
  });

  // --- UTILITY MEMOS FOR FILTER OPTIONS ---
  const getUniqueOptions = (key: keyof ItemWithDetails) =>
    Array.from(new Set(inventory.map((item) => item[key] as string).filter(Boolean))).sort();

  const itemNumberOptions = useMemo(() => getUniqueOptions("item_number"), [inventory]);
  const seasonOptions = useMemo(() => getUniqueOptions("season"), [inventory]);
  const colorOptions = useMemo(() => getUniqueOptions("color"), [inventory]);
  const sizeOptions = useMemo(() => getUniqueOptions("size"), [inventory]);
  const categoryOptions = useMemo(() => getUniqueOptions("category"), [inventory]);
  const mainGroupOptions = useMemo(() => getUniqueOptions("main_group"), [inventory]);
  const storeOptions = useMemo(() => getUniqueOptions("store_name"), [inventory]);

  // --- FILTERED INVENTORY LOGIC ---
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_number.toLowerCase().includes(searchTerm.toLowerCase());

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

  // 2. PAGINATION FIX: Assuming the usePagination hook returns the data under the key 'data'
  // instead of 'paginatedData' to fix TS2339. It also only needs one argument destructuring.
  const {
    data: displayInventory, // Changed from paginatedData
    ...pagination
  } = usePagination(filteredInventory, 20); // 20 items per page

  // --- HANDLERS ---

  const handleCreateNew = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: ItemWithDetails) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item and all its stock?")) return;

    // Perform cascade delete (stock and variant)
    const { error: variantError } = await supabase.from("variants").delete().eq("id", id);

    if (variantError) {
      toast.error(`Failed to delete item: ${variantError.message}`);
    } else {
      toast.success("Item deleted successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    }
  };

  if (isLoading) {
    return <div>Loading inventory...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading inventory: {error.message}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" />
          Inventory Management
        </h1>
        <div className="flex space-x-2">
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
          <Button onClick={handleCreateNew}>
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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10px]">
                <Checkbox />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Item No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Main Group</TableHead>
              <TableHead>Supplier</TableHead>
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
            {displayInventory.map((item) => {
              const isLowStock = item.quantity <= item.min_stock;
              return (
                <TableRow key={item.id} className={isLowStock ? "bg-red-50/50" : ""}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.item_number}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.main_group}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.season}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Simplified color display. You may need a map for color names to HEX codes. */}
                      <span
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: item.color.toLowerCase() }}
                        title={item.color}
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
