import React, { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Layers, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ProductDialogNew from "@/components/ProductDialogNew";
import FileImport from "@/components/FileImport";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StoreStock {
  store_id: string;
  store_name: string;
  quantity: number;
}

interface ItemWithDetails {
  id: string;
  sku: string;
  name: string;
  supplier: string;
  gender: string;
  main_group: string;
  category: string;
  origin: string;
  season: string;
  size: string;
  color: string;
  theme: string;
  unit: string;
  price: number;
  cost: number;
  item_number: string;
  pos_description: string;
  description: string;
  color_id: string;
  item_color_code: string;
  color_id_code: string;
  location: string;
  quantity: number;
  min_stock: number;
  last_restocked: string | null;
  created_at: string | null;
  stores: StoreStock[];
}

// --- Fetch inventory data with PO quantities and store inventory ---
const fetchInventory = async (): Promise<ItemWithDetails[]> => {
  const { data: itemsData, error: itemsError } = await supabase
    .from("items")
    .select(
      `
      *,
      supplier:suppliers(name),
      gender:genders(name),
      main_group:main_groups(name),
      category:categories(name),
      origin:origins(name),
      season:seasons(name),
      size:sizes(name),
      color:colors(name),
      theme:themes(name)
    `,
    )
    .order("name");
  if (itemsError) throw itemsError;

  // Fetch PO received quantities
  const { data: poItems, error: poError } = await supabase
    .from("purchase_order_items")
    .select("item_id, received_quantity");
  if (poError) throw poError;

  const poMap: Record<string, number> = {};
  (poItems || []).forEach((po) => {
    const key = String(po.item_id);
    poMap[key] = (poMap[key] || 0) + Number(po.received_quantity || 0);
  });

  // Fetch store inventory
  const { data: storeInventory, error: storeError } = await supabase
    .from("store_inventory")
    .select("item_id, store_id, quantity");
  if (storeError) throw storeError;

  const { data: stores, error: storesError } = await supabase.from("stores").select("id, name");
  if (storesError) throw storesError;

  const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s.name]));

  const stockMap = (storeInventory || []).reduce((acc: any, record: any) => {
    const itemId = String(record.item_id);
    if (!acc[itemId]) acc[itemId] = { total_quantity: 0, stores: [] };
    acc[itemId].total_quantity += Number(record.quantity) || 0;
    acc[itemId].stores.push({
      store_id: record.store_id,
      store_name: storeMap[record.store_id] || "Unknown",
      quantity: Number(record.quantity) || 0,
    });
    return acc;
  }, {});

  return (itemsData || []).map((item: any) => {
    const itemId = String(item.id);
    return {
      id: itemId,
      sku: item.sku || "N/A",
      name: item.name || "N/A",
      supplier: item.supplier?.name || "",
      gender: item.gender?.name || "",
      main_group: item.main_group?.name || "",
      category: item.category?.name || "",
      origin: item.origin?.name || "",
      season: item.season?.name || "",
      size: item.size?.name || "",
      color: item.color?.name || "",
      theme: item.theme?.name || "",
      unit: item.unit || "",
      price: item.price || 0,
      cost: item.cost || 0,
      item_number: item.item_number || "",
      pos_description: item.pos_description || "",
      description: item.description || "",
      color_id: item.color_id || "",
      item_color_code: item.item_color_code || "",
      color_id_code: item.color_id_code || "",
      location: item.location || "",
      quantity: (poMap[itemId] || 0) + (stockMap[itemId]?.total_quantity || 0),
      min_stock: item.min_stock || 0,
      last_restocked: item.last_restocked,
      created_at: item.created_at,
      stores: stockMap[itemId]?.stores || [],
    };
  });
};

const useInventoryQuery = () => {
  return useQuery<ItemWithDetails[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: fetchInventory,
    staleTime: 2 * 60 * 1000,
  });
};

const ITEMS_PER_PAGE = 20;

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMainGroup, setFilterMainGroup] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");

  const { data: inventory = [], isLoading, error } = useInventoryQuery();

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
      const matchesStore = !filterStore || item.stores.some((s) => s.store_id === filterStore);
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

  const toggleSelectItem = (item: ItemWithDetails) => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    }
  };

  if (isLoading) return <div className="p-8">Loading inventory...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
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
          {[
            { label: "Supplier", value: filterSupplier, setter: setFilterSupplier, options: supplierOptions },
            { label: "Category", value: filterCategory, setter: setFilterCategory, options: categoryOptions },
            { label: "Main Group", value: filterMainGroup, setter: setFilterMainGroup, options: mainGroupOptions },
            { label: "Store", value: filterStore, setter: setFilterStore, options: stores.map((s) => s.name) },
            { label: "Season", value: filterSeason, setter: setFilterSeason, options: seasonOptions },
            { label: "Color", value: filterColor, setter: setFilterColor, options: colorOptions },
            { label: "Size", value: filterSize, setter: setFilterSize, options: sizeOptions },
          ].map(({ label, value, setter, options }) => (
            <Select key={label} value={value} onValueChange={(v) => setter(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All {label}s</SelectItem>
                {options.map((o: any) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
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
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {displayInventory.map((item) => (
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
                  {item.stores.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="link" size="sm" className="text-primary">
                          <Package className="w-3 h-3 mr-1" />
                          {item.quantity}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-background border shadow-lg z-50">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Stock by Store</h4>
                          <div className="space-y-1">
                            {item.stores.map((store) => (
                              <div key={store.store_id} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{store.store_name}</span>
                                <Badge variant="secondary">{store.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold text-sm">
                            <span>Total</span>
                            <span>{item.quantity}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-muted-foreground">{item.quantity}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={item.quantity <= item.min_stock ? "destructive" : "secondary"}>
                    {item.min_stock}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{item.cost ? item.cost.toFixed(2) : "-"}</TableCell>
                <TableCell className="text-right font-semibold">{item.price ? item.price.toFixed(2) : "-"}</TableCell>
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
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
        item={
          editingItem
            ? {
                ...editingItem,
                sellingPrice: editingItem.price,
                supplier_id: null,
                product_id: editingItem.id,
                tax_rate: null,
                wholesale_price: null,
                brand_id: null,
                category_id: null,
                gender_id: null,
                origin_id: null,
              }
            : undefined
        }
        onSave={() => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })}
      />
      <FileImport open={importOpen} onOpenChange={setImportOpen} onImportComplete={() => {}} />
    </div>
  );
};

export default InventoryPage;
