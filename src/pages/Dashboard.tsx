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

  const { data: aggregatedInventory = [], isLoading: aggregatedLoading } = useAggregatedInventory();
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  const [storeMetricsLoading, setStoreMetricsLoading] = useState(true);
  const [unassignedItemsData, setUnassignedItemsData] = useState<any[]>([]);

  // Utility functions: export CSV
  const exportToCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) return toast.error("No data to export.");
    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)));
    const headers = Array.from(allKeys);

    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const cell = row[fieldName] ?? "";
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

  const handleExportUnspecified = () => {
    exportToCsv(unassignedItemsData, "Unspecified_Inventory_Report.csv");
  };

  // Debug database tables
  const debugAllTables = async () => {
    console.log("=== DATABASE DEBUG ===");
    const tables = ["v_store_stock_levels", "items", "stock_on_hand", "purchase_order_items", "stores"];
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select("*")
          .limit(5);
        console.log(`=== Table: ${tableName} ===`, data, error);
      } catch (err) {
        console.log(`Table "${tableName}" error:`, err);
      }
    }
  };

  // Compute store metrics whenever aggregatedInventory changes
  useEffect(() => {
    setStoreMetricsLoading(true);
    try {
      const storeMap = new Map<string | "(NON)", StoreMetrics>();
      const unassignedRows: any[] = [];

      aggregatedInventory.forEach((item: any) => {
        const itemCost = Number(item.cost || item.price || 0);
        const minStock = Number(item.min_stock || 0);

        if (Array.isArray(item.stores) && item.stores.length > 0) {
          item.stores.forEach((store: any) => {
            const storeId = store.store_id ?? "(NON)";
            const storeName = store.store_name || "(Non-Specified Store)";
            const qty = Number(store.quantity || 0);

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
            item_id: item.id,
            sku: item.sku,
            item_name: item.name || item.item_name || "",
            quantity: 0,
            min_stock: item.min_stock || 0,
            store_name: "(Non-Specified Store)",
            cost: item.cost || item.price || 0,
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

      const metricsArray: StoreMetrics[] = Array.from(storeMap.values()).sort((a, b) =>
        a.storeName === "(Non-Specified Store)" ? 1 : b.storeName === "(Non-Specified Store)" ? -1 : 0,
      );

      setStoreMetrics(metricsArray);
      setUnassignedItemsData(unassignedRows);
    } catch (err) {
      console.error("Error computing store metrics:", err);
      setStoreMetrics([]);
      setUnassignedItemsData([]);
    } finally {
      setStoreMetricsLoading(false);
    }
  }, [aggregatedInventory]);

  // Notifications
  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      await supabase.rpc("check_low_stock_notifications");
    } catch {}
    const { data: notificationData, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return setNotifications([]);
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
    setNotificationsLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleNotificationClick = (link: string, notificationId?: string) => {
    setIsNotificationsOpen(false);
    if (notificationId) markAsRead(notificationId);
    navigate(link);
  };

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

    const subscription = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchNotifications())
      .on("postgres_changes", { event: "*", schema: "public", table: "v_store_stock_levels" }, () =>
        console.log("v_store_stock_levels changed, refetch aggregated inventory"),
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (dashboardCharts.length > 0) localStorage.setItem("dashboard-charts", JSON.stringify(dashboardCharts));
  }, [dashboardCharts]);

  // Drag & Drop for charts
  const handleDragStart = (e: React.DragEvent, chartId: string) => e.dataTransfer.setData("chartId", chartId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, targetChartId: string) => {
    e.preventDefault();
    const draggedChartId = e.dataTransfer.getData("chartId");
    if (draggedChartId === targetChartId) return;
    const draggedIndex = dashboardCharts.findIndex((c) => c.id === draggedChartId);
    const targetIndex = dashboardCharts.findIndex((c) => c.id === targetChartId);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const newCharts = [...dashboardCharts];
    const [draggedChart] = newCharts.splice(draggedIndex, 1);
    newCharts.splice(targetIndex, 0, draggedChart);
    setDashboardCharts(newCharts.map((c, i) => ({ ...c, position: i })));
  };

  // -------------------------------
  // PAGE RENDER
  // -------------------------------
  return (
    <div className="min-h-screen p-8 space-y-8 bg-background">
      {/* Header, Buttons, Notifications */}
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
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2 mt-1" />
                      </div>
                    ))
                  ) : notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No new approvals or notifications.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer ${notif.is_read ? "bg-muted/30" : ""}`}
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
              </DialogContent>
            </Dialog>
          )}
          <Button variant={isEditMode ? "default" : "outline"} onClick={() => setIsEditMode(!isEditMode)}>
            {isEditMode ? "Save Layout" : "Edit Dashboard"}
          </Button>
        </div>
      </div>

      {/* Store Metrics and Charts */}
      {/* ... All your store metrics cards and dashboard charts code ... */}
      {/* This part is identical to your original code, wrapped in min-h-screen */}
    </div>
  );
};

export default Dashboard;
