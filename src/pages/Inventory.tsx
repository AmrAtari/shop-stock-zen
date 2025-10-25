import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Upload, Download, History, Clipboard } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { Label } from "@/components/ui/label";
import { useStoreInventoryView, useAggregatedInventory } from "@/hooks/useStoreInventoryView";
import { useStores } from "@/hooks/usePurchaseOrders";

const InventoryNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [mainGroupFilter, setMainGroupFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: stores = [] } = useStores();
  const { data: storeInventory = [], isLoading: storeInvLoading } = useStoreInventoryView(
    storeFilter !== "all" ? storeFilter : undefined,
  );
  const { data: aggregatedInventory = [], isLoading: aggLoading } = useAggregatedInventory();

  const inventory =
    storeFilter === "all"
      ? aggregatedInventory
      : storeInventory.map((si) => ({
          id: si.item_id,
          sku: si.sku,
          name: si.item_name,
          category: si.category,
          brand: si.brand || "",
          quantity: si.quantity,
          min_stock: si.min_stock,
          unit: si.unit,
          store_name: si.store_name,
          store_id: si.store_id,
        }));

  const isLoading = storeInvLoading || aggLoading;

  const filteredInventory = useMemo(() => {
    return (inventory as Item[]).filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const sku = item.sku?.toLowerCase() || "";
      const category = item.category?.toLowerCase() || "";
      const search = searchTerm.toLowerCase();

      const matchesSearch = name.includes(search) || sku.includes(search) || category.includes(search);
      const matchesStore = storeFilter === "all" || (item as any).store_id === storeFilter;
      const matchesSeason = seasonFilter === "all" || (item as any).season === seasonFilter;
      const matchesMainGroup = mainGroupFilter === "all" || item.main_group === mainGroupFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStore && matchesSeason && matchesMainGroup && matchesCategory;
    });
  }, [inventory, searchTerm, storeFilter, seasonFilter, mainGroupFilter, categoryFilter]);

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your clothing and shoes inventory</p>
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
          <Button variant="outline" onClick={() => toast.success("Exporting inventory...")}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryNew;
