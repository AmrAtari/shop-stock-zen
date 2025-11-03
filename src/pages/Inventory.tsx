import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Package, AlertTriangle, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InventoryItem {
  item_name: string;
  sku: string;
  quantity: number;
  min_stock: number;
  store_name: string;
  selling_price: number;
  cost: number;
}

interface StoreMetrics {
  storeName: string;
  totalItems: number;
  inventoryValue: number;
  lowStockCount: number;
}

const InventoryPage = () => {
  const [inventoryMetrics, setInventoryMetrics] = useState<StoreMetrics[]>([]);
  const [unassignedItemsData, setUnassignedItemsData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch inventory
  const fetchInventoryData = async () => {
    try {
      setLoading(true);

      const { data: inventoryData, error } = await supabase
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
            products(name)
          )
        `,
        )
        .limit(5000);

      if (error) {
        console.error("Error fetching inventory:", error);
        toast.error("Failed to load inventory data");
        return;
      }

      const storeMap = new Map<string, StoreMetrics>();
      const unassignedItems: InventoryItem[] = [];

      inventoryData.forEach((item: any) => {
        const storeId = item.store_id || "unspecified";
        const storeName = item.stores?.name || "(Non-Specified Store)";

        const variant = item.variants;

        const mappedItem: InventoryItem = {
          item_name: variant?.products?.name || "N/A",
          sku: variant?.sku || "N/A",
          quantity: item.quantity,
          min_stock: item.min_stock,
          store_name: storeName,
          selling_price: variant?.selling_price,
          cost: variant?.cost,
        };

        if (storeId === "unspecified") unassignedItems.push(mappedItem);

        if (!storeMap.has(storeId)) {
          storeMap.set(storeId, { totalItems: 0, inventoryValue: 0, lowStockCount: 0, storeName });
        }

        const metrics = storeMap.get(storeId)!;
        const quantity = Number(item.quantity) || 0;
        const minStock = Number(item.min_stock) || 0;
        const price = Number(variant?.selling_price) || Number(variant?.cost) || 50;

        metrics.totalItems += quantity;
        metrics.inventoryValue += quantity * price;
        if (quantity > 0 && quantity <= minStock) metrics.lowStockCount += 1;
      });

      const finalStoreMetrics = Array.from(storeMap.values());

      setInventoryMetrics(finalStoreMetrics);
      setUnassignedItemsData(unassignedItems);
    } catch (err) {
      console.error("Fetch inventory error:", err);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  // CSV Export
  const exportToCsv = (data: InventoryItem[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const cell = row[fieldName as keyof InventoryItem] ?? "";
            return `"${String(cell).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${data.length} items to ${filename}`);
  };

  useEffect(() => {
    fetchInventoryData();

    // Optional: Realtime updates
    const subscription = supabase
      .channel("inventory-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_on_hand" }, () => {
        fetchInventoryData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filtered data by search
  const filteredStores = inventoryMetrics.map((store) => ({
    ...store,
    items: unassignedItemsData
      .filter((item) => item.store_name === store.storeName)
      .filter(
        (item) =>
          item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  }));

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory</h1>
        {unassignedItemsData.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportToCsv(unassignedItemsData, "Unassigned_Inventory.csv")}
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            <Download className="w-4 h-4 mr-1" />
            Export Unassigned Items
          </Button>
        )}
      </div>

      <Input
        placeholder="Search by item name or SKU"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 max-w-md"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {inventoryMetrics.map((store, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle>
                  {store.storeName}
                  <Warehouse className="w-4 h-4 ml-2 inline-block" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{store.totalItems.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Value:</span>
                    <span>${store.inventoryValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Stock:</span>
                    <span className={store.lowStockCount > 0 ? "text-warning" : "text-success"}>
                      {store.lowStockCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
