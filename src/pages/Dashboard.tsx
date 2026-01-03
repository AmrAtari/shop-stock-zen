// src/pages/Dashboard.tsx
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
  Store,
  Warehouse,
  ShoppingCart,
  Users,
  Bell,
  Download,
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
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { useAggregatedInventory } from "@/hooks/useStoreInventoryView";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import QuickActions from "@/components/dashboard/QuickActions";
import StoreOverviewCard from "@/components/dashboard/StoreOverviewCard";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";

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
  storeId?: string;
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
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // New: use aggregated inventory (the same hook InventoryPage uses)
  const { data: aggregatedInventory = [], isLoading: aggregatedLoading } = useAggregatedInventory();

  // Store metrics derived from aggregatedInventory
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  const [storeMetricsLoading, setStoreMetricsLoading] = useState(true);

  // Unassigned items (no stores entry) for export
  const [unassignedItemsData, setUnassignedItemsData] = useState<any[]>([]);

  /**
   * Utility function to export JSON data to CSV.
   * @param data Array of objects to export.
   * @param filename Desired filename for the download.
   */
  const exportToCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export.");
      return;
    }

    // Get all unique headers from all objects
    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)));
    const headers = Array.from(allKeys);

    // Create CSV rows
    const csv = [
      headers.join(","), // Header row
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const cell = row[fieldName] === null || row[fieldName] === undefined ? "" : String(row[fieldName]);
            // Escape commas and double quotes
            return `"${cell.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${data.length} items to ${filename}`);
  };

  const handleExportUnspecified = () => {
    exportToCsv(unassignedItemsData, "Unspecified_Inventory_Report.csv");
  };

  // Debug function - will log a few main tables
  const debugAllTables = async () => {
    console.log("=== COMPLETE DATABASE DEBUG ===");

    try {
      const tables = ["v_store_stock_levels", "items", "stock_on_hand", "purchase_order_items", "stores"];

      for (const tableName of tables) {
        try {
          const { data, error } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(5);
          console.log(`=== Table: ${tableName} ===`);
          console.log(`Data:`, data);
          console.log(`Error:`, error);
          if (data && data.length > 0) {
            console.log(`Columns:`, Object.keys(data[0]));
            console.log(`Sample row:`, data[0]);
          } else {
            console.log(`No data in table ${tableName}`);
          }
          console.log(`\n`);
        } catch (err) {
          console.log(`Table "${tableName}" doesn't exist or can't be accessed:`, err);
        }
      }
    } catch (error) {
      console.error("Complete debug failed:", error);
    }
  };

  // Recompute store metrics whenever aggregatedInventory changes
  useEffect(() => {
    const computeStoreMetrics = () => {
      setStoreMetricsLoading(true);

      try {
        const storeMap = new Map<string | "(NON)", StoreMetrics>();
        const unassignedRows: any[] = [];

        // Iterate every item in aggregatedInventory
        aggregatedInventory.forEach((item: any) => {
          const itemCost = Number(item.cost || item.price || 0);
          const minStock = Number(item.min_stock || 0);

          // If item has store breakdown
          if (Array.isArray(item.stores) && item.stores.length > 0) {
            item.stores.forEach((store: any) => {
              const storeId = store.store_id ?? "(NON)"; // fallback id for unspecified
              const storeName = store.store_name || "(Non-Specified Store)";
              const qty = Number(store.quantity || 0);

              if (!storeMap.has(storeId)) {
                storeMap.set(storeId, {
                  storeId: storeId === "(NON)" ? undefined : storeId,
                  storeName: storeName,
                  totalItems: 0,
                  inventoryValue: 0,
                  lowStockCount: 0,
                });
              }

              const entry = storeMap.get(storeId)!;
              entry.totalItems += qty;
              entry.inventoryValue += qty * itemCost;

              // low stock: if quantity > 0 and <= min_stock
              if (qty > 0 && qty <= minStock) {
                entry.lowStockCount += 1;
              }
            });
          } else {
            // No stores array or empty: treat as unassigned / unspecified
            unassignedRows.push({
              item_id: item.id,
              sku: item.sku,
              item_name: item.name || item.item_name || "",
              quantity: 0,
              min_stock: item.min_stock || 0,
              store_name: "(Non-Specified Store)",
              cost: item.cost || item.price || 0,
            });

            // also ensure unspecified group exists (show it with zero totals if not present)
            if (!storeMap.has("(NON)")) {
              storeMap.set("(NON)", {
                storeId: undefined,
                storeName: "(Non-Specified Store)",
                totalItems: 0,
                inventoryValue: 0,
                lowStockCount: 0,
              });
            }
          }
        });

        // Convert map to array and keep unspecified at end
        const metricsArray: StoreMetrics[] = Array.from(storeMap.values()).sort((a, b) => {
          if (a.storeName === "(Non-Specified Store)") return 1;
          if (b.storeName === "(Non-Specified Store)") return -1;
          return 0;
        });

        setStoreMetrics(metricsArray);
        setUnassignedItemsData(unassignedRows);
      } catch (err) {
        console.error("Error computing store metrics:", err);
        toast.error("Failed to compute store metrics");
        setStoreMetrics([]);
        setUnassignedItemsData([]);
      } finally {
        setStoreMetricsLoading(false);
      }
    };

    computeStoreMetrics();
  }, [aggregatedInventory]);

  // Fetch notifications (same logic as before)
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);

      try {
        await supabase.rpc("check_low_stock_notifications");
      } catch (error) {
        console.log("Could not check low stock notifications RPC:", error);
      }

      const { data: notificationData, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (notificationsError) {
        console.error("Error fetching notifications:", notificationsError);
        setNotifications([]);
        setPendingCount(0);
        return;
      }

      const mappedNotifications: Notification[] = (notificationData || []).map((item: any) => ({
        id: String(item.id),
        type: item.type as Notification["type"],
        title: item.title,
        description: item.message,
        link: item.link,
        created_at: item.created_at,
        is_read: item.is_read,
      }));

      setNotifications(mappedNotifications);
      setPendingCount(mappedNotifications.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setPendingCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = (link: string, notificationId?: string) => {
    setIsNotificationsOpen(false);
    if (notificationId) {
      markAsRead(notificationId);
    }
    navigate(link);
  };

  // Initialize dashboard & subscriptions
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

    // Subscribe to stock view changes and notifications for realtime refresh
    const subscription = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "v_store_stock_levels" }, () => {
        // trigger an invalidation by re-fetching aggregated inventory via the hook — the hook will refetch on change if using react-query invalidation elsewhere
        // but to be safe we can re-run compute by toggling a tiny state or rely on react-query refetch
        // react-query will automatically refetch stale queries on reconnect; still we can force refetch via RPC-less approach:
        // Using the client directly to trigger the query cache refresh is environment-specific; here we keep it simple:
        // If you want aggressive refetching, use queryClient.invalidateQueries(["aggregated-inventory"])
        console.log("v_store_stock_levels changed, refetch aggregated inventory");
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

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
              {chartConfig.dataKey === "abc-analysis" && <Legend />}
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

  // Calculate totals from derived storeMetrics
  const totalItemsAllStores = storeMetrics.reduce((sum, store) => sum + store.totalItems, 0);
  const totalValueAllStores = storeMetrics.reduce((sum, store) => sum + store.inventoryValue, 0);
  const totalLowStockAllStores = storeMetrics.reduce((sum, store) => sum + store.lowStockCount, 0);

  const hasUnspecifiedInventory = unassignedItemsData.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader
        pendingCount={pendingCount}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        isEditMode={isEditMode}
        onEditModeToggle={() => setIsEditMode(!isEditMode)}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={totalItemsAllStores.toLocaleString()}
          icon={<Package className="w-5 h-5" />}
          variant="default"
          subtitle="Across all stores"
          onClick={() => navigate("/inventory")}
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(totalValueAllStores, currency)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
          subtitle="Total stock value"
        />
        <MetricCard
          title="Low Stock Alerts"
          value={totalLowStockAllStores.toLocaleString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="warning"
          subtitle="Items needing reorder"
          onClick={() => navigate("/alerts")}
        />
        <MetricCard
          title="Active Stores"
          value={storeMetrics.filter((s) => s.storeName !== "(Non-Specified Store)").length}
          icon={<Warehouse className="w-5 h-5" />}
          variant="info"
          subtitle="Operational locations"
          onClick={() => navigate("/stores")}
        />
      </div>

      {/* Store Overview and Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StoreOverviewCard
          stores={storeMetrics}
          isLoading={storeMetricsLoading}
          formatCurrency={(val) => formatCurrency(val, currency)}
        />
        <RecentActivityCard />
      </div>

      {/* Notifications Dialog */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications ({pendingCount} Pending)
            </DialogTitle>
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
              <p className="text-center text-muted-foreground py-4">No new notifications</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                    notif.is_read ? "bg-muted/30 opacity-60" : ""
                  }`}
                  onClick={() => handleNotificationClick(notif.link, notif.id)}
                >
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{notif.description}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
          <Button variant="outline" className="w-full" onClick={() => handleNotificationClick("/notifications")}>
            View All Notifications
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add Chart Dialog */}
      {isEditMode && (
        <Dialog open={isAddChartOpen} onOpenChange={setIsAddChartOpen}>
          <DialogTrigger asChild>
            <Button className="fixed bottom-6 right-6 shadow-lg z-50" size="lg">
              <Plus className="w-5 h-5 mr-2" />
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

      {/* Charts Section */}
      {dashboardCharts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Analytics</h2>
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
                      <CardTitle className="text-base">{chartConfig.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/reports?tab=${chartConfig.reportTab}`)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveChart(dashboardChart.id)}
                          className="h-8 w-8 p-0 text-destructive"
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
        </div>
      )}

      {/* Low Stock Items Section */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Low Stock Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/reports?tab=LOW_STOCK")}>
                View All
                <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer"
                  onClick={() => navigate("/inventory")}
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-warning text-sm">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">Min: {item.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
