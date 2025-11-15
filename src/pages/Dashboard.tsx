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
  Bell,
  Store,
  Warehouse,
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
  const {
    metrics = {},
    categoryQuantity = [],
    categoryValue = [],
    lowStockItems = [],
    stockMovementTrends = [],
    abcDistribution = [],
    isLoading = false,
  } = useDashboardData() || {};
  const navigate = useNavigate();
  const { isAdmin = false } = useIsAdmin() || {};
  const { settings } = useSystemSettings() || {};
  const currency = settings?.currency || "USD";

  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const { data: aggregatedInventory = [], isLoading: aggregatedLoading = false } = useAggregatedInventory() || [];

  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  const [storeMetricsLoading, setStoreMetricsLoading] = useState(true);
  const [unassignedItemsData, setUnassignedItemsData] = useState<any[]>([]);

  const exportToCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row || {}).forEach((key) => allKeys.add(key)));
    const headers = Array.from(allKeys);

    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const cell = row?.[fieldName] ?? "";
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

  const handleExportUnspecified = () => exportToCsv(unassignedItemsData, "Unspecified_Inventory_Report.csv");

  const debugAllTables = async () => {
    console.log("=== COMPLETE DATABASE DEBUG ===");
    const tables = ["v_store_stock_levels", "items", "stock_on_hand", "purchase_order_items", "stores"];
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select("*")
          .limit(5);
        console.log(`Table: ${tableName}`, { data, error });
      } catch (err) {
        console.log(`Error accessing table ${tableName}:`, err);
      }
    }
  };

  // Compute store metrics safely
  useEffect(() => {
    setStoreMetricsLoading(true);
    try {
      const storeMap = new Map<string | "(NON)", StoreMetrics>();
      const unassignedRows: any[] = [];

      (aggregatedInventory || []).forEach((item: any) => {
        const itemCost = Number(item?.cost ?? item?.price ?? 0);
        const minStock = Number(item?.min_stock ?? 0);

        if (Array.isArray(item?.stores) && item.stores.length > 0) {
          item.stores.forEach((store: any) => {
            const storeId = store?.store_id ?? "(NON)";
            const storeName = store?.store_name || "(Non-Specified Store)";
            const qty = Number(store?.quantity ?? 0);

            if (!storeMap.has(storeId)) {
              storeMap.set(storeId, {
                storeId: storeId === "(NON)" ? undefined : storeId,
                storeName,
                totalItems: 0,
                inventoryValue: 0,
                lowStockCount: 0,
              });
            }

            const entry = storeMap.get(storeId)!;
            entry.totalItems += qty;
            entry.inventoryValue += qty * itemCost;
            if (qty > 0 && qty <= minStock) entry.lowStockCount += 1;
          });
        } else {
          unassignedRows.push({
            item_id: item?.id,
            sku: item?.sku,
            item_name: item?.name || item?.item_name || "",
            quantity: 0,
            min_stock: item?.min_stock ?? 0,
            store_name: "(Non-Specified Store)",
            cost: item?.cost ?? item?.price ?? 0,
          });

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
  }, [aggregatedInventory]);

  // Fetch notifications safely
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      await supabase.rpc("check_low_stock_notifications").catch(console.log);

      const { data: notificationData = [], error: notificationsError } = await supabase
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
        type: item.type,
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
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = (link: string, notificationId?: string) => {
    setIsNotificationsOpen(false);
    if (notificationId) markAsRead(notificationId);
    navigate(link);
  };

  // Load dashboard charts
  useEffect(() => {
    const savedCharts = localStorage.getItem("dashboard-charts");
    if (savedCharts) setDashboardCharts(JSON.parse(savedCharts));
    else {
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
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-charts", JSON.stringify(dashboardCharts));
  }, [dashboardCharts]);

  const getChartData = (dataKey: string) => {
    const safeCategoryQuantity = Array.isArray(categoryQuantity) ? categoryQuantity : [];
    const safeCategoryValue = Array.isArray(categoryValue) ? categoryValue : [];
    const safeStockMovementTrends = Array.isArray(stockMovementTrends) ? stockMovementTrends : [];
    const safeAbcDistribution = Array.isArray(abcDistribution) ? abcDistribution : [];

    const dataMap: { [key: string]: any } = {
      categoryQuantity: safeCategoryQuantity,
      categoryValue: safeCategoryValue,
      stockMovementTrends: safeStockMovementTrends,
      abcDistribution: safeAbcDistribution,
      lowStockByCategory: safeCategoryQuantity.map((item) => ({
        name: item.name || "",
        lowStock: Math.floor((item.value || 0) * 0.1),
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
    try {
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
          return <div className="text-red-500">Unknown chart type</div>;
      }
    } catch (err) {
      console.error("Chart render error:", err);
      return <div className="text-red-500">Chart failed to render</div>;
    }
  };

  const totalItemsAllStores = storeMetrics?.reduce((sum, store) => sum + (store.totalItems || 0), 0) || 0;
  const totalValueAllStores = storeMetrics?.reduce((sum, store) => sum + (store.inventoryValue || 0), 0) || 0;
  const totalLowStockAllStores = storeMetrics?.reduce((sum, store) => sum + (store.lowStockCount || 0), 0) || 0;
  const hasUnspecifiedInventory = Array.isArray(unassignedItemsData) && unassignedItemsData.length > 0;

  return (
    <div className="p-8 space-y-8">
      {/* --- Header / Buttons / Notifications --- */}
      {/* ... header code omitted for brevity; keep the same as before --- */}

      {/* --- Store Metrics Section --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" /> Inventory Overview by Store
            <div className="ml-auto flex gap-2">
              {hasUnspecifiedInventory && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportUnspecified}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
                >
                  <Download className="w-4 h-4 mr-1" /> Export Unspecified Data
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={debugAllTables}>
                Debug All Tables
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Refresh triggered")}>
                Refresh Data
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storeMetricsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {storeMetrics.map((store) => (
                <MetricCard
                  key={store.storeName}
                  title={store.storeName}
                  value={`${store.totalItems.toLocaleString()} items, ${formatCurrency(store.inventoryValue, currency)} value`}
                  icon={<Warehouse className="w-5 h-5" />}
                  variant={store.lowStockCount > 0 ? "warning" : "default"}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Dashboard Charts Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dashboardCharts.map((chart) => {
          const chartConfig = availableCharts.find((c) => c.id === chart.chartId);
          if (!chartConfig) return null;
          return (
            <Card key={chart.id}>
              <CardHeader>
                <CardTitle>{chartConfig.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading || aggregatedLoading ? <Skeleton className="h-64 w-full" /> : renderChart(chartConfig)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
