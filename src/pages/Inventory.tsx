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

// --- Fetch inventory data including PO, transfers, transactions ---
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

  // Fetch purchase orders
  const { data: poItems, error: poError } = await supabase
    .from("purchase_order_items")
    .select("item_id, received_quantity");
  if (poError) throw poError;

  const poMap = (poItems || []).reduce((acc: any, po: any) => {
    acc[po.item_id] = (acc[po.item_id] || 0) + Number(po.received_quantity || 0);
    return acc;
  }, {});

  // Fetch transfers
  const { data: transfersData, error: transfersError } = await supabase.from("transfers").select(`
      transfer_id,
      from_store_id,
      to_store_id,
      transfer_items:transfer_items(variant_id, quantity)
    `);
  if (transfersError) throw transfersError;

  const transferMap: Record<string, number> = {};
  (transfersData || []).forEach((t: any) => {
    t.transfer_items.forEach((ti: any) => {
      // Subtract from from_store
      transferMap[ti.variant_id] = (transferMap[ti.variant_id] || 0) - Number(ti.quantity || 0);
      // Add to to_store
      transferMap[ti.variant_id] += Number(ti.quantity || 0);
    });
  });

  // Fetch transactions (sales and refunds)
  const { data: transactionsData, error: transError } = await supabase
    .from("transactions")
    .select("item_id, quantity, is_refund, is_refunded");
  if (transError) throw transError;

  const transMap = (transactionsData || []).reduce((acc: any, t: any) => {
    let qty = Number(t.quantity || 0);
    if (t.is_refund || t.is_refunded)
      qty = qty; // refund adds back
    else qty = -qty; // sold decreases stock
    acc[t.item_id] = (acc[t.item_id] || 0) + qty;
    return acc;
  }, {});

  return (itemsData || []).map((item: any) => {
    const quantity = (poMap[item.id] || 0) + (transferMap[item.id] || 0) + (transMap[item.id] || 0);

    return {
      id: item.id,
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
      quantity,
      min_stock: item.min_stock || 0,
      last_restocked: item.last_restocked,
      created_at: item.created_at,
      stores: [], // Can be added later when physical inventory is used
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
                  <span className={item.quantity === 0 ? "text-muted-foreground" : ""}>{item.quantity}</span>
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
