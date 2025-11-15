import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAggregatedInventory } from "@/hooks/useStoreInventoryView";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Store, AlertTriangle, Package } from "lucide-react";
import { Item } from "@/types/database";

// Extend Item type with aggregated fields returned by useAggregatedInventory()
type AggregatedItem = Item & {
  stores: { store_id: string; store_name: string; quantity: number }[];
  total_quantity: number;
  on_order_quantity: number;
};

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: aggregatedInventory = [], isLoading } = useAggregatedInventory();

  // Convert to our extended type
  const inventory = aggregatedInventory as AggregatedItem[];

  const [storeMetrics, setStoreMetrics] = useState<any[]>([]);

  // Build store metrics correctly
  useEffect(() => {
    if (!inventory || inventory.length === 0) return;

    const map = new Map();

    inventory.forEach((item) => {
      item.stores.forEach((store) => {
        if (!map.has(store.store_id)) {
          map.set(store.store_id, {
            storeName: store.store_name || "Unspecified Store",
            totalItems: 0,
            inventoryValue: 0,
            lowStockCount: 0,
          });
        }

        const entry = map.get(store.store_id);

        entry.totalItems += store.quantity;

        const price = item.cost || item.price || 0;
        entry.inventoryValue += store.quantity * price;

        if (store.quantity <= item.min_stock) {
          entry.lowStockCount += 1;
        }
      });
    });

    setStoreMetrics([...map.values()]);
  }, [inventory]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        queryClient.invalidateQueries({ queryKey: ["aggregated-inventory"] });
      },
      2 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  // Refresh when user returns to tab
  useEffect(() => {
    const onFocus = () => {
      queryClient.invalidateQueries({ queryKey: ["aggregated-inventory"] });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Supabase realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("inventory-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "v_store_stock_levels" }, () => {
        queryClient.invalidateQueries({ queryKey: ["aggregated-inventory"] });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (isLoading) return <div className="p-6 text-lg font-semibold">Loading dashboard...</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard Overview</h1>

      {/* Store Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeMetrics.map((store, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                {store.storeName}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-semibold">{store.totalItems}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Inventory Value</span>
                <span className="font-semibold">{store.inventoryValue.toLocaleString()} AED</span>
              </div>

              <div className="flex justify-between text-red-600">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Low Stock
                </span>
                <span className="font-semibold">{store.lowStockCount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Items in System</span>
            <span className="font-semibold">{inventory.reduce((sum, i) => sum + i.total_quantity, 0)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Inventory Value</span>
            <span className="font-semibold">
              {inventory.reduce((sum, i) => sum + i.total_quantity * (i.cost || i.price || 0), 0).toLocaleString()} AED
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
