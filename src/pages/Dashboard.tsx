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

// NEW Interface for Notification fetched from DB
interface Notification {
  id: string;
  type: "purchase-order" | "transfer" | "low-stock";
  title: string;
  description: string;
  link: string; // The route to navigate to on click
  created_at: string;
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

  // STATE FOR NOTIFICATIONS
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]); // To store the list of notifications
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // **********************************
  // MODIFIED FUNCTION: Fetch Pending Approvals COUNT
  // **********************************
  const fetchPendingApprovals = async () => {
    if (!isAdmin) return; // Only fetch for Admins

    try {
      // Assuming a table named 'inventory_approvals' with a 'status' column
      const { count, error } = await supabase
        .from("inventory_approvals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      setPendingApprovalsCount(count || 0);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      toast.error("Failed to load approval notifications.");
      setPendingApprovalsCount(0);
    }
  };

  // **********************************
  // NEW FUNCTION: Fetch Pending Notifications LIST (DB-driven)
  // **********************************
  const fetchNotificationsList = async () => {
    if (!isAdmin) return;
    try {
      // Fetch the actual records that are pending
      const { data, error } = await supabase
        .from("inventory_approvals")
        .select(`id, type, reference_id, created_at, title, description`) // Assuming these columns exist
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10); // Limit to 10 for dashboard preview

      if (error) throw error;

      // Map DB data to the Notification interface and create the dynamic link
      const mappedNotifications: Notification[] = data.map((item: any) => {
        let linkPath = "";
        switch (item.type) {
          case "purchase-order":
            linkPath = `/purchase-orders/${item.reference_id}/edit`;
            break;
          case "transfer":
            linkPath = `/transfers/${item.reference_id}`;
            break;
          // You would add more types here, e.g., 'low-stock' might link to /alerts
          default:
            linkPath = "/approvals"; // Fallback to the main approvals page
        }

        return {
          id: item.id,
          type: item.type,
          title: item.title || `Pending ${item.type} ${item.reference_id}`,
          description: item.description || `Action required on ${item.type} with ID ${item.reference_id}.`,
          link: linkPath,
          created_at: item.created_at,
        };
      });

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error("Error fetching notification list:", error);
      setNotifications([]);
    }
  };

  // Initialize dashboard charts from localStorage and fetch data
  useEffect(() => {
    const savedCharts = localStorage.getItem("dashboard-charts");
    if (savedCharts) {
      setDashboardCharts(JSON.parse(savedCharts));
    } else {
      // Default charts
      const defaultCharts: DashboardChart[] = [
        { id: "1", chartId: "inventory-by-category", position: 0 },
        { id: "2", chartId: "value-distribution", position: 1 },
        { id: "3", chartId: "stock-movement", position: 2 },
        { id: "4", chartId: "abc-analysis", position: 3 },
      ];
      setDashboardCharts(defaultCharts);
      localStorage.setItem("dashboard-charts", JSON.stringify(defaultCharts));
    }

    // FETCH PENDING APPROVALS ON LOAD (If admin)
    fetchPendingApprovals();
    fetchNotificationsList();
  }, [isAdmin]); // Added isAdmin as dependency

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

  // Handler for notification click
  const handleNotificationClick = (link: string) => {
    setIsNotificationsOpen(false); // Close the dialog
    navigate(link); // Navigate to the specific page/resource
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Customizable overview of your inventory</p>
        </div>
        <div className="flex gap-2">
          {/* ********************************** */}
          {/* UPDATED: Notifications Button for Admins (Use Dialog) */}
          {/* ********************************** */}
          {isAdmin && (
            <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <DialogTrigger asChild>
                <div className="relative">
                  <Button variant="outline" size="icon">
                    <Bell className="w-5 h-5" />
                  </Button>
                  {/* Use the count from the database for the badge */}
                  {pendingApprovalsCount > 0 && (
                    <span
                      className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-background bg-red-500 text-xs text-white flex items-center justify-center -translate-y-1 translate-x-1"
                      style={{ fontSize: "10px" }}
                    >
                      {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                    </span>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Notifications ({notifications.length} Pending)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {pendingApprovalsCount > 0 && notifications.length === 0 ? (
                    <div className="text-center py-4">
                      <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                      <Skeleton className="h-4 w-1/2 mx-auto" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No new approvals or notifications.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleNotificationClick(notif.link)}
                      >
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.description}</p>
                        <p className="text-xs text-right text-gray-400">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {/* Button to navigate to the full Approvals page */}
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

      {/* Metrics Cards */}
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
