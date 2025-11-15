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
  FileText,
  Download, // Added icon for export
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
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  const [storeMetricsLoading, setStoreMetricsLoading] = useState(true);
  // NEW STATE: To hold the actual item data for the unassigned report
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

  // Handler for the export button
  const handleExportUnspecified = () => {
    exportToCsv(unassignedItemsData, "Unspecified_Inventory_Report.csv");
  };

  // Debug function to check ALL tables in your database (RETAINED FOR DEBUGGING IF NEEDED)
  const debugAllTables = async () => {
    console.log("=== COMPLETE DATABASE DEBUG ===");

    try {
      // Check all possible table names
      const tables = [
        "stores",
        "variants",
        "products",
        "stock_on_hand", // Added correct table names
      ];

      for (const tableName of tables) {
        try {
          // Use type assertion to avoid TypeScript errors
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

  /**
   * FIX: Modified to fetch ALL store names FIRST and then merge inventory metrics.
   * This ensures that all stores, even those with zero stock, are included in the breakdown,
   * making the sum match the global 'Total Items' metric.
   * The .limit(5000) was removed from the inventory query to ensure data completeness.
   */
  const fetchRealStoreMetrics = async () => {
    try {
      setStoreMetricsLoading(true);
      console.log("🔍 Fetching REAL store metrics from database...");

      // 1. Fetch ALL active stores (ID and Name)
      const { data: allStores, error: storesError } = await supabase.from("stores").select("id, name");

      if (storesError) {
        console.error("❌ Error fetching stores:", storesError);
        toast.error("Failed to load store list");
        return;
      }

      // Define special store IDs
      const unspecifiedStoreId = "unspecified";
      const unspecifiedStoreName = "(Non-Specified Store)";

      // Initialize the map with ALL fetched stores (ensures stores with 0 stock are included)
      const newInventoryByStore = new Map<
        string,
        { storeName: string; totalItems: number; inventoryValue: number; lowStockCount: number }
      >();

      // Add all stores from the 'stores' table
      allStores.forEach((store) => {
        newInventoryByStore.set(store.id, {
          storeName: store.name,
          totalItems: 0,
          inventoryValue: 0,
          lowStockCount: 0,
        });
      });

      // Always ensure the Non-Specified store is represented
      newInventoryByStore.set(unspecifiedStoreId, {
        storeName: unspecifiedStoreName,
        totalItems: 0,
        inventoryValue: 0,
        lowStockCount: 0,
      });

      // 2. Fetch combined inventory data (Stock, Variant/Price, and Product Name details)
      //    NOTE: Removed .limit(5000) to ensure ALL stock records are considered for metrics.
      const { data: fullInventory, error: fullInventoryError } = await supabase.from("stock_on_hand").select(
        `
            quantity,
            min_stock,
            store_id,
            variants(
                variant_id,
                sku, 
                selling_price, 
                cost,
                products(name)
            )
          `,
      );

      if (fullInventoryError) {
        console.error("❌ Error fetching full inventory:", fullInventoryError);
        toast.error("Failed to load inventory for metrics");
        return;
      }

      console.log(`📦 Found ${fullInventory.length} stock records.`);

      const newUnassignedItemsData: any[] = [];
      const newStoreMetricsData: StoreMetrics[] = []; // This will be the final array

      fullInventory.forEach((item: any) => {
        // Use 'unspecified' if store_id is null/undefined
        const storeId = item.store_id || unspecifiedStoreId;

        // If the store ID isn't in our map, use the unspecified key
        if (!newInventoryByStore.has(storeId)) {
          // This is for stock records pointing to a store_id that doesn't exist in the stores table.
          // We treat it as unspecified to ensure stock is counted.
          if (storeId !== unspecifiedStoreId) {
            console.warn(`Stock record found for unknown store ID: ${item.store_id}. Grouping as Unspecified.`);
          }
          // Ensure the unspecified key exists if it was created on-the-fly
          if (!newInventoryByStore.has(unspecifiedStoreId)) {
            newInventoryByStore.set(unspecifiedStoreId, {
              storeName: unspecifiedStoreName,
              totalItems: 0,
              inventoryValue: 0,
              lowStockCount: 0,
            });
          }
        }

        const metrics = newInventoryByStore.get(storeId)!;

        const variant = item.variants;
        // Retrieve the correct store name from the pre-populated metrics object
        const currentStoreName = metrics.storeName;

        // Map to a simplified, flat object for CSV export consistency
        const mappedItem = {
          item_name: variant?.products?.name || "N/A",
          sku: variant?.sku || "N/A",
          quantity: item.quantity,
          min_stock: item.min_stock,
          store_name: currentStoreName,
          selling_price: variant?.selling_price,
          cost: variant?.cost,
        };

        if (storeId === unspecifiedStoreId) {
          newUnassignedItemsData.push(mappedItem);
        }

        const quantity = Number(item.quantity) || 0;
        const minStock = Number(item.min_stock) || 0;

        // Price logic: Use selling price, fallback to cost, default to 50 for calculation
        const price = Number(variant?.selling_price) || Number(variant?.cost) || 50;
        const value = quantity * price;

        metrics.totalItems += quantity;
        metrics.inventoryValue += value;
        if (quantity > 0 && quantity <= minStock) {
          // Only count low stock if quantity > 0
          metrics.lowStockCount += 1;
        }
      });

      // Convert Map results to the final StoreMetrics array
      // This iterates over all stores initialized at the start, ensuring they are all present.
      newInventoryByStore.forEach((metrics) => {
        // Only push to the final array if the store was in the initial list OR has actual stock
        // (to prevent having metrics for stores with zero stock *unless* they were explicitly loaded).
        // Since we initialized the map with all stores, this is simpler:
        newStoreMetricsData.push({
          storeName: metrics.storeName,
          totalItems: metrics.totalItems,
          inventoryValue: metrics.inventoryValue,
          lowStockCount: metrics.lowStockCount,
        });
      });

      console.log("🎯 Final store metrics:", newStoreMetricsData);
      setStoreMetrics(newStoreMetricsData);
      setUnassignedItemsData(newUnassignedItemsData);
    } catch (error) {
      console.error("💥 Error in fetchRealStoreMetrics:", error);
      toast.error("Failed to load store metrics");
    } finally {
      setStoreMetricsLoading(false);
    }
  };

  // Fetch real notifications from database
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);

      // NOTE: This RPC call is likely the source of the 404 error for the RPC endpoint.
      // It is left in place as it is likely a planned feature (a PostgreSQL function).
      try {
        await supabase.rpc("check_low_stock_notifications");
      } catch (error) {
        console.log("Could not check low stock notifications:", error);
      }

      // Fetch real notifications from the database
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

  // Initialize dashboard
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

    // Fetch real data on component mount
    fetchRealStoreMetrics();
    fetchNotifications();

    // Set up real-time listeners for automatic refresh
    const subscription = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_on_hand" }, () => {
        // This handles automatic refresh for stock movements (transfers, POs, etc.)
        fetchRealStoreMetrics();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

  // Calculate totals
  const totalItemsAllStores = storeMetrics.reduce((sum, store) => sum + store.totalItems, 0);
  const totalValueAllStores = storeMetrics.reduce((sum, store) => sum + store.inventoryValue, 0);
  const totalLowStockAllStores = storeMetrics.reduce((sum, store) => sum + store.lowStockCount, 0);

  // Check if the "(Non-Specified Store)" exists and has data for the export button
  const hasUnspecifiedInventory = unassignedItemsData.length > 0;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Customizable overview of your inventory across all stores</p>
        </div>
        <div className="flex gap-2">
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

      {/* Store Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Inventory Overview by Store
            <div className="ml-auto flex gap-2">
              {/* New Button for Unspecified Inventory Report */}
              {hasUnspecifiedInventory && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportUnspecified}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Unspecified Data
                </Button>
              )}
              {/* REMOVED: Debug All Tables and Refresh Data buttons as requested */}
            </div>
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
          ) : storeMetrics.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Store Data Found</h3>
              <p className="text-muted-foreground mb-4">
                We couldn't find any store inventory data. Please ensure your stores and stock are configured.
              </p>
              {/* Debug button is hidden from UI but left in code comments/function if manual debug is needed */}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                  title="Total Items (All Stores)"
                  value={totalItemsAllStores.toLocaleString()}
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
                  value={totalLowStockAllStores.toLocaleString()}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  variant="warning"
                />
                <MetricCard
                  title="Active Stores"
                  value={storeMetrics.filter((s) => s.storeName !== "(Non-Specified Store)").length}
                  icon={<Warehouse className="w-5 h-5" />}
                  variant="default"
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Store-wise Breakdown</h3>
                {/* The new fetchRealStoreMetrics ensures this grid contains ALL stores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeMetrics
                    .sort((a, b) => {
                      // Move Unspecified Store to the end for display
                      if (a.storeName === "(Non-Specified Store)") return 1;
                      if (b.storeName === "(Non-Specified Store)") return -1;
                      return 0;
                    })
                    .map((store, index) => (
                      <Card
                        key={index}
                        className={`relative overflow-hidden ${
                          store.storeName === "(Non-Specified Store)" ? "border-2 border-dashed border-red-500" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4
                              className={`font-semibold text-sm truncate ${
                                store.storeName === "(Non-Specified Store)" ? "text-red-500" : ""
                              }`}
                            >
                              {store.storeName}
                            </h4>
                            <Store
                              className={`w-4 h-4 ${
                                store.storeName === "(Non-Specified Store)" ? "text-red-500" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Items:</span>
                              <span className="font-medium">{store.totalItems.toLocaleString()}</span>
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
                                {store.lowStockCount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {store.storeName === "(Non-Specified Store)" && store.totalItems > 0 && (
                            <div className="mt-3">
                              <Button
                                variant="link"
                                size="sm"
                                onClick={handleExportUnspecified}
                                className="p-0 h-auto text-xs text-red-500 hover:text-red-600"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download & Export Data
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rest of the dashboard components... */}
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
              value={metrics.totalItems.toLocaleString()}
              icon={<Package className="w-5 h-5" />}
              variant="default"
            />
            <MetricCard
              title="Inventory Value"
              value={formatCurrency(metrics.totalValue, currency)}
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
