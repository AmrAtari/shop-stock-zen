import React, { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Layers, History } from "lucide-react";
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
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Data Interface ---
interface ItemWithDetails {
  id: string; // ✅ changed from number → string
  product_id?: string | null;
  sku: string;
  name: string;
  supplier: string;
  supplier_id: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  sellingPrice: number | null;
  cost: number | null;
  unit: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_restocked: string | null;
  item_number?: string;
  description?: string;
  pos_description?: string;
  theme?: string;
  wholesale_price?: number | null;
  tax_rate?: number | null;
  brand_id?: string | null;
  category_id?: string | null;
  gender_id?: string | null;
  origin_id?: string | null;
}

// --- Fetch Inventory Data ---
const fetchInventory = async (): Promise<ItemWithDetails[]> => {
  const { data, error } = await supabase.from("variants").select(`
      variant_id,
      sku,
      selling_price,
      cost,
      cost_price,
      tax_rate,
      unit,
      color,
      size,
      season,
      supplier_id,
      created_at,
      updated_at,
      last_restocked,
      products (
        product_id,
        name,
        pos_description,
        description,
        item_number,
        theme,
        wholesale_price,
        brand_id,
        category_id,
        gender_id,
        origin_id
      ),
      suppliers!variants_supplier_id_fkey (
        id,
        name
      )
    `);

  if (error) {
    console.error("❌ Error fetching inventory:", error.message);
    throw new Error(`Failed to fetch inventory data: ${error.message}`);
  }

  console.log("🧩 Raw inventory data:", data);

  return (
    data?.map((variant: any) => ({
      id: String(variant.variant_id), // ✅ cast to string
      product_id: variant.products?.product_id || null,
      sku: variant.sku || "N/A",
      name: variant.products?.name || "N/A",
      supplier: variant.suppliers?.name || "N/A",
      supplier_id: variant.suppliers?.id || null,
      size: variant.size || null,
      color: variant.color || null,
      season: variant.season || null,
      sellingPrice: variant.selling_price || null,
      cost: variant.cost || variant.cost_price || null,
      unit: variant.unit || null,
      created_at: variant.created_at || null,
      updated_at: variant.updated_at || null,
      last_restocked: variant.last_restocked || null,
      item_number: variant.products?.item_number || "N/A",
      description: variant.products?.description || "N/A",
      pos_description: variant.products?.pos_description || "N/A",
      theme: variant.products?.theme || null,
      wholesale_price: variant.products?.wholesale_price || null,
      tax_rate: variant.tax_rate || null,
      brand_id: variant.products?.brand_id || null,
      category_id: variant.products?.category_id || null,
      gender_id: variant.products?.gender_id || null,
      origin_id: variant.products?.origin_id || null,
    })) || []
  );
};

const useInventoryQuery = () => {
  return useQuery<ItemWithDetails[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: fetchInventory,
  });
};

const ITEMS_PER_PAGE = 20;

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemWithDetails | null>(null);

  // Selection & filters
  const [selectedItems, setSelectedItems] = useState<ItemWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");

  const { data: inventory = [], isLoading, error } = useInventoryQuery();

  // --- Filter Options ---
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

  // --- Filtered Data ---
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        (item.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (item.sku?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
        (item.item_number?.toLowerCase() ?? "").includes(searchTerm.toLowerCase());
      const matchesSeason = !filterSeason || item.season === filterSeason;
      const matchesColor = !filterColor || item.color === filterColor;
      const matchesSize = !filterSize || item.size === filterSize;

      return matchesSearch && matchesSeason && matchesColor && matchesSize;
    });
  }, [inventory, searchTerm, filterSeason, filterColor, filterSize]);

  // --- Pagination ---
  const pagination = usePagination({
    totalItems: filteredInventory.length,
    itemsPerPage: ITEMS_PER_PAGE,
  });
  const displayInventory: ItemWithDetails[] = useMemo(
    () => filteredInventory.slice(pagination.startIndex, pagination.endIndex),
    [filteredInventory, pagination.startIndex, pagination.endIndex],
  );
  // --- Selection logic ---
  const toggleSelectItem = (item: ItemWithDetails) => {
    setSelectedItems((prev) =>
      prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item],
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === displayInventory.length) setSelectedItems([]);
    else setSelectedItems(displayInventory);
  };

  // --- Delete handler ---
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    const { error: delError } = await supabase.from("variants").delete().eq("variant_id", id);
    if (delError) toast.error(delError.message);
    else {
      toast.success("Item deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    }
  };

  // --- UI States ---
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={filterSeason} onValueChange={(v) => setFilterSeason(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasonOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterColor} onValueChange={(v) => setFilterColor(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors</SelectItem>
              {colorOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSize} onValueChange={(v) => setFilterSize(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes</SelectItem>
              {sizeOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
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
              <TableHead>Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Color</TableHead>
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
                <TableCell>{item.sku}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.supplier}</TableCell>
                <TableCell>{item.season}</TableCell>
                <TableCell>{item.size}</TableCell>
                <TableCell>{item.color}</TableCell>
                <TableCell className="text-right">{item.cost ? item.cost.toFixed(2) : "N/A"}</TableCell>
                <TableCell className="text-right">{item.sellingPrice ? item.sellingPrice.toFixed(2) : "N/A"}</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
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
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

      {/* Dialogs */}
      <ProductDialogNew
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={
          editingItem
            ? {
                ...editingItem,
                product_id: editingItem.product_id || editingItem.id,
                item_number: editingItem.item_number || "",
                pos_description: editingItem.pos_description || null,
                description: editingItem.description || null,
                theme: editingItem.theme || null,
                tax_rate: editingItem.tax_rate || null,
                wholesale_price: editingItem.wholesale_price || null,
                brand_id: editingItem.brand_id || null,
                category_id: editingItem.category_id || null,
                gender_id: editingItem.gender_id || null,
                origin_id: editingItem.origin_id || null,
              }
            : undefined
        }
        onSave={() => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })}
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

export default InventoryPage;
