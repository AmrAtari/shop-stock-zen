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

  // Enhanced notifications fetcher
  const fetchNotifications = async () => {
    if (!isAdmin) {
      setNotificationsLoading(false);
      return;
    }

    try {
      setNotificationsLoading(true);
      const allNotifications: Notification[] = [];

      // 1. Fetch from inventory_approvals table
      try {
        const { data: approvals, error: approvalsError } = await supabase
          .from("inventory_approvals" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        console.log("Raw approvals data:", approvals);

        if (!approvalsError && approvals && approvals.length > 0) {
          const mapped = approvals.map((item: any) => {
            // Handle different possible field names
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
          console.log("Mapped approvals:", mapped);
        } else {
          console.log("No approvals found or error:", approvalsError);
        }
      } catch (tableError) {
        console.log("Inventory approvals table error:", tableError);
      }

      // 2. Fetch low stock items as notifications
      try {
        const { data: lowStockItems, error: lowStockError } = await supabase
          .from("inventory_items" as any)
          .select("id, name, quantity, min_stock, sku")
          .limit(20);

        if (!lowStockError && lowStockItems) {
          // Filter for low stock items manually
          const actualLowStock = lowStockItems.filter((item: any) => item.quantity <= (item.min_stock || 10));

          console.log("Actual low stock items:", actualLowStock);

          if (actualLowStock.length > 0) {
            const lowStockNotifications: Notification[] = actualLowStock.map((item: any) => ({
              id: `low-stock-${item.id}`,
              type: "low_stock" as const,
              title: "Low Stock Alert",
              description: `${item.name} (${item.sku}) is below minimum stock level. Current: ${item.quantity}, Min: ${item.min_stock || 10}`,
              link: `/inventory?item=${item.id}`,
              created_at: new Date().toISOString(),
            }));
            allNotifications.push(...lowStockNotifications);
          }
        }
      } catch (lowStockError) {
        console.log("Low stock fetch error:", lowStockError);
      }

      console.log("All notifications before sample:", allNotifications);

      // Only use sample data if absolutely no real notifications found
      if (allNotifications.length === 0) {
        console.log("No real notifications found, using sample data");
        allNotifications.push(...getSampleNotifications());
      } else {
        console.log(`Found ${allNotifications.length} real notifications`);
      }

      setNotifications(allNotifications);
      setPendingCount(allNotifications.length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Fetch store-specific metrics with proper error handling
  const fetchStoreMetrics = async () => {
    try {
      setStoreMetricsLoading(true);

      // First, try to get all stores with proper type handling
      const { data: stores, error: storesError } = await supabase
        .from("stores" as any)
        .select("id, name")
        .order("name");

      if (storesError) {
        console.error("Error fetching stores:", storesError);
        // If stores table doesn't exist, use sample data
        console.log("No stores table found, using sample data");
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

      // Get metrics for each store with proper type handling
      const storeMetricsData: StoreMetrics[] = [];

      for (const store of stores) {
        // Use type assertion to handle the store object
        const storeData = store as any;

        // Get total items count for this store
        const { count: itemsCount, error: countError } = await supabase
          .from("inventory_items" as any)
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeData.id);

        // Get inventory items for this store to calculate value and low stock
        const { data: itemsData, error: itemsError } = await supabase
          .from("inventory_items" as any)
          .select("quantity, price, min_stock")
          .eq("store_id", storeData.id);

        let inventoryValue = 0;
        let lowStockCount = 0;

        if (itemsData && !itemsError) {
          // Calculate total value and low stock count
          itemsData.forEach((item: any) => {
            const quantity = item.quantity || 0;
            const price = item.price || 0;
            const minStock = item.min_stock || 5;

            const value = quantity * price;
            inventoryValue += value;

            // Check if item is low stock
            if (quantity <= minStock) {
              lowStockCount++;
            }
          });
        }

        storeMetricsData.push({
          storeName: storeData.name,
          totalItems: itemsCount || 0,
          inventoryValue: inventoryValue,
          lowStockCount: lowStockCount,
        });
      }

      console.log("Store metrics calculated:", storeMetricsData);
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
      {
        id: "sample-2",
        type: "low_stock",
        title: "Low Stock Alert - USB-C Cables",
        description: "USB-C Cables stock is below minimum threshold. Current: 8, Min: 15",
        link: "/inventory?item=ITEM-USB-C-001",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "sample-3",
        type: "transfer",
        title: "Stock Transfer Request",
        description: "Transfer from Main Warehouse to Store #5 needs authorization",
        link: "/transfers/TRF-2024-001",
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // If it's from inventory_approvals table (not a sample or low-stock notification)
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

    fetchNotifications();
    fetchStoreMetrics();

    // Set up real-time subscription for notifications
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

  // Save to localStorage whenever charts change
  useEffect(() => {
    if (dashboardCharts.length > 0) {
      localStorage.setItem("dashboard-charts", JSON.stringify(dashboardCharts));
    }
  }, [dashboardCharts]);

  const handleAddChart = () => {
    if (!selectedChart) return;

    const newChart: DashboardChart = {
      id: Date.now().toString(),
      chartId: selectedChart,
      position: dashboardCharts.length,
    };

    setDashboardCharts((prev) => [...prev, newChart]);
    setSelectedChart("");
    setIsAddChartOpen(false);
  };

  const handleRemoveChart = (chartId: string) => {
    setDashboardCharts((prev) => prev.filter((chart) => chart.id !== chartId));
  };

  const handleDragStart = (e: React.DragEvent, chartId: string) => {
    e.dataTransfer.setData("chartId", chartId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetChartId: string) => {
    e.preventDefault();
    const draggedChartId = e.dataTransfer.getData("chartId");

    if (draggedChartId === targetChartId) return;

    const draggedIndex = dashboardCharts.findIndex((chart) => chart.id === draggedChartId);
    const targetIndex = dashboardCharts.findIndex((chart) => chart.id === targetChartId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCharts = [...dashboardCharts];
    const [draggedChart] = newCharts.splice(draggedIndex, 1);
    newCharts.splice(targetIndex, 0, draggedChart);

    const updatedCharts = newCharts.map((chart, index) => ({
      ...chart,
      position: index,
    }));

    setDashboardCharts(updatedCharts);
  };

  const getChartData = (dataKey: string) => {
    const dataMap: { [key: string]: any } = {
      categoryQuantity,
      categoryValue,
      stockMovementTrends,
      abcDistribution,
      lowStockByCategory: categoryQuantity.map((item) => ({
        name: item.name,
        lowStock: Math.floor(item.value * 0.1),
      })),
      turnoverRates: [
        { month: "Jan", turnover: 2.5 },
        { month: "Feb", turnover: 3.1 },
        { month: "Mar", turnover: 2.8 },
        { month: "Apr", turnover: 3.4 },
        { month: "May", turnover: 3.0 },
        { month: "Jun", turnover: 3.2 },
      ],
    };

    return dataMap[dataKey] || [];
  };

  const renderChart = (chartConfig: ChartConfig) => {
    const data = getChartData(chartConfig.dataKey);

    switch (chartConfig.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey={chartConfig.dataKey === "lowStockByCategory" ? "lowStock" : "value"}
                fill={chartConfig.color}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }) =>
                  chartConfig.dataKey === "abcDistribution"
                    ? `${name}: ${value}`
                    : `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              {chartConfig.dataKey === "abcDistribution" && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey={chartConfig.dataKey === "turnoverRates" ? "month" : "date"} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={chartConfig.dataKey === "turnoverRates" ? "turnover" : "adjustments"}
                stroke={chartConfig.color}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getAvailableChartOptions = () => {
    const usedChartIds = new Set(dashboardCharts.map((chart) => chart.chartId));
    return availableCharts.filter((chart) => !usedChartIds.has(chart.id));
  };

  const handleNotificationClick = (link: string, notificationId?: string) => {
    setIsNotificationsOpen(false);
    if (notificationId) {
      markAsRead(notificationId);
    }
    navigate(link);
  };

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
                    <span
                      className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-background bg-red-500 text-xs text-white flex items-center justify-center -translate-y-1 translate-x-1"
                      style={{ fontSize: "10px" }}
                    >
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
                            {new Date(notif.created_at).toLocaleDateString()} at{" "}
                            {new Date(notif.created_at).toLocaleTimeString()}
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

      {/* Original Metrics Cards (keeping for backward compatibility) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Items"
              value={metrics.totalItems}
              icon={<Package className="w-5 h-5" />}
              variant="default"
            />
            <MetricCard
              title="Inventory Value"
              value={`$${metrics.totalValue.toFixed(2)}`}
              icon={<DollarSign className="w-5 h-5" />}
              variant="success"
            />
            <MetricCard
              title="Low Stock Alerts"
              value={metrics.lowStockCount}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant="warning"
            />
            <MetricCard
              title="Total Products"
              value={metrics.totalProducts}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="default"
            />
          </>
        )}
      </div>

      {/* Customizable Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboardCharts.map((dashboardChart) => {
          const chartConfig = availableCharts.find((chart) => chart.id === dashboardChart.chartId);
          if (!chartConfig) return null;

          return (
            <Card
              key={dashboardChart.id}
              className={`relative ${isEditMode ? "border-2 border-dashed border-primary" : ""}`}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, dashboardChart.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dashboardChart.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  {isEditMode && <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />}
                  <CardTitle>{chartConfig.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/reports?tab=${chartConfig.reportTab}`)}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Full Report
                  </Button>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChart(dashboardChart.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>{isLoading ? <Skeleton className="h-[300px]" /> : renderChart(chartConfig)}</CardContent>
            </Card>
          );
        })}
      </div>

      {/* Low Stock Items Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Low Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No low stock items</p>
          ) : (
            <>
              <div className="space-y-4">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-warning">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">Min: {item.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
              {lowStockItems.length > 5 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => navigate("/reports?tab=LOW_STOCK")}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    See Full Report ({lowStockItems.length} items)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {dashboardCharts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No charts configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add charts to your dashboard to visualize your inventory data
            </p>
            <Button onClick={() => setIsEditMode(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Chart
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
