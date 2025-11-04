import React, { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Layers, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductDialogNew } from "@/components/ProductDialogNew";
import { FileImport } from "@/components/FileImport";
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

// --- Fetch inventory data including PO, transfers, and transactions ---
const fetchInventory = async (): Promise<ItemWithDetails[]> => {
  const { data: itemsData, error: itemsError } = await supabase
    .from<any, any>("items")
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

  const { data: storeInventory, error: storeError } = await supabase
    .from<any, any>("store_inventory")
    .select("item_id, store_id, quantity");
  if (storeError) throw storeError;

  const { data: stores, error: storesError } = await supabase.from<any, any>("stores").select("id, name");
  if (storesError) throw storesError;

  const storeMap = Object.fromEntries((stores || []).map((s) => [s.id, s.name]));

  const stockMap = (storeInventory || []).reduce((acc: any, record: any) => {
    const itemId = record.item_id;
    if (!acc[itemId]) acc[itemId] = { total_quantity: 0, stores: [] };
    acc[itemId].total_quantity += Number(record.quantity) || 0;
    acc[itemId].stores.push({
      store_id: record.store_id,
      store_name: storeMap[record.store_id] || "Unknown",
      quantity: Number(record.quantity) || 0,
    });
    return acc;
  }, {});

  // Fetch purchase orders quantities
  const { data: poItems } = await supabase.from<any, any>("purchase_order_items").select("sku, received_quantity");
  const poMap = (poItems || []).reduce(
    (acc, po) => {
      acc[po.sku] = (acc[po.sku] || 0) + Number(po.received_quantity || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  // Transactions
  const { data: transactions } = await supabase.from<any, any>("transactions").select("item_id, quantity, is_refund");
  const transMap = (transactions || []).reduce(
    (acc, t) => {
      const change = t.is_refund ? Number(t.quantity) : -Number(t.quantity);
      acc[t.item_id] = (acc[t.item_id] || 0) + change;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Transfers
  const { data: transferItems } = await supabase.from<any, any>("transfer_items").select("variant_id, quantity");
  const transferMap = (transferItems || []).reduce(
    (acc, t) => {
      acc[t.variant_id] = (acc[t.variant_id] || 0) + Number(t.quantity);
      return acc;
    },
    {} as Record<string, number>,
  );

  return (itemsData || []).map((item: any) => {
    const storeQty = stockMap[item.id]?.total_quantity || 0;
    const poQty = poMap[item.sku] || 0;
    const transQty = transMap[item.id] || 0;
    const transferQty = transferMap[item.id] || 0;
    const totalQuantity = storeQty + poQty + transQty + transferQty;

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
      quantity: totalQuantity,
      min_stock: item.min_stock || 0,
      last_restocked: item.last_restocked,
      created_at: item.created_at,
      stores: stockMap[item.id]?.stores || [],
    };
  });
};

const useInventoryQuery = () =>
  useQuery<ItemWithDetails[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: fetchInventory,
    staleTime: 2 * 60 * 1000,
  });

const ITEMS_PER_PAGE = 20;

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventory = [], isLoading, error } = useInventoryQuery();

  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (i) =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.sku.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [inventory, searchTerm]);

  const pagination = usePagination({
    totalItems: filteredInventory.length,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const displayInventory = filteredInventory.slice(pagination.startIndex, pagination.endIndex);

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
    const { error: delError } = await supabase.from<any, any>("items").delete().eq("id", id);
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

      {/* Search */}
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
              <TableHead className="text-right">Stock Qty</TableHead>
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
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(item);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3 h-3" />
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
        totalItems={filteredInventory.length}
        startIndex={pagination.startIndex + 1}
        endIndex={pagination.endIndex}
        canGoPrev={pagination.canGoPrev}
        canGoNext={pagination.canGoNext}
        onPageChange={pagination.goToPage} 
      />

      {/* Dialogs */}
      <ProductDialogNew open={dialogOpen} onOpenChange={setDialogOpen} editingItem={editingItem} />
      <FileImport open={importOpen} onOpenChange={setImportOpen} onImportComplete={() => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })} />
    </div>
  );
};

export default InventoryPage;
