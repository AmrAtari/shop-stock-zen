// src/pages/Inventory.tsx
import { useState, useEffect } from "react";
import { Package, DollarSign, AlertTriangle, Plus, Download, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Item {
  variant_id: number;
  sku: string;
  product_name: string;
  store_id: string;
  store_name: string;
  quantity: number;
  min_stock: number;
  cost: number;
  selling_price: number;
  color?: string;
  size?: string;
  season?: string;
}

const Inventory = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<Item | null>(null);

  // Fetch all stores
  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("id, name");
    if (error) {
      console.error(error);
      return;
    }
    setStores(data || []);
  };

  // Fetch inventory items
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_on_hand")
      .select(
        `
        quantity,
        min_stock,
        store_id,
        stores(name),
        variants(
          variant_id,
          sku,
          selling_price,
          cost,
          color,
          size,
          season,
          products(name)
        )
      `,
      )
      .limit(5000);

    if (error) {
      console.error(error);
      toast.error("Failed to fetch items");
      setLoading(false);
      return;
    }

    const mappedItems: Item[] = (data || []).map((item: any) => ({
      variant_id: item.variants.variant_id,
      sku: item.variants.sku,
      product_name: item.variants.products.name,
      store_id: item.store_id,
      store_name: item.stores?.name || "(Non-Specified Store)",
      quantity: item.quantity,
      min_stock: item.min_stock,
      cost: item.variants.cost || 0,
      selling_price: item.variants.selling_price || 0,
      color: item.variants.color,
      size: item.variants.size,
      season: item.variants.season,
    }));

    setItems(mappedItems);
    setFilteredItems(mappedItems);
    setLoading(false);
  };

  // Search & filter
  useEffect(() => {
    let temp = [...items];
    if (selectedStore) temp = temp.filter((i) => i.store_id === selectedStore);
    if (searchTerm)
      temp = temp.filter(
        (i) =>
          i.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.sku.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    setFilteredItems(temp);
  }, [items, selectedStore, searchTerm]);

  // Export to CSV
  const exportCSV = (data: Item[]) => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Product Name",
      "SKU",
      "Store Name",
      "Quantity",
      "Min Stock",
      "Cost",
      "Selling Price",
      "Color",
      "Size",
      "Season",
    ];

    const csvContent = [
      headers.join(","),
      ...data.map((item) =>
        [
          item.product_name,
          item.sku,
          item.store_name,
          item.quantity,
          item.min_stock,
          item.cost,
          item.selling_price,
          item.color || "",
          item.size || "",
          item.season || "",
        ]
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Inventory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  // Add/Edit handlers (simplified)
  const handleEditItem = (item: Item) => {
    setCurrentEditItem(item);
    setIsEditOpen(true);
  };

  const handleAddItem = () => {
    setCurrentEditItem(null);
    setIsAddOpen(true);
  };

  const handleDeleteItem = async (variant_id: number) => {
    const confirm = window.confirm("Are you sure you want to delete this item?");
    if (!confirm) return;
    const { error } = await supabase.from("stock_on_hand").delete().eq("variant_id", variant_id);
    if (error) {
      toast.error("Failed to delete item");
      return;
    }
    toast.success("Item deleted successfully");
    fetchItems();
  };

  useEffect(() => {
    fetchStores();
    fetchItems();

    const subscription = supabase
      .channel("inventory-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_on_hand" }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Summary metrics
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * (i.selling_price || i.cost || 50), 0);
  const lowStockCount = items.filter((i) => i.quantity <= i.min_stock && i.quantity > 0).length;

  return (
    <div className="p-8 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>{totalItems.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>${totalValue.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>{lowStockCount}</CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by SKU or Product Name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Stores</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => exportCSV(filteredItems)}>
          <Download className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
        <Button onClick={handleAddItem}>
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-200 mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Product Name</th>
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">Store</th>
              <th className="p-2 border">Quantity</th>
              <th className="p-2 border">Min Stock</th>
              <th className="p-2 border">Cost</th>
              <th className="p-2 border">Selling Price</th>
              <th className="p-2 border">Color</th>
              <th className="p-2 border">Size</th>
              <th className="p-2 border">Season</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center p-4">
                  No items found
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.variant_id}>
                  <td className="p-2 border">{item.product_name}</td>
                  <td className="p-2 border">{item.sku}</td>
                  <td className="p-2 border">{item.store_name}</td>
                  <td className="p-2 border">{item.quantity}</td>
                  <td className="p-2 border">{item.min_stock}</td>
                  <td className="p-2 border">${item.cost}</td>
                  <td className="p-2 border">${item.selling_price}</td>
                  <td className="p-2 border">{item.color || "-"}</td>
                  <td className="p-2 border">{item.size || "-"}</td>
                  <td className="p-2 border">{item.season || "-"}</td>
                  <td className="p-2 border flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditItem(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteItem(item.variant_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddOpen || isEditOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          setIsEditOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentEditItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          {/* Form content goes here */}
          {/* You can add inputs for product, SKU, store, quantity, prices, etc. */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
