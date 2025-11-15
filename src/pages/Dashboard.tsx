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
  Download,
  BarChart as BarChartIcon, // Import BarChart icon with alias to avoid conflict with recharts
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription, // <--- FIXED: Imported CardDescription
} from "@/components/ui/card";
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
  color: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface DashboardChart {
  id: string;
  chartConfig: ChartConfig;
  position: number;
}

const defaultCharts: ChartConfig[] = [
  {
    id: "lowStockSummary",
    type: "bar",
    title: "Low Stock Items",
    dataKey: "quantity",
    color: "#ff8c00",
    xAxisLabel: "Item Name",
    yAxisLabel: "Quantity",
  },
  {
    id: "inventoryValueByStore",
    type: "pie",
    title: "Inventory Value by Store",
    dataKey: "inventoryValue",
    color: "#4caf50",
  },
  {
    id: "inventoryValueByCategory",
    type: "pie",
    title: "Inventory Value by Category",
    dataKey: "inventoryValue",
    color: "#2196f3",
  },
  {
    id: "stockMovement",
    type: "line",
    title: "Monthly Stock Movement",
    dataKey: "movements",
    color: "#9c27b0",
    xAxisLabel: "Month",
    yAxisLabel: "Movement Count",
  },
  {
    id: "inventoryTurnoverRate",
    type: "line",
    title: "Inventory Turnover Rate (Monthly)",
    dataKey: "turnoverRates",
    color: "#f44336",
    xAxisLabel: "Month",
    yAxisLabel: "Turnover Rate",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  const { data: dashboardData, isLoading: isLoadingData, error: dataError } = useDashboardData(); // <--- FIXED: Correctly destructuring data, isLoading, and error.

  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Chart configuration state
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const { data, error } = await supabase.rpc("get_low_stock_notifications");

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Notifications fetch exception:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const storedCharts = localStorage.getItem("dashboard-charts");
    if (storedCharts) {
      setDashboardCharts(JSON.parse(storedCharts));
    }
  }, []);

  useEffect(() => {
    if (dashboardCharts.length > 0) {
      localStorage.setItem("dashboard-charts", JSON.stringify(dashboardCharts));
    }
  }, [dashboardCharts]);

  const handleAddChart = () => {
    if (!selectedChart) return;

    const config = defaultCharts.find((c) => c.id === selectedChart);
    if (!config) return;

    const newChart: DashboardChart = {
      id: `${config.id}-${Date.now()}`,
      chartConfig: config,
      position: dashboardCharts.length,
    };

    setDashboardCharts([...dashboardCharts, newChart]);
    setSelectedChart("");
    setIsAddChartOpen(false);
  };

  const handleRemoveChart = (id: string) => {
    setDashboardCharts(dashboardCharts.filter((c) => c.id !== id));
  };

  const handleSort = (draggedId: string, targetId: string) => {
    const draggedChart = dashboardCharts.find((c) => c.id === draggedId);
    const targetChart = dashboardCharts.find((c) => c.id === targetId);

    if (draggedChart && targetChart) {
      const newCharts = dashboardCharts.filter((c) => c.id !== draggedId);
      const targetIndex = newCharts.findIndex((c) => c.id === targetId);
      newCharts.splice(targetIndex, 0, draggedChart);
      setDashboardCharts(newCharts.map((c, index) => ({ ...c, position: index })));
    }
  };

  const renderChart = (chart: DashboardChart) => {
    const chartConfig = chart.chartConfig;
    if (!dashboardData || isLoadingData) {
      return <Skeleton className="h-[300px] w-full" />;
    }

    // Assumes dashboardData is an object with keys matching chartConfig.id
    const data = dashboardData[chartConfig.id as keyof typeof dashboardData];

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px]">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No data available for this chart.</p>
        </div>
      );
    }

    switch (chartConfig.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" label={{ value: chartConfig.xAxisLabel, position: "bottom" }} />
              <YAxis label={{ value: chartConfig.yAxisLabel, angle: -90, position: "left" }} />
              <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              <Bar dataKey={chartConfig.dataKey} fill={chartConfig.color} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "pie":
        const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={chartConfig.dataKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill={chartConfig.color}
                label
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* Assuming dataKeys for line charts are 'movements' and 'turnoverRates' */}
              <Line
                type="monotone"
                dataKey={chartConfig.dataKey === "stockMovement" ? "movements" : "turnover"}
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

  const isLoading = isLoadingData || notificationsLoading;

  if (dataError) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="w-5 h-5 mr-2" /> Data Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load dashboard data. Please check your database connection or contact support.</p>
            <p className="text-sm text-muted-foreground mt-2">Error details: {(dataError as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- SAFE DESTRUCTURING OF DASHBOARD DATA ---
  const {
    totalInventoryValue = 0,
    totalLowStockItems = 0,
    totalStores = 0,
    inventoryValueChange = 0,
    lowStockItems = [],
    totalItems = 0, // Assuming totalItems is available on the data object
  } = (dashboardData as any)?.metrics || {}; // Use optional chaining in case dashboardData is null/undefined
  // ---------------------------------------------

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Overview</h1>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inventory Value"
          icon={DollarSign} // <--- FIXED: Passing icon component reference
          value={formatCurrency(totalInventoryValue, currency)}
          change={formatCurrency(inventoryValueChange, currency, true)}
          changeType={inventoryValueChange >= 0 ? "positive" : "negative"}
          isLoading={isLoading}
        />
        <MetricCard
          title="Low Stock Items"
          icon={AlertTriangle} // <--- FIXED: Passing icon component reference
          value={totalLowStockItems.toString()}
          changeType="negative"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Items"
          icon={Package} // <--- FIXED: Passing icon component reference
          value={totalItems.toString()}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Stores"
          icon={Store} // <--- FIXED: Passing icon component reference
          value={totalStores.toString()}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dynamic Chart Area */}
        <div className={`space-y-6 ${isEditMode ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Inventory Visualization</h2>
            <div className="flex gap-2">
              <Dialog open={isAddChartOpen} onOpenChange={setIsAddChartOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setIsAddChartOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chart
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Chart</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedChart} onValueChange={setSelectedChart}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a chart to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultCharts.map((chart) => (
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
                        Add
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(!isEditMode)}>
                {isEditMode ? "Done Editing" : "Edit Layout"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {dashboardCharts
              .sort((a, b) => a.position - b.position)
              .map((chart) => (
                <Card
                  key={chart.id}
                  className={`relative ${isEditMode ? "border-2 border-primary/50" : ""}`}
                  // Draggable implementation would go here using drag/drop libraries
                >
                  <CardHeader>
                    <CardTitle>{chart.chartConfig.title}</CardTitle>
                    {isEditMode && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground"
                          // Draggable handle logic goes here
                        >
                          <GripVertical className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive"
                          onClick={() => handleRemoveChart(chart.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="h-[300px] flex items-center justify-center">{renderChart(chart)}</CardContent>
                </Card>
              ))}

            {dashboardCharts.length === 0 && !isLoading && (
              <Card className="md:col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChartIcon className="w-12 h-12 text-muted-foreground mb-4" />{" "}
                  {/* <--- FIXED: Used BarChartIcon import */}
                  <h3 className="text-lg font-semibold mb-2">No charts configured</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add charts to your dashboard to visualize your inventory data
                  </p>
                  <Button onClick={() => setIsAddChartOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Chart
                  </Button>
                </CardContent>
              </Card>
            )}

            {isLoading && (
              <>
                <Skeleton className="h-[380px] w-full" />
                <Skeleton className="h-[380px] w-full" />
              </>
            )}
          </div>
        </div>

        {/* Low Stock and Notifications Sidebar */}
        <div className={isEditMode ? "lg:col-span-1 space-y-6" : "hidden"}>
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" /> Notifications ({notifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No new notifications.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification, index) => (
                    <div key={index} className="border-l-4 border-warning pl-2">
                      <p className="text-sm font-medium">{notification.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Store: {notification.store_name} | Qty: {notification.quantity}
                      </p>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate("/notifications")}>
                      View all {notifications.length} notifications
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-warning" /> Low Stock Inventory
              </CardTitle>
              <CardDescription>Items falling below their minimum stock threshold.</CardDescription>{" "}
              {/* <--- FIXED: Used CardDescription */}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">All items are sufficiently stocked!</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {lowStockItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center pb-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{item.itemName}</p>
                          <p className="text-sm text-muted-foreground">{item.storeName}</p>
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
        </div>
      </div>

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
