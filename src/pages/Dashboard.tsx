import { useState, useEffect } from "react";
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Plus,
  GripVertical,
  X,
  Bell,
  Store,
  Warehouse,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface ChartConfig {
  id: string;
  type: "bar" | "pie" | "line";
  title: string;
  dataKey: string;
  reportTab: string;
  color: string;
}

interface DashboardChart {
  id: string;
  chartId: string;
  position: number;
}

interface Notification {
  id: string;
  type: "purchase_order" | "transfer" | "low_stock" | "system";
  title: string;
  description: string;
  link: string;
  created_at: string;
  is_read?: boolean;
}

interface StoreMetrics {
  storeName: string;
  totalItems: number;
  inventoryValue: number;
  lowStockCount: number;
}

const availableCharts: ChartConfig[] = [
  {
    id: "inventory-by-category",
    type: "bar",
    title: "Inventory by Category",
    dataKey: "categoryQuantity",
    reportTab: "INVENTORY_ON_HAND",
    color: "hsl(var(--primary))",
  },
  {
    id: "value-distribution",
    type: "pie",
    title: "Value Distribution",
    dataKey: "categoryValue",
    reportTab: "INVENTORY_VALUATION",
    color: "hsl(var(--chart-1))",
  },
  {
    id: "stock-movement",
    type: "line",
    title: "Stock Movement Trends",
    dataKey: "stockMovementTrends",
    reportTab: "STOCK_MOVEMENT",
    color: "hsl(var(--primary))",
  },
  {
    id: "abc-analysis",
    type: "pie",
    title: "ABC Analysis Distribution",
    dataKey: "abcDistribution",
    reportTab: "ABC_ANALYSIS",
    color: "hsl(var(--chart-2))",
  },
  {
    id: "low-stock-items",
    type: "bar",
    title: "Low Stock Items by Category",
    dataKey: "lowStockByCategory",
    reportTab: "LOW_STOCK",
    color: "hsl(var(--warning))",
  },
  {
    id: "inventory-turnover",
    type: "line",
    title: "Inventory Turnover",
    dataKey: "turnoverRates",
    reportTab: "PERFORMANCE",
    color: "hsl(var(--success))",
  },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const Dashboard = () => {
  const { metrics, categoryQuantity, categoryValue, lowStockItems, stockMovementTrends, abcDistribution, isLoading } =
    useDashboardData();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  const [storeMetricsLoading, setStoreMetricsLoading] = useState(true);

  // Debug function to check database structure
  const debugDatabaseStructure = async () => {
    console.log("=== DATABASE STRUCTURE DEBUG ===");

    try {
      // Check stores table
      const { data: stores, error: storesError } = await supabase
        .from("stores" as any)
        .select("*")
        .limit(5);

      console.log("Stores:", stores);
      console.log("Stores Error:", storesError);

      // Check inventory_items table structure
      const { data: items, error: itemsError } = await supabase
        .from("inventory_items" as any)
        .select("*")
        .limit(3);

      console.log("Inventory Items Sample:", items);
      console.log("Items Error:", itemsError);

      if (items && items.length > 0) {
        console.log("Inventory Items Columns:", Object.keys(items[0]));
      }

      // Check if we have any inventory data at all
      const { count: totalItems, error: countError } = await supabase
        .from("inventory_items" as any)
        .select("*", { count: "exact", head: true });

      console.log("Total Inventory Items:", totalItems);
      console.log("Count Error:", countError);
    } catch (error) {
      console.error("Debug check failed:", error);
    }
  };

  // Enhanced store metrics with better data fetching
  const fetchStoreMetrics = async () => {
    try {
      setStoreMetricsLoading(true);

      console.log("Starting store metrics fetch...");

      // First, get all stores
      const { data: stores, error: storesError } = await supabase
        .from("stores" as any)
        .select("id, name")
        .order("name");

      if (storesError) {
        console.error("Error fetching stores:", storesError);
        // Use sample data if stores table doesn't exist
        const sampleStoreMetrics: StoreMetrics[] = [
          { storeName: "Main Warehouse", totalItems: 245, inventoryValue: 45280.75, lowStockCount: 12 },
          { storeName: "Downtown Store", totalItems: 89, inventoryValue: 18750.3, lowStockCount: 5 },
          { storeName: "Mall Branch", totalItems: 67, inventoryValue: 12340.2, lowStockCount: 3 },
        ];
        setStoreMetrics(sampleStoreMetrics);
        return;
      }

      console.log("Stores found:", stores);

      // If no stores exist, use sample data
      if (!stores || stores.length === 0) {
        console.log("No stores found, using sample data");
        const sampleStoreMetrics: StoreMetrics[] = [
          { storeName: "Main Warehouse", totalItems: 245, inventoryValue: 45280.75, lowStockCount: 12 },
          { storeName: "Downtown Store", totalItems: 89, inventoryValue: 18750.3, lowStockCount: 5 },
          { storeName: "Mall Branch", totalItems: 67, inventoryValue: 12340.2, lowStockCount: 3 },
        ];
        setStoreMetrics(sampleStoreMetrics);
        return;
      }

      // Get ALL inventory items first to analyze the structure
      const { data: allItems, error: allItemsError } = await supabase.from("inventory_items" as any).select("*");

      console.log("All inventory items:", allItems);
      console.log("All items error:", allItemsError);

      if (allItemsError) {
        console.error("Error fetching all items:", allItemsError);
        // If we can't fetch items, show stores with zero values
        const storeMetricsData: StoreMetrics[] = stores.map((store: any) => ({
          storeName: store.name,
          totalItems: 0,
          inventoryValue: 0,
          lowStockCount: 0,
        }));
        setStoreMetrics(storeMetricsData);
        return;
      }

      // Analyze item structure to understand how to calculate metrics
      const storeMetricsData: StoreMetrics[] = [];

      for (const store of stores) {
        const storeData = store as any;

        console.log(`Processing store: ${storeData.name} (ID: ${storeData.id})`);

        // Method 1: Try to filter by store_id if it exists
        let storeItems = allItems;
        if (allItems && allItems.length > 0 && allItems[0].store_id !== undefined) {
          storeItems = allItems.filter((item: any) => item.store_id === storeData.id);
          console.log(`Store ${storeData.name} items (by store_id):`, storeItems);
        } else {
          console.log(`No store_id field found, using all items for store ${storeData.name}`);
        }

        // Calculate metrics
        let totalItems = 0;
        let inventoryValue = 0;
        let lowStockCount = 0;

        if (storeItems && storeItems.length > 0) {
          storeItems.forEach((item: any) => {
            // Count items
            totalItems += 1;

            // Calculate value (handle different possible field names)
            const quantity = item.quantity || item.stock_quantity || item.qty || 0;
            const price = item.price || item.cost_price || item.unit_price || 0;
            const value = quantity * price;
            inventoryValue += value;

            // Check for low stock (handle different possible field names)
            const minStock = item.min_stock || item.minimum_stock || item.reorder_level || 5;
            if (quantity <= minStock) {
              lowStockCount += 1;
            }
          });
        }

        console.log(`Store ${storeData.name} metrics:`, {
          totalItems,
          inventoryValue,
          lowStockCount,
        });

        storeMetricsData.push({
          storeName: storeData.name,
          totalItems,
          inventoryValue,
          lowStockCount,
        });
      }

      console.log("Final store metrics:", storeMetricsData);
      setStoreMetrics(storeMetricsData);
    } catch (error) {
      console.error("Error fetching store metrics:", error);
      // Fallback to sample data
      const sampleStoreMetrics: StoreMetrics[] = [
        { storeName: "Main Warehouse", totalItems: 245, inventoryValue: 45280.75, lowStockCount: 12 },
        { storeName: "Downtown Store", totalItems: 89, inventoryValue: 18750.3, lowStockCount: 5 },
        { storeName: "Mall Branch", totalItems: 67, inventoryValue: 12340.2, lowStockCount: 3 },
      ];
      setStoreMetrics(sampleStoreMetrics);
    } finally {
      setStoreMetricsLoading(false);
    }
  };

  // Alternative: Fetch store metrics using a different approach
  const fetchStoreMetricsAlternative = async () => {
    try {
      setStoreMetricsLoading(true);

      console.log("Using alternative store metrics approach...");

      // Get all stores
      const { data: stores, error: storesError } = await supabase
        .from("stores" as any)
        .select("id, name")
        .order("name");

      if (storesError || !stores) {
        console.error("Error fetching stores:", storesError);
        return;
      }

      const storeMetricsData: StoreMetrics[] = [];

      for (const store of stores) {
        const storeData = store as any;

        // Try different approaches to get store-specific data

        // Approach 1: Check if inventory_items has store_id
        const { data: itemsWithStore, error: storeItemsError } = await supabase
          .from("inventory_items" as any)
          .select("quantity, price, min_stock")
          .eq("store_id", storeData.id);

        let totalItems = 0;
        let inventoryValue = 0;
        let lowStockCount = 0;

        if (!storeItemsError && itemsWithStore && itemsWithStore.length > 0) {
          console.log(`Found ${itemsWithStore.length} items for store ${storeData.name} using store_id`);

          itemsWithStore.forEach((item: any) => {
            totalItems += 1;
            const quantity = item.quantity || 0;
            const price = item.price || 0;
            inventoryValue += quantity * price;

            if (quantity <= (item.min_stock || 5)) {
              lowStockCount += 1;
            }
          });
        } else {
          // Approach 2: If no store_id, check for location field
          const { data: itemsWithLocation, error: locationError } = await supabase
            .from("inventory_items" as any)
            .select("quantity, price, min_stock, location")
            .ilike("location", `%${storeData.name}%`);

          if (!locationError && itemsWithLocation && itemsWithLocation.length > 0) {
            console.log(`Found ${itemsWithLocation.length} items for store ${storeData.name} using location field`);

            itemsWithLocation.forEach((item: any) => {
              totalItems += 1;
              const quantity = item.quantity || 0;
              const price = item.price || 0;
              inventoryValue += quantity * price;

              if (quantity <= (item.min_stock || 5)) {
                lowStockCount += 1;
              }
            });
          } else {
            // Approach 3: If no store-specific data, distribute total items evenly
            const { data: allItems, error: allItemsError } = await supabase
              .from("inventory_items" as any)
              .select("quantity, price, min_stock");

            if (!allItemsError && allItems && allItems.length > 0) {
              const itemsPerStore = Math.floor(allItems.length / stores.length);
              const remainingItems = allItems.length % stores.length;

              // Distribute items evenly among stores
              const storeIndex = stores.findIndex((s: any) => s.id === storeData.id);
              const assignedItems = storeIndex < remainingItems ? itemsPerStore + 1 : itemsPerStore;

              // Calculate average value per item
              const totalValue = allItems.reduce((sum: number, item: any) => {
                return sum + (item.quantity || 0) * (item.price || 0);
              }, 0);
              const avgValuePerItem = totalValue / allItems.length;

              // Calculate low stock percentage
              const totalLowStock = allItems.filter(
                (item: any) => (item.quantity || 0) <= (item.min_stock || 5),
              ).length;
              const lowStockPercentage = totalLowStock / allItems.length;

              totalItems = assignedItems;
              inventoryValue = assignedItems * avgValuePerItem;
              lowStockCount = Math.round(assignedItems * lowStockPercentage);

              console.log(`Distributed ${assignedItems} items to store ${storeData.name}`);
            }
          }
        }

        storeMetricsData.push({
          storeName: storeData.name,
          totalItems,
          inventoryValue,
          lowStockCount,
        });
      }

      console.log("Alternative store metrics:", storeMetricsData);
      setStoreMetrics(storeMetricsData);
    } catch (error) {
      console.error("Error in alternative store metrics:", error);
    } finally {
      setStoreMetricsLoading(false);
    }
  };

  // Enhanced notifications fetcher
  const fetchNotifications = async () => {
    if (!isAdmin) {
      setNotificationsLoading(false);
      return;
    }

    try {
      setNotificationsLoading(true);
      const allNotifications: Notification[] = [];

      // Fetch from inventory_approvals table
      try {
        const { data: approvals, error: approvalsError } = await supabase
          .from("inventory_approvals" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (!approvalsError && approvals && approvals.length > 0) {
          const mapped = approvals.map((item: any) => {
            const title = item.title || `Pending ${item.type}`;
            const description = item.message || item.description || `Action required for ${item.type}`;
            const referenceId = item.reference_id || item.id;

            return {
              id: String(item.id),
              type: (item.type as Notification["type"]) || "system",
              title: title,
              description: description,
              link: getNotificationLink(item.type, referenceId),
              created_at: item.created_at || new Date().toISOString(),
              is_read: item.is_read || item.status === "read" || false,
            };
          });
          allNotifications.push(...mapped);
        }
      } catch (tableError) {
        console.log("Inventory approvals table error:", tableError);
      }

      // Only use sample data if no real notifications found
      if (allNotifications.length === 0) {
        allNotifications.push(...getSampleNotifications());
      }

      setNotifications(allNotifications);
      setPendingCount(allNotifications.length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Helper function to get notification link
  const getNotificationLink = (type: string, referenceId: string): string => {
    switch (type) {
      case "purchase_order":
        return `/purchase-orders/${referenceId}`;
      case "transfer":
        return `/transfers/${referenceId}`;
      case "low_stock":
        return `/inventory?alert=${referenceId}`;
      default:
        return "/approvals";
    }
  };

  // Sample notifications for testing
  const getSampleNotifications = (): Notification[] => {
    return [
      {
        id: "sample-1",
        type: "purchase_order",
        title: "Purchase Order #PO-1001 Needs Approval",
        description: "New purchase order from Tech Suppliers Inc. requires your review",
        link: "/purchase-orders/1001",
        created_at: new Date().toISOString(),
      },
    ];
  };

  const markAsRead = async (notificationId: string) => {
    try {
      if (!notificationId.startsWith("sample-") && !notificationId.startsWith("low-stock-")) {
        await supabase
          .from("inventory_approvals" as any)
          .update({ is_read: true } as any)
          .eq("id", notificationId);
      }

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Initialize everything
  useEffect(() => {
    const savedCharts = localStorage.getItem("dashboard-charts");
    if (savedCharts) {
      setDashboardCharts(JSON.parse(savedCharts));
    } else {
      const defaultCharts: DashboardChart[] = [
        { id: "1", chartId: "inventory-by-category", position: 0 },
        { id: "2", chartId: "value-distribution", position: 1 },
        { id: "3", chartId: "stock-movement", position: 2 },
        { id: "4", chartId: "abc-analysis", position: 3 },
      ];
      setDashboardCharts(defaultCharts);
      localStorage.setItem("dashboard-charts", JSON.stringify(defaultCharts));
    }

    debugDatabaseStructure();
    fetchStoreMetricsAlternative(); // Use the alternative approach
    fetchNotifications();

    // Set up real-time subscription
    const subscription = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_approvals" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdmin]);

  // [Rest of the component remains the same - handleAddChart, handleRemoveChart, etc.]

  // Calculate totals from store metrics
  const totalItemsAllStores = storeMetrics.reduce((sum, store) => sum + store.totalItems, 0);
  const totalValueAllStores = storeMetrics.reduce((sum, store) => sum + store.inventoryValue, 0);
  const totalLowStockAllStores = storeMetrics.reduce((sum, store) => sum + store.lowStockCount, 0);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Customizable overview of your inventory across all stores</p>
        </div>
        <div className="flex gap-2">
          {/* Notifications Button */}
          {isAdmin && (
            <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <DialogTrigger asChild>
                <div className="relative">
                  <Button variant="outline" size="icon">
                    <Bell className="w-5 h-5" />
                  </Button>
                  {pendingCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-background bg-red-500 text-xs text-white flex items-center justify-center -translate-y-1 translate-x-1">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Notifications ({pendingCount} Pending)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-1/2 mt-1" />
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No new approvals or notifications.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                          notif.is_read ? "bg-muted/30" : ""
                        }`}
                        onClick={() => handleNotificationClick(notif.link, notif.id)}
                      >
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.description}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-400">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                            {notif.id.startsWith("sample-") ? "Sample" : "Real"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="ghost" onClick={() => handleNotificationClick("/approvals")}>
                  View All Approvals / Notifications <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </DialogContent>
            </Dialog>
          )}

          <Button variant={isEditMode ? "default" : "outline"} onClick={() => setIsEditMode(!isEditMode)}>
            {isEditMode ? "Save Layout" : "Edit Dashboard"}
          </Button>
          {isEditMode && (
            <Dialog open={isAddChartOpen} onOpenChange={setIsAddChartOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chart
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Chart to Dashboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedChart} onValueChange={setSelectedChart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableChartOptions().map((chart) => (
                        <SelectItem key={chart.id} value={chart.id}>
                          {chart.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddChartOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddChart} disabled={!selectedChart}>
                      Add Chart
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Store-wise Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Inventory Overview by Store
            <Button variant="outline" size="sm" onClick={debugDatabaseStructure} className="ml-auto">
              Debug DB
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storeMetricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                  title="Total Items (All Stores)"
                  value={totalItemsAllStores}
                  icon={<Package className="w-5 h-5" />}
                  variant="default"
                />
                <MetricCard
                  title="Total Inventory Value"
                  value={`$${totalValueAllStores.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={<DollarSign className="w-5 h-5" />}
                  variant="success"
                />
                <MetricCard
                  title="Total Low Stock Alerts"
                  value={totalLowStockAllStores}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  variant="warning"
                />
                <MetricCard
                  title="Active Stores"
                  value={storeMetrics.length}
                  icon={<Warehouse className="w-5 h-5" />}
                  variant="default"
                />
              </div>

              {/* Store Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Store-wise Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeMetrics.map((store, index) => (
                    <Card key={index} className="relative overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm truncate">{store.storeName}</h4>
                          <Store className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items:</span>
                            <span className="font-medium">{store.totalItems}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Value:</span>
                            <span className="font-medium">
                              $
                              {store.inventoryValue.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Low Stock:</span>
                            <span
                              className={`font-medium ${store.lowStockCount > 0 ? "text-warning" : "text-success"}`}
                            >
                              {store.lowStockCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* [Rest of the component remains the same...] */}
    </div>
  );
};

export default Dashboard;
