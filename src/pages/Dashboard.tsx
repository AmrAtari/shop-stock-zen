import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAggregatedInventory } from "@/hooks/useStoreInventoryView";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Package, AlertTriangle, Store } from "lucide-react";

const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch the correct inventory using your validated source
  const { data: aggregatedInventory = [], isLoading } = useAggregatedInventory();

  const [storeMetrics, setStoreMetrics] = useState([]);

  // Build store-level metrics automatically from aggregated inventory
  useEffect(() => {
    if (!aggregatedInventory || aggregatedInventory.length === 0) return;

    const map = new Map();

    aggregatedInventory.forEach((item) => {
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
  }, [aggregatedInventory]);

  // 🔥 Automatic background refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        queryClient.invalidateQueries(["aggregated-inventory"]);
      },
      2 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  // 🔥 Auto-refresh when tab becomes active (professional ERP behavior)
  useEffect(() => {
    const onFocus = () => {
      queryClient.invalidateQueries(["aggregated-inventory"]);
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // 🔥 Supabase realtime updates for instant stock changes
  useEffect(() => {
    const channel = supabase
      .channel("inventory-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "v_store_stock_levels",
        },
        () => {
          queryClient.invalidateQueries(["aggregated-inventory"]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) return <div className="p-6 text-lg font-semibold">Loading dashboard...</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard Overview</h1>

      {/* Stores overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {storeMetrics.map((store, index) => (
          <Card key={index} className="border shadow-sm">
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
                  <AlertTriangle className="w-4 h-4" />
                  Low Stock Items
                </span>
                <span className="font-semibold">{store.lowStockCount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global totals */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Items in System</span>
            <span className="font-semibold">{aggregatedInventory.reduce((sum, i) => sum + i.total_quantity, 0)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Inventory Value</span>
            <span className="font-semibold">
              {aggregatedInventory
                .reduce((sum, i) => sum + i.total_quantity * (i.cost || i.price || 0), 0)
                .toLocaleString()}{" "}
              AED
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
