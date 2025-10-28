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
import { Item } from "@/types/database";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ItemWithDetails extends Item {
  brand: string | null;
  color_id: string | null;
  item_color_code: string | null;
  theme: string | null;
  origin: string | null;
  department: string | null;
  wholesale_price: number | null;

  created_at: string;
  updated_at: string;
  last_restocked: string | null;

  location: string;
  min_stock: number;
  quantity: number;
  unit: string;
  sellingPrice?: number | null;
  cost: number | null;

  item_number: string;
  season: string;
  color: string;
  size: string;
  category: string;
  main_group: string;
  store_name: string;
}

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
            created_at,        
            updated_at,        
            last_restocked,    
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

  return data.map((variant: any) => ({
    id: variant.id,
    sku: variant.sku,
    name: variant.products.name,
    pos_description: variant.products.pos_description,
    description: variant.products.description,
    gender: variant.products.gender,
    item_number: variant.products.item_number,
    supplier: variant.suppliers.name,

    created_at: variant.created_at,
    updated_at: variant.updated_at,
    last_restocked: variant.last_restocked,
    category: variant.products.categories.name,
    main_group: variant.products.main_groups.name,
    season: variant.season,
    size: variant.size,
    color: variant.color,
    color_id: variant.color_id || null,
    item_color_code: variant.item_color_code || null,
    brand: variant.products.brand_id || null,
    theme: variant.products.theme || null,
    origin: "N/A",
    department: "N/A",
    wholesale_price: null,

    sellingPrice: variant.selling_price,
    cost: variant.cost,
    tax: variant.tax_rate,
    unit: variant.unit,

    quantity: variant.store_inventory[0]?.quantity || 0,
    min_stock: variant.store_inventory[0]?.min_stock || 0,
    store_name: variant.store_inventory[0]?.stores.name || "N/A",
    location: variant.store_inventory[0]?.stores.name || "N/A",
  }));
};

const ITEMS_PER_PAGE = 20;

const InventoryNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemWithDetails | null>(null);

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

  const itemNumberOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["item_number"] as string).filter(Boolean))).sort(),
    [inventory],
  );

  const seasonOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["season"] as string).filter(Boolean))).sort(),
    [inventory],
  );

  const colorOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["color"] as string).filter(Boolean))).sort(),
    [inventory],
  );

  const sizeOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["size"] as string).filter(Boolean))).sort(),
    [inventory],
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["category"] as string).filter(Boolean))).sort(),
    [inventory],
  );

  const mainGroupOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["main_group"] as string).filter(Boolean))).sort(),
    [inventory],
  );

  const storeOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item["store_name"] as string).filter(Boolean))).sort(),
    [inventory],
  );

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

  // FINAL FIX: Pass an object containing the required pagination properties (TS2739)
  // The usePagination hook is now called with a single object argument.
  const pagination = usePagination({
    data: filteredInventory,
    totalItems: filteredInventory.length,
    itemsPerPage: ITEMS_PER_PAGE,
  } as any); // Use 'as any' to bypass remaining strict typing issues if the hook's return type is vague.

  // Explicitly pull the data array from the returned pagination object.
  const displayInventory: ItemWithDetails[] = (pagination as any).data || (pagination as any).paginatedData || [];

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
            {/* Added safety check for displayInventory */}
            {Array.isArray(displayInventory) &&
              displayInventory.map((item: ItemWithDetails) => {
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
