import { 
  useBIMetrics, 
  useSalesTrend, 
  useTopCategories, 
  useLowStockAlerts,
  useCustomerTrend,
  useCalculatedKPIs
} from "@/hooks/useBIMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Users,
  BarChart3,
  Activity,
  AlertTriangle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const BusinessIntelligence = () => {
  const { formatCurrency } = useSystemSettings();
  const { data: metrics, isLoading: metricsLoading } = useBIMetrics();
  const { data: salesTrend } = useSalesTrend();
  const { data: topCategories } = useTopCategories();
  const { data: lowStockAlerts } = useLowStockAlerts();
  const { data: customerTrend } = useCustomerTrend();
  const { data: kpis } = useCalculatedKPIs();

  // Merge sales and customer trends for the chart
  const trendData = salesTrend?.map((s, idx) => ({
    ...s,
    customers: customerTrend?.[idx]?.customers || 0,
  })) || [];

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: string; 
    change?: string; 
    icon: React.ElementType; 
    trend?: "up" | "down" | "neutral";
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className={`flex items-center text-xs mt-1 ${
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
          }`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : 
             trend === "down" ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (metricsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading business intelligence data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Business Intelligence</h1>
          <p className="text-muted-foreground">Key metrics and performance insights</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Activity className="h-3 w-3 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales (30 days)"
          value={formatCurrency(metrics?.totalSales || 0)}
          change={`${metrics?.salesGrowth?.toFixed(1) || 0}% from last month`}
          icon={DollarSign}
          trend={Number(metrics?.salesGrowth) > 0 ? "up" : Number(metrics?.salesGrowth) < 0 ? "down" : "neutral"}
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(metrics?.inventoryValue || 0)}
          icon={Package}
          trend="neutral"
        />
        <MetricCard
          title="Pending PO Value"
          value={formatCurrency(metrics?.pendingPOValue || 0)}
          change={`${metrics?.pendingPOCount || 0} orders pending`}
          icon={ShoppingCart}
          trend="neutral"
        />
        <MetricCard
          title="New Customers (30 days)"
          value={String(metrics?.newCustomers || 0)}
          change={`${metrics?.customerGrowth?.toFixed(1) || 0}% growth`}
          icon={Users}
          trend={Number(metrics?.customerGrowth) > 0 ? "up" : Number(metrics?.customerGrowth) < 0 ? "down" : "neutral"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#salesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Orders & Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="customers" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--secondary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Section */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Inventory Turnover</span>
                <Badge variant="outline">{metrics?.inventoryTurnover || 0}x</Badge>
              </div>
              <Progress value={Math.min(Number(metrics?.inventoryTurnover || 0) * 10, 100)} />
              <p className="text-xs text-muted-foreground mt-1">Target: 10x annually</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Order Fulfillment Rate</span>
                <Badge variant="outline">{kpis?.fulfillmentRate || 0}%</Badge>
              </div>
              <Progress value={kpis?.fulfillmentRate || 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: 98%</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Customer Retention</span>
                <Badge variant="outline">{kpis?.customerRetention || 0}%</Badge>
              </div>
              <Progress value={kpis?.customerRetention || 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: 90%</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Gross Margin</span>
                <Badge variant="outline">{kpis?.grossMargin || 0}%</Badge>
              </div>
              <Progress value={kpis?.grossMargin || 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: 35%</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Stock Accuracy</span>
                <Badge variant="outline">{kpis?.stockAccuracy || 0}%</Badge>
              </div>
              <Progress value={kpis?.stockAccuracy || 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: 99%</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Vendor On-Time Rate</span>
                <Badge variant="outline">{kpis?.vendorOnTimeRate || 0}%</Badge>
              </div>
              <Progress value={kpis?.vendorOnTimeRate || 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: 95%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories && topCategories.length > 0 ? (
              topCategories.map((category) => (
                <div key={category.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{category.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(category.value)}</span>
                    </div>
                    <Progress value={category.percentage} />
                  </div>
                  <Badge variant="secondary">{category.percentage}%</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No category data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockAlerts && lowStockAlerts.length > 0 ? (
              lowStockAlerts.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg border">
                  <Badge variant="destructive">Low</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{(item.items as any)?.name || 'Unknown Item'}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {(item.items as any)?.sku} | Stock: {item.quantity} / Min: {item.min_stock}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No low stock alerts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessIntelligence;
