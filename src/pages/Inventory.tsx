import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, History, Clipboard, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const InventoryNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<{ id: string; name: string } | null>(null);

  // Filter states
  const [modelNumberFilter, setModelNumberFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [mainGroupFilter, setMainGroupFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("name");

      if (error) {
        toast.error("Failed to load inventory");
        throw error;
      }

      return data || [];
    },
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModelNumber = modelNumberFilter === "all" || item.item_number === modelNumberFilter;
      const matchesLocation = locationFilter === "all" || item.location === locationFilter;
      const matchesSeason = seasonFilter === "all" || item.season === seasonFilter;
      const matchesMainGroup = mainGroupFilter === "all" || item.main_group === mainGroupFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return (
        matchesSearch && matchesModelNumber && matchesLocation && matchesSeason && matchesMainGroup && matchesCategory
      );
    });
  }, [inventory, searchTerm, modelNumberFilter, locationFilter, seasonFilter, mainGroupFilter, categoryFilter]);

  // Get unique filter values
  const uniqueModelNumbers = useMemo(() => {
    const numbers = inventory.map((item) => item.item_number).filter(Boolean);
    return [...new Set(numbers)].sort();
  }, [inventory]);

  const uniqueLocations = useMemo(() => {
    const locations = inventory.map((item) => item.location).filter(Boolean);
    return [...new Set(locations)].sort();
  }, [inventory]);

  const uniqueSeasons = useMemo(() => {
    const seasons = inventory.map((item) => item.season).filter(Boolean);
    return [...new Set(seasons)].sort();
  }, [inventory]);

  const uniqueMainGroups = useMemo(() => {
    const groups = inventory.map((item) => item.main_group).filter(Boolean);
    return [...new Set(groups)].sort();
  }, [inventory]);

  const uniqueCategories = useMemo(() => {
    const categories = inventory.map((item) => item.category).filter(Boolean);
    return [...new Set(categories)].sort();
  }, [inventory]);

  const pagination = usePagination({
    totalItems: filteredInventory.length,
    itemsPerPage: 20,
    initialPage: 1,
  });

  const paginatedInventory = useMemo(() => {
    return filteredInventory.slice(pagination.startIndex, pagination.endIndex);
  }, [filteredInventory, pagination.startIndex, pagination.endIndex]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      // Delete associated price levels first
      await supabase.from("price_levels").delete().eq("item_id", id);

      // Then delete the item
      const { error } = await supabase.from("items").delete().eq("id", id);

      if (error) throw error;
      toast.success("Item deleted successfully");

      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.categoryDistribution });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.lowStock });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(inventory);
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
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your clothing and shoes inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/inventory/physical")}
          >
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
                  <SelectItem value="all">All Model Numbers</SelectItem>
                  {uniqueModelNumbers.map((num) => (
                    <SelectItem key={num} value={num}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
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
                  <SelectItem value="all">All Main Groups</SelectItem>
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
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Main Group</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Prices</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.department || "-"}</TableCell>
                      <TableCell>{item.main_group || "-"}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{item.size || "-"}</TableCell>
                      <TableCell>{item.color || "-"}</TableCell>
                      <TableCell>{item.gender || "-"}</TableCell>
                      <TableCell>{item.season || "-"}</TableCell>
                      <TableCell>{item.origin || "-"}</TableCell>
                      <TableCell>{item.theme || "-"}</TableCell>
                      <TableCell>{item.supplier || "-"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{item.location || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItemForHistory({ id: item.id, name: item.name });
                            setPriceHistoryOpen(true);
                          }}
                        >
                          <History className="w-4 h-4 mr-1" />
                          History
                        </Button>
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
      </div>

      <ProductDialogNew open={dialogOpen} onOpenChange={setDialogOpen} item={editingItem} onSave={() => {}} />
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

      <ProductDialogNew open={dialogOpen} onOpenChange={setDialogOpen} item={editingItem} onSave={() => {}} />

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
