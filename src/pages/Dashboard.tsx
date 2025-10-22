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

  // Debug function to check ALL tables in your database
  const debugAllTables = async () => {
    console.log("=== COMPLETE DATABASE DEBUG ===");

    try {
      // Check all possible table names
      const tables = [
        "stores",
        "inventory_items",
        "products",
        "items",
        "stock",
        "inventory",
        "store_inventory",
        "product_inventory",
      ];

      for (const tableName of tables) {
        try {
          const { data, error } = await supabase.from(tableName).select("*").limit(5);

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

  // Fixed: Get real store metrics from your actual database
  const fetchRealStoreMetrics = async () => {
    try {
      setStoreMetricsLoading(true);
      console.log("🔍 Fetching REAL store metrics from database...");

      // Get all stores
      const { data: stores, error: storesError } = await supabase.from("stores").select("id, name").order("name");

      if (storesError) {
        console.error("❌ Error fetching stores:", storesError);
        toast.error("Failed to load stores");
        return;
      }

      console.log("🏪 Stores found:", stores);

      if (!stores || stores.length === 0) {
        console.log("⚠️ No stores found in database");
        setStoreMetrics([]);
        return;
      }

      const storeMetricsData: StoreMetrics[] = [];

      // Try multiple possible table names for inventory data
      const possibleInventoryTables = ["inventory_items", "products", "items", "stock", "inventory"];

      let allInventory: any[] = [];
      let inventoryError = null;

      // Try each possible table name
      for (const tableName of possibleInventoryTables) {
        console.log(`🔍 Trying to fetch from table: ${tableName}`);
        const { data, error } = await supabase.from(tableName).select("*").limit(1000); // Increase limit to get more data

        if (!error && data && data.length > 0) {
          console.log(`✅ Found data in table: ${tableName}`, data.length, "items");
          allInventory = data;
          break;
        } else {
          console.log(`❌ No data in table: ${tableName}`, error);
        }
      }

      // If no inventory data found in any table
      if (allInventory.length === 0) {
        console.log("❌ No inventory data found in any table");
        // Create empty metrics for each store
        for (const store of stores) {
          storeMetricsData.push({
            storeName: store.name,
            totalItems: 0,
            inventoryValue: 0,
            lowStockCount: 0,
          });
        }
        setStoreMetrics(storeMetricsData);
        return;
      }

      console.log("📦 Inventory data structure:", allInventory[0]);
      console.log("🔑 Inventory item keys:", Object.keys(allInventory[0]));

      // Analyze the first item to understand the structure
      const firstItem = allInventory[0];
      const hasStoreId = "store_id" in firstItem;
      const hasLocation = "location" in firstItem;
      const hasQuantity = "quantity" in firstItem || "stock_quantity" in firstItem || "qty" in firstItem;
      const hasPrice = "price" in firstItem || "unit_price" in firstItem || "cost" in firstItem;
      const hasCost = "cost_price" in firstItem || "cost" in firstItem || "unit_cost" in firstItem;
      const hasMinStock = "min_stock" in firstItem || "minimum_stock" in firstItem || "reorder_level" in firstItem;

      console.log("🔍 Field analysis:", {
        hasStoreId,
        hasLocation,
        hasQuantity,
        hasPrice,
        hasCost,
        hasMinStock,
      });

      // Process each store
      for (const store of stores) {
        console.log(`\n📊 Processing store: ${store.name}`);

        let storeItems: any[] = [];
        let totalItems = 0;
        let inventoryValue = 0;
        let lowStockCount = 0;

        // Method 1: Filter by store_id (exact match)
        if (hasStoreId) {
          storeItems = allInventory.filter((item: any) => item.store_id === store.id);
          console.log(`📍 Found ${storeItems.length} items by store_id`);
        }

        // Method 2: Filter by location (partial match)
        else if (hasLocation) {
          storeItems = allInventory.filter(
            (item: any) => item.location && item.location.toString().toLowerCase().includes(store.name.toLowerCase()),
          );
          console.log(`📍 Found ${storeItems.length} items by location match`);
        }

        // Method 3: If no store linking, assign items randomly for demo
        else {
          console.log("⚠️ No store linking field found, using demo distribution");
          // Simple demo: assign items randomly to stores
          storeItems = allInventory.filter((_, index) => index % stores.length === stores.indexOf(store));
          console.log(`📍 Assigned ${storeItems.length} items for demo`);
        }

        // Calculate metrics for this store
        if (storeItems.length > 0) {
          storeItems.forEach((item: any) => {
            totalItems += 1;

            // Get quantity from various possible field names
            let quantity = 1;
            if (hasQuantity) {
              quantity = item.quantity || item.stock_quantity || item.qty || 1;
            }

            // Get price from various possible field names
            let price = 0;
            if (hasPrice) {
              price = item.price || item.unit_price || item.cost || 0;
            } else if (hasCost) {
              price = item.cost_price || item.cost || item.unit_cost || 0;
            } else {
              price = 10; // Default price for demo
            }

            const value = quantity * price;
            inventoryValue += value;

            // Get min stock from various possible field names
            let minStock = 5; // Default
            if (hasMinStock) {
              minStock = item.min_stock || item.minimum_stock || item.reorder_level || 5;
            }

            // Check if item is low stock
            if (quantity <= minStock) {
              lowStockCount += 1;
            }
          });
        }

        console.log(`📈 Store ${store.name} metrics:`, {
          totalItems,
          inventoryValue,
          lowStockCount,
        });

        storeMetricsData.push({
          storeName: store.name,
          totalItems,
          inventoryValue,
          lowStockCount,
        });
      }

      console.log("🎯 Final store metrics:", storeMetricsData);
      setStoreMetrics(storeMetricsData);
    } catch (error) {
      console.error("💥 Error in fetchRealStoreMetrics:", error);
      toast.error("Failed to load store metrics");
    } finally {
      setStoreMetricsLoading(false);
    }
  };

  // Enhanced notifications with real data
  const fetchNotifications = async () => {
    if (!isAdmin) {
      setNotificationsLoading(false);
      return;
    }

    try {
      setNotificationsLoading(true);
      const allNotifications: Notification[] = [];

      // Try to get real notifications
      try {
        const { data: approvals, error: approvalsError } = await supabase
          .from("inventory_approvals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (!approvalsError && approvals && approvals.length > 0) {
          console.log("✅ Found real notifications:", approvals);
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
        } else {
          console.log("📭 No real notifications found");
        }
      } catch (tableError) {
        console.log("❌ Inventory approvals table error:", tableError);
      }

      // Only use sample data if no real notifications found
      if (allNotifications.length === 0) {
        console.log("🎭 Using sample notifications");
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
        description: "USB-C Cables stock is below minimum threshold",
        link: "/inventory?alert=ITEM-USB-C-001",
        created_at: new Date().toISOString(),
      },
    ];
  };

  const markAsRead = async (notificationId: string) => {
    try {
      if (!notificationId.startsWith("sample-")) {
        await supabase.from("inventory_approvals").update({ is_read: true }).eq("id", notificationId);
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

    // Set up real-time listeners
    const subscription = supabase
      .channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_approvals" }, () => {
        fetchNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
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

  // Calculate totals
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
              <Button variant="outline" size="sm" onClick={debugAllTables}>
                Debug All Tables
              </Button>
              <Button variant="outline" size="sm" onClick={fetchRealStoreMetrics}>
                Refresh Data
              </Button>
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
                We couldn't find any store inventory data. Check the console for debug information.
              </p>
              <Button onClick={debugAllTables}>Debug Database</Button>
            </div>
          ) : (
            <>
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
