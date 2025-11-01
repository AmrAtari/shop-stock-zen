// src/pages/Reports.tsx

// src/pages/Reports.tsx

import React, { useState, useMemo, useEffect } from "react";
import { useReportsData } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Repeat2,
  BarChart,
  Package,
  AlertTriangle,
  PieChart,
  ShoppingCart,
  BarChart3,
  Calendar,
  Warehouse,
  ClipboardList,
  Scale,
  ArrowLeftRight,
  Users,
  Truck,
  Settings,
  FileText,
  Target,
  Zap,
  Brain,
  LineChart,
  GitBranch,
  Shield,
  Clock,
  Activity,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfDay } from "date-fns";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useSearchParams } from "react-router-dom";

// First, define all report types as a union
const REPORT_KEYS = [
  "DASHBOARD",
  "INVENTORY_ON_HAND",
  "INVENTORY_VALUATION",
  "LOW_STOCK",
  "INVENTORY_AGING",
  "STOCK_MOVEMENT",
  "INVENTORY_DISCREPANCY",
  "ABC_ANALYSIS",
  "SALES_PERFORMANCE",
  "COGS",
  "PIVOT_REPORT",
  "STOCK_MOVEMENT_TRANSACTION",
  // Financial Reports
  "PROFIT_LOSS",
  "BALANCE_SHEET",
  "CASH_FLOW",
  "GROSS_MARGIN_ANALYSIS",
  "REVENUE_BY_CATEGORY",
  "EXPENSE_ANALYSIS",
  // Customer Analytics
  "CUSTOMER_LIFETIME_VALUE",
  "CUSTOMER_SEGMENTATION",
  "SALES_BY_CUSTOMER",
  "REPEAT_CUSTOMER_RATE",
  "CUSTOMER_ACQUISITION",
  "CUSTOMER_RETENTION",
  // Procurement
  "SUPPLIER_PERFORMANCE",
  "PURCHASE_ORDER_ANALYSIS",
  "LEAD_TIME_ANALYSIS",
  "SUPPLIER_QUALITY",
  "PROCUREMENT_COST",
  "VENDOR_MANAGEMENT",
  // Operations
  "OPERATIONAL_EFFICIENCY",
  "THROUGHPUT_ANALYSIS",
  "CAPACITY_UTILIZATION",
  "QUALITY_METRICS",
  "DOWNTIME_ANALYSIS",
  "PRODUCTIVITY_REPORT",
  // Advanced Analytics
  "FORECASTING",
  "TREND_ANALYSIS",
  "PREDICTIVE_MODELING",
  "BUSINESS_INTELLIGENCE",
  "KPI_DASHBOARD",
  "PERFORMANCE_SCORECARD",
] as const;

type ReportTab = (typeof REPORT_KEYS)[number];

// Define the report config type
interface ReportConfig {
  name: string;
  icon: JSX.Element;
  description: string;
}

// Report configuration
const REPORT_CONFIG: Record<ReportTab, ReportConfig> = {
  DASHBOARD: {
    name: "Executive Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    description: "Executive overview with key performance indicators",
  },
  INVENTORY_ON_HAND: {
    name: "Inventory On-Hand",
    icon: <Package className="w-4 h-4" />,
    description: "Current inventory levels across all locations",
  },
  INVENTORY_VALUATION: {
    name: "Inventory Valuation",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Total value of inventory by category and location",
  },
  LOW_STOCK: {
    name: "Low Stock Alerts",
    icon: <AlertTriangle className="w-4 h-4" />,
    description: "Items below minimum stock levels with reorder recommendations",
  },
  INVENTORY_AGING: {
    name: "Inventory Aging",
    icon: <Calendar className="w-4 h-4" />,
    description: "Analysis of inventory by age and turnover rate",
  },
  STOCK_MOVEMENT: {
    name: "Stock Movement",
    icon: <TrendingUp className="w-4 h-4" />,
    description: "Inventory movement trends and velocity analysis",
  },
  INVENTORY_DISCREPANCY: {
    name: "Inventory Discrepancy",
    icon: <Scale className="w-4 h-4" />,
    description: "Variances, adjustments, and shrinkage analysis",
  },
  ABC_ANALYSIS: {
    name: "ABC Analysis",
    icon: <PieChart className="w-4 h-4" />,
    description: "Inventory classification by value and importance",
  },
  COGS: {
    name: "Cost of Goods Sold",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Detailed COGS analysis and margin reporting",
  },
  SALES_PERFORMANCE: {
    name: "Sales Performance",
    icon: <ShoppingCart className="w-4 h-4" />,
    description: "Sales metrics, trends, and performance indicators",
  },
  PIVOT_REPORT: {
    name: "Advanced Pivot Analysis",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Customizable pivot tables with multi-dimensional analysis",
  },
  STOCK_MOVEMENT_TRANSACTION: {
    name: "Stock Transactions",
    icon: <ClipboardList className="w-4 h-4" />,
    description: "Detailed stock movement transactions and audit trail",
  },

  // Financial Reports
  PROFIT_LOSS: {
    name: "Profit & Loss",
    icon: <FileText className="w-4 h-4" />,
    description: "Comprehensive P&L statement with variance analysis",
  },
  BALANCE_SHEET: {
    name: "Balance Sheet",
    icon: <Scale className="w-4 h-4" />,
    description: "Assets, liabilities, and equity position",
  },
  CASH_FLOW: {
    name: "Cash Flow",
    icon: <GitBranch className="w-4 h-4" />,
    description: "Operating, investing, and financing cash flows",
  },
  GROSS_MARGIN_ANALYSIS: {
    name: "Gross Margin Analysis",
    icon: <Target className="w-4 h-4" />,
    description: "Product and category margin performance",
  },
  REVENUE_BY_CATEGORY: {
    name: "Revenue by Category",
    icon: <PieChart className="w-4 h-4" />,
    description: "Revenue breakdown by product categories",
  },
  EXPENSE_ANALYSIS: {
    name: "Expense Analysis",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Operating expenses and cost center analysis",
  },

  // Customer Analytics
  CUSTOMER_LIFETIME_VALUE: {
    name: "Customer Lifetime Value",
    icon: <Users className="w-4 h-4" />,
    description: "CLV calculation and customer profitability",
  },
  CUSTOMER_SEGMENTATION: {
    name: "Customer Segmentation",
    icon: <Brain className="w-4 h-4" />,
    description: "Customer grouping by behavior and value",
  },
  SALES_BY_CUSTOMER: {
    name: "Sales by Customer",
    icon: <ShoppingCart className="w-4 h-4" />,
    description: "Customer-level sales performance and trends",
  },
  REPEAT_CUSTOMER_RATE: {
    name: "Repeat Customer Rate",
    icon: <Repeat2 className="w-4 h-4" />,
    description: "Customer retention and loyalty metrics",
  },
  CUSTOMER_ACQUISITION: {
    name: "Customer Acquisition",
    icon: <Zap className="w-4 h-4" />,
    description: "New customer acquisition costs and channels",
  },
  CUSTOMER_RETENTION: {
    name: "Customer Retention",
    icon: <Shield className="w-4 h-4" />,
    description: "Customer churn analysis and retention strategies",
  },

  // Procurement
  SUPPLIER_PERFORMANCE: {
    name: "Supplier Performance",
    icon: <Truck className="w-4 h-4" />,
    description: "Supplier quality, delivery, and cost performance",
  },
  PURCHASE_ORDER_ANALYSIS: {
    name: "Purchase Order Analysis",
    icon: <ClipboardList className="w-4 h-4" />,
    description: "PO volume, value, and cycle time analysis",
  },
  LEAD_TIME_ANALYSIS: {
    name: "Lead Time Analysis",
    icon: <Clock className="w-4 h-4" />,
    description: "Supplier lead times and reliability metrics",
  },
  SUPPLIER_QUALITY: {
    name: "Supplier Quality",
    icon: <Target className="w-4 h-4" />,
    description: "Quality metrics and defect rates by supplier",
  },
  PROCUREMENT_COST: {
    name: "Procurement Cost",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Procurement spending and cost savings analysis",
  },
  VENDOR_MANAGEMENT: {
    name: "Vendor Management",
    icon: <Users className="w-4 h-4" />,
    description: "Vendor portfolio and relationship management",
  },

  // Operations
  OPERATIONAL_EFFICIENCY: {
    name: "Operational Efficiency",
    icon: <Activity className="w-4 h-4" />,
    description: "Overall equipment effectiveness and efficiency metrics",
  },
  THROUGHPUT_ANALYSIS: {
    name: "Throughput Analysis",
    icon: <Zap className="w-4 h-4" />,
    description: "Production throughput and bottleneck identification",
  },
  CAPACITY_UTILIZATION: {
    name: "Capacity Utilization",
    icon: <BarChart className="w-4 h-4" />,
    description: "Resource utilization and capacity planning",
  },
  QUALITY_METRICS: {
    name: "Quality Metrics",
    icon: <Target className="w-4 h-4" />,
    description: "Quality control metrics and defect analysis",
  },
  DOWNTIME_ANALYSIS: {
    name: "Downtime Analysis",
    icon: <Clock className="w-4 h-4" />,
    description: "Equipment downtime and maintenance analysis",
  },
  PRODUCTIVITY_REPORT: {
    name: "Productivity Report",
    icon: <TrendingUp className="w-4 h-4" />,
    description: "Labor productivity and efficiency metrics",
  },

  // Advanced Analytics
  FORECASTING: {
    name: "Demand Forecasting",
    icon: <LineChart className="w-4 h-4" />,
    description: "Predictive demand forecasting and planning",
  },
  TREND_ANALYSIS: {
    name: "Trend Analysis",
    icon: <TrendingUp className="w-4 h-4" />,
    description: "Historical trends and pattern recognition",
  },
  PREDICTIVE_MODELING: {
    name: "Predictive Modeling",
    icon: <Brain className="w-4 h-4" />,
    description: "Machine learning models for business predictions",
  },
  BUSINESS_INTELLIGENCE: {
    name: "Business Intelligence",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Comprehensive BI dashboard with interactive analytics",
  },
  KPI_DASHBOARD: {
    name: "KPI Dashboard",
    icon: <Target className="w-4 h-4" />,
    description: "Key performance indicators and metrics dashboard",
  },
  PERFORMANCE_SCORECARD: {
    name: "Performance Scorecard",
    icon: <Activity className="w-4 h-4" />,
    description: "Balanced scorecard with performance benchmarks",
  },
};

// Define report sections with organized categories
const REPORT_SECTIONS = {
  OVERVIEW: {
    name: "Executive Overview",
    icon: <LayoutDashboard className="w-4 h-4" />,
    description: "Executive dashboards and high-level summaries",
    reports: ["DASHBOARD", "KPI_DASHBOARD", "PERFORMANCE_SCORECARD"] as ReportTab[],
  },
  INVENTORY: {
    name: "Inventory Management",
    icon: <Package className="w-4 h-4" />,
    description: "Inventory tracking, valuation, and optimization",
    reports: [
      "INVENTORY_ON_HAND",
      "INVENTORY_VALUATION",
      "LOW_STOCK",
      "INVENTORY_AGING",
      "STOCK_MOVEMENT",
      "INVENTORY_DISCREPANCY",
      "ABC_ANALYSIS",
    ] as ReportTab[],
  },
  SALES: {
    name: "Sales & Revenue",
    icon: <ShoppingCart className="w-4 h-4" />,
    description: "Sales performance and revenue analytics",
    reports: ["SALES_PERFORMANCE", "REVENUE_BY_CATEGORY", "GROSS_MARGIN_ANALYSIS"] as ReportTab[],
  },
  FINANCIAL: {
    name: "Financial Reports",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Financial statements and profitability analysis",
    reports: ["PROFIT_LOSS", "BALANCE_SHEET", "CASH_FLOW", "COGS", "EXPENSE_ANALYSIS"] as ReportTab[],
  },
  CUSTOMER: {
    name: "Customer Analytics",
    icon: <Users className="w-4 h-4" />,
    description: "Customer behavior and relationship management",
    reports: [
      "CUSTOMER_LIFETIME_VALUE",
      "CUSTOMER_SEGMENTATION",
      "SALES_BY_CUSTOMER",
      "REPEAT_CUSTOMER_RATE",
      "CUSTOMER_ACQUISITION",
      "CUSTOMER_RETENTION",
    ] as ReportTab[],
  },
  PROCUREMENT: {
    name: "Procurement",
    icon: <Truck className="w-4 h-4" />,
    description: "Supplier performance and procurement optimization",
    reports: [
      "SUPPLIER_PERFORMANCE",
      "PURCHASE_ORDER_ANALYSIS",
      "LEAD_TIME_ANALYSIS",
      "SUPPLIER_QUALITY",
      "PROCUREMENT_COST",
      "VENDOR_MANAGEMENT",
    ] as ReportTab[],
  },
  OPERATIONS: {
    name: "Operations",
    icon: <Settings className="w-4 h-4" />,
    description: "Operational efficiency and performance metrics",
    reports: [
      "OPERATIONAL_EFFICIENCY",
      "THROUGHPUT_ANALYSIS",
      "CAPACITY_UTILIZATION",
      "QUALITY_METRICS",
      "DOWNTIME_ANALYSIS",
      "PRODUCTIVITY_REPORT",
      "STOCK_MOVEMENT_TRANSACTION",
    ] as ReportTab[],
  },
  ANALYTICS: {
    name: "Advanced Analytics",
    icon: <Brain className="w-4 h-4" />,
    description: "Predictive analytics and business intelligence",
    reports: [
      "PIVOT_REPORT",
      "FORECASTING",
      "TREND_ANALYSIS",
      "PREDICTIVE_MODELING",
      "BUSINESS_INTELLIGENCE",
    ] as ReportTab[],
  },
} as const;

type ReportSection = keyof typeof REPORT_SECTIONS;

// Create REPORT_TABS from all sections
const REPORT_TABS: ReportTab[] = Object.values(REPORT_SECTIONS).flatMap((section) => section.reports);

export default function Reports() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ReportTab>("DASHBOARD");
  const [activeSection, setActiveSection] = useState<ReportSection>("OVERVIEW");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Handle tab query parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && REPORT_TABS.includes(tabParam as ReportTab)) {
      setActiveTab(tabParam as ReportTab);
      // Set active section based on the tab
      for (const [sectionKey, section] of Object.entries(REPORT_SECTIONS)) {
        if (section.reports.includes(tabParam as ReportTab)) {
          setActiveSection(sectionKey as ReportSection);
          break;
        }
      }
    }
  }, [searchParams]);

  // Update active section when tab changes
  useEffect(() => {
    for (const [sectionKey, section] of Object.entries(REPORT_SECTIONS)) {
      if (section.reports.includes(activeTab)) {
        setActiveSection(sectionKey as ReportSection);
        break;
      }
    }
  }, [activeTab]);

  // Reset to page 1 when filters change
  const resetPagination = () => setCurrentPage(1);

  // Pivot report specific states
  const [pivotTab, setPivotTab] = useState<string>("criteria");
  const [pivotDatePreset, setPivotDatePreset] = useState<string>("last90days");
  const [pivotStartDate, setPivotStartDate] = useState<string>(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [pivotEndDate, setPivotEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [pivotSelectedStores, setPivotSelectedStores] = useState<string[]>([]);
  const [pivotSelectedCategories, setPivotSelectedCategories] = useState<string[]>([]);
  const [pivotSelectedBrands, setPivotSelectedBrands] = useState<string[]>([]);
  const [pivotShowZeroValues, setPivotShowZeroValues] = useState<boolean>(true);
  const [pivotRowField, setPivotRowField] = useState<string>("category");
  const [pivotColumnField, setPivotColumnField] = useState<string>("size");
  const [pivotChartType, setPivotChartType] = useState<"bar" | "pie">("bar");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const {
    inventoryOnHand = [],
    inventoryValuation = [],
    lowStock = [],
    inventoryAging = [],
    stockMovement = [],
    abcAnalysis = [],
    salesPerformance = [],
    cogs = [],
    recentAdjustments = [],
    stockMovementTransaction = [],
    stores = [],
    categories = [],
    brands = [],
    isLoading,
    error,
  } = useReportsData();

  // Date preset handler
  const handleDatePreset = (preset: string) => {
    setPivotDatePreset(preset);
    const today = new Date();
    switch (preset) {
      case "today":
        setPivotStartDate(format(startOfDay(today), "yyyy-MM-dd"));
        setPivotEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "last7days":
        setPivotStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
        setPivotEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "thismonth":
        setPivotStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
        setPivotEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "last90days":
        setPivotStartDate(format(subDays(today, 90), "yyyy-MM-dd"));
        setPivotEndDate(format(today, "yyyy-MM-dd"));
        break;
    }
  };

  // Generate advanced pivot data
  const generateAdvancedPivotData = () => {
    if (!inventoryOnHand || inventoryOnHand.length === 0) return { data: [], chartData: [] };

    // Apply filters with proper typing
    let filteredItems = (inventoryOnHand as any[]).filter((item: any) => {
      if (pivotSelectedStores.length > 0 && !pivotSelectedStores.includes(item.location)) return false;
      if (pivotSelectedCategories.length > 0 && !pivotSelectedCategories.includes(item.category)) return false;
      if (pivotSelectedBrands.length > 0 && !pivotSelectedBrands.includes(item.brand)) return false;
      return true;
    });

    // Group by row field and column field
    const pivotMap: Record<string, Record<string, any>> = {};

    (filteredItems as any[]).forEach((item: any) => {
      const rowKey = item[pivotRowField] || "Unknown";
      const colKey = item[pivotColumnField] || "N/A";
      const brandKey = item.brand || "Unknown Brand";

      // Initialize row
      if (!pivotMap[rowKey]) {
        pivotMap[rowKey] = {
          rowField: rowKey,
          columns: {},
          totalQty: 0,
          totalSales: 0,
          totalCost: 0,
          totalRefund: 0,
          brands: {},
        };
      }

      // Initialize column
      if (!pivotMap[rowKey].columns[colKey]) {
        pivotMap[rowKey].columns[colKey] = {
          qty: 0,
          sales: 0,
          cost: 0,
          refund: 0,
          count: 0,
        };
      }

      // Initialize brand under row
      if (!pivotMap[rowKey].brands[brandKey]) {
        pivotMap[rowKey].brands[brandKey] = {
          brandName: brandKey,
          columns: {},
          totalQty: 0,
          totalSales: 0,
          totalCost: 0,
          totalRefund: 0,
        };
      }

      // Initialize brand column
      if (!pivotMap[rowKey].brands[brandKey].columns[colKey]) {
        pivotMap[rowKey].brands[brandKey].columns[colKey] = {
          qty: 0,
          sales: 0,
          cost: 0,
          refund: 0,
          count: 0,
        };
      }

      // Aggregate data
      const qty = item.quantity || 0;
      const costPrice = parseFloat(item.cost_price) || 0;
      const sellingPrice = parseFloat(item.selling_price) || 0;
      const sales = qty * sellingPrice;
      const cost = qty * costPrice;
      const refund = sales * 0.02; // Simulated 2% refund rate

      // Row totals
      pivotMap[rowKey].totalQty += qty;
      pivotMap[rowKey].totalSales += sales;
      pivotMap[rowKey].totalCost += cost;
      pivotMap[rowKey].totalRefund += refund;

      // Column data
      pivotMap[rowKey].columns[colKey].qty += qty;
      pivotMap[rowKey].columns[colKey].sales += sales;
      pivotMap[rowKey].columns[colKey].cost += cost;
      pivotMap[rowKey].columns[colKey].refund += refund;
      pivotMap[rowKey].columns[colKey].count += 1;

      // Brand totals
      pivotMap[rowKey].brands[brandKey].totalQty += qty;
      pivotMap[rowKey].brands[brandKey].totalSales += sales;
      pivotMap[rowKey].brands[brandKey].totalCost += cost;
      pivotMap[rowKey].brands[brandKey].totalRefund += refund;

      // Brand column data
      pivotMap[rowKey].brands[brandKey].columns[colKey].qty += qty;
      pivotMap[rowKey].brands[brandKey].columns[colKey].sales += sales;
      pivotMap[rowKey].brands[brandKey].columns[colKey].cost += cost;
      pivotMap[rowKey].brands[brandKey].columns[colKey].refund += refund;
      pivotMap[rowKey].brands[brandKey].columns[colKey].count += 1;
    });

    // Convert to array and filter zero values
    const data = Object.values(pivotMap).filter((row) => pivotShowZeroValues || row.totalSales > 0);

    // Generate chart data
    const chartData = data.map((row) => ({
      name: row.rowField,
      grossMargin: row.totalSales - row.totalCost,
      sales: row.totalSales,
      cost: row.totalCost,
    }));

    return { data, chartData };
  };

  const { data: pivotData, chartData: pivotChartData } = useMemo(
    () => generateAdvancedPivotData(),
    [
      inventoryOnHand,
      pivotRowField,
      pivotColumnField,
      pivotSelectedStores,
      pivotSelectedCategories,
      pivotSelectedBrands,
      pivotShowZeroValues,
    ],
  );

  // Filtered data based on active tab, search, and date
  const filteredData = useMemo(() => {
    let data: any[] = [];

    switch (activeTab) {
      case "INVENTORY_ON_HAND":
        data = inventoryOnHand || [];
        break;
      case "INVENTORY_VALUATION":
        data = inventoryValuation || [];
        break;
      case "LOW_STOCK":
        data = lowStock || [];
        break;
      case "INVENTORY_AGING":
        data = inventoryAging || [];
        break;
      case "STOCK_MOVEMENT":
        data = stockMovement || [];
        break;
      case "INVENTORY_DISCREPANCY":
        data = recentAdjustments || [];
        break;
      case "ABC_ANALYSIS":
        data = abcAnalysis || [];
        break;
      case "COGS":
        data = cogs || [];
        break;
      case "SALES_PERFORMANCE":
        data = salesPerformance || [];
        break;
      case "STOCK_MOVEMENT_TRANSACTION":
        data = stockMovementTransaction || [];
        break;
      case "PIVOT_REPORT":
        data = pivotData || [];
        break;
      // Add cases for new reports here
      default:
        data = [];
    }

    // Apply search filter
    if (search) {
      data = (data || []).filter((item) =>
        Object.values(item).some((val) => val?.toString().toLowerCase().includes(search.toLowerCase())),
      );
    }

    // Apply store filter
    if (selectedStore !== "all") {
      data = (data || []).filter((item) => item.location === selectedStore || item.store_name === selectedStore);
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      data = (data || []).filter((item) => item.category === selectedCategory);
    }

    // Apply brand filter
    if (selectedBrand !== "all") {
      data = (data || []).filter((item) => item.brand === selectedBrand);
    }

    // Apply date filter
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      data = (data || []).filter((item) => {
        const itemDate = new Date(item.created_at || item.date || item.sale_date);
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    return data || [];
  }, [
    activeTab,
    search,
    startDate,
    endDate,
    selectedStore,
    selectedCategory,
    selectedBrand,
    inventoryOnHand,
    inventoryValuation,
    lowStock,
    inventoryAging,
    stockMovement,
    abcAnalysis,
    salesPerformance,
    cogs,
    recentAdjustments,
    stockMovementTransaction,
    pivotData,
  ]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Reset pagination when filters change
  React.useEffect(() => {
    resetPagination();
  }, [activeTab, search, startDate, endDate, selectedStore, selectedCategory, selectedBrand]);

  // CSV export
  const exportCSV = () => {
    if (!filteredData || filteredData.length === 0) return;
    const headers = Object.keys(filteredData[0]);
    const csvRows = [
      headers.join(","),
      ...filteredData.map((row) => headers.map((field) => `"${row[field] ?? ""}"`).join(",")),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NOW we can do early returns AFTER all hooks are defined
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error) {
    // The error message comes from the useReportsData hook
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading reports: {(error as Error).message}</div>
      </div>
    );
  }

  // Render table helper
  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return <p>No data available.</p>;

    // Filter out columns with "id" in the name (case insensitive)
    const columns = Object.keys(data[0]).filter((key) => !key.toLowerCase().includes("id"));

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border border-border">
            <thead className="bg-muted">
              <tr>
                {columns.map((key) => (
                  <th key={key} className="border border-border p-3 text-left font-semibold">
                    {key.replace(/_/g, " ").toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/50">
                  {columns.map((key, i) => (
                    <td key={i} className="border border-border p-3">
                      {row[key]?.toString() ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActiveReport = () => {
    if (activeTab === "DASHBOARD") {
      return (
        <div className="p-6 text-center text-muted-foreground">
          <LayoutDashboard className="mx-auto h-8 w-8 mb-4" />
          <h2 className="text-xl font-semibold">Executive Dashboard</h2>
          <p>Select a report from the menu above to view detailed analytics.</p>
        </div>
      );
    }

    if (activeTab === "PIVOT_REPORT") {
      const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

      const toggleRowExpansion = (rowKey: string) => {
        setExpandedRows((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(rowKey)) {
            newSet.delete(rowKey);
          } else {
            newSet.add(rowKey);
          }
          return newSet;
        });
      };

      const uniqueColumns = [
        ...new Set((pivotData || []).flatMap((row: any) => Object.keys(row.columns || {}))),
      ].sort();

      return (
        <div className="space-y-6">
          <Tabs value={pivotTab} onValueChange={setPivotTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="criteria">Criteria</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="results">Search Results</TabsTrigger>
            </TabsList>

            <TabsContent value="criteria" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Date Range</h3>
                  <div className="flex gap-2 flex-wrap">
                    {["today", "last7days", "thismonth", "last90days"].map((preset) => (
                      <Button
                        key={preset}
                        variant={pivotDatePreset === preset ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDatePreset(preset)}
                      >
                        {preset === "today" && "Today"}
                        {preset === "last7days" && "Last 7 Days"}
                        {preset === "thismonth" && "This Month"}
                        {preset === "last90days" && "Last 90 Days"}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <input
                        type="date"
                        value={pivotStartDate}
                        onChange={(e) => setPivotStartDate(e.target.value)}
                        className="w-full border border-border rounded-md p-2 bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <input
                        type="date"
                        value={pivotEndDate}
                        onChange={(e) => setPivotEndDate(e.target.value)}
                        className="w-full border border-border rounded-md p-2 bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Store Filter</Label>
                    <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                      {stores.map((store) => (
                        <div key={store} className="flex items-center space-x-2">
                          <Checkbox
                            id={`store-${store}`}
                            checked={pivotSelectedStores.includes(store)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPivotSelectedStores([...pivotSelectedStores, store]);
                              } else {
                                setPivotSelectedStores(pivotSelectedStores.filter((s) => s !== store));
                              }
                            }}
                          />
                          <label htmlFor={`store-${store}`} className="text-sm cursor-pointer">
                            {store}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Category Filter</Label>
                  <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {categories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={pivotSelectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPivotSelectedCategories([...pivotSelectedCategories, category]);
                            } else {
                              setPivotSelectedCategories(pivotSelectedCategories.filter((c) => c !== category));
                            }
                          }}
                        />
                        <label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Brand Filter</Label>
                  <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {brands.map((brand) => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand}`}
                          checked={pivotSelectedBrands.includes(brand)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPivotSelectedBrands([...pivotSelectedBrands, brand]);
                            } else {
                              setPivotSelectedBrands(pivotSelectedBrands.filter((b) => b !== brand));
                            }
                          }}
                        />
                        <label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-zero"
                  checked={pivotShowZeroValues}
                  onCheckedChange={(checked) => setPivotShowZeroValues(checked as boolean)}
                />
                <label htmlFor="show-zero" className="text-sm cursor-pointer">
                  Display zero values
                </label>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Row Fields (Primary Grouping)</Label>
                  <select
                    value={pivotRowField}
                    onChange={(e) => setPivotRowField(e.target.value)}
                    className="w-full border border-border rounded-md p-2 bg-background"
                  >
                    <option value="category">Category</option>
                    <option value="department">Department</option>
                    <option value="main_group">Main Group</option>
                    <option value="location">Location</option>
                    <option value="supplier">Supplier</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Items will be grouped by this field, with drill-down by Brand
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Column Fields (Comparative Analysis)</Label>
                  <select
                    value={pivotColumnField}
                    onChange={(e) => setPivotColumnField(e.target.value)}
                    className="w-full border border-border rounded-md p-2 bg-background"
                  >
                    <option value="size">Size</option>
                    <option value="color">Color</option>
                    <option value="season">Season</option>
                    <option value="gender">Gender</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Data will be compared side-by-side across these attributes
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Data Fields (Calculations)</Label>
                <div className="border border-border rounded-md p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Primary Metrics (SUM):</p>
                      <ul className="list-disc list-inside text-muted-foreground mt-1">
                        <li>Qty Sold</li>
                        <li>Sales Amount</li>
                        <li>Refund Amount</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Advanced Metrics:</p>
                      <ul className="list-disc list-inside text-muted-foreground mt-1">
                        <li>Gross Margin (SUM)</li>
                        <li>Margin % (AVERAGE)</li>
                        <li>Avg Selling Price (AVERAGE)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">{(pivotData || []).length} group(s) found</div>
                <div className="flex gap-2">
                  <Button
                    variant={pivotChartType === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPivotChartType("bar")}
                  >
                    Bar Chart
                  </Button>
                  <Button
                    variant={pivotChartType === "pie" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPivotChartType("pie")}
                  >
                    Pie Chart
                  </Button>
                  <Button onClick={exportCSV} size="sm">
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Chart Visualization */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Gross Margin by {pivotRowField}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    {pivotChartType === "bar" ? (
                      <RechartsBarChart data={pivotChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="grossMargin" fill="#8884d8" name="Gross Margin" />
                        <Bar dataKey="sales" fill="#82ca9d" name="Sales" />
                        <Bar dataKey="cost" fill="#ffc658" name="Cost" />
                      </RechartsBarChart>
                    ) : (
                      <RechartsPieChart>
                        <Pie
                          data={pivotChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: $${entry.grossMargin.toFixed(0)}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="grossMargin"
                        >
                          {(pivotChartData || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Interactive Data Grid */}
              <div className="overflow-x-auto border border-border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="border border-border p-3 text-left font-semibold sticky left-0 bg-muted">
                        {pivotRowField.toUpperCase()}
                      </th>
                      {uniqueColumns.map((col) => (
                        <th key={col} className="border border-border p-3 text-center font-semibold">
                          {col}
                        </th>
                      ))}
                      <th className="border border-border p-3 text-center font-semibold">Total Qty</th>
                      <th className="border border-border p-3 text-center font-semibold">Sales</th>
                      <th className="border border-border p-3 text-center font-semibold">Cost</th>
                      <th className="border border-border p-3 text-center font-semibold">Gross Margin</th>
                      <th className="border border-border p-3 text-center font-semibold">Margin %</th>
                      <th className="border border-border p-3 text-center font-semibold">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pivotData || []).map((row: any, idx: number) => {
                      const isExpanded = expandedRows.has(row.rowField);
                      const grossMargin = row.totalSales - row.totalCost;
                      const marginPercent = row.totalSales > 0 ? (grossMargin / row.totalSales) * 100 : 0;
                      const avgPrice = row.totalQty > 0 ? row.totalSales / row.totalQty : 0;

                      return (
                        <React.Fragment key={idx}>
                          <tr
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleRowExpansion(row.rowField)}
                          >
                            <td className="border border-border p-3 font-medium sticky left-0 bg-background">
                              <span className="inline-block mr-2">{isExpanded ? "▼" : "►"}</span>
                              {row.rowField}
                            </td>
                            {uniqueColumns.map((col) => (
                              <td key={col} className="border border-border p-3 text-center">
                                {row.columns?.[col]?.qty || 0}
                              </td>
                            ))}
                            <td className="border border-border p-3 text-center font-medium">{row.totalQty}</td>
                            <td className="border border-border p-3 text-center">${row.totalSales.toFixed(2)}</td>
                            <td className="border border-border p-3 text-center">${row.totalCost.toFixed(2)}</td>
                            <td className="border border-border p-3 text-center font-medium text-green-600">
                              ${grossMargin.toFixed(2)}
                            </td>
                            <td className="border border-border p-3 text-center">{marginPercent.toFixed(1)}%</td>
                            <td className="border border-border p-3 text-center">${avgPrice.toFixed(2)}</td>
                          </tr>

                          {/* Brand drill-down rows */}
                          {isExpanded &&
                            Object.values(row.brands || {}).map((brand: any, brandIdx: number) => {
                              const brandGrossMargin = brand.totalSales - brand.totalCost;
                              const brandMarginPercent =
                                brand.totalSales > 0 ? (brandGrossMargin / brand.totalSales) * 100 : 0;
                              const brandAvgPrice = brand.totalQty > 0 ? brand.totalSales / brand.totalQty : 0;

                              return (
                                <tr key={brandIdx} className="bg-muted/30">
                                  <td className="border border-border p-3 pl-8 text-sm sticky left-0 bg-muted/30">
                                    {brand.brandName}
                                  </td>
                                  {uniqueColumns.map((col) => (
                                    <td key={col} className="border border-border p-3 text-center text-sm">
                                      {brand.columns?.[col]?.qty || 0}
                                    </td>
                                  ))}
                                  <td className="border border-border p-3 text-center text-sm">{brand.totalQty}</td>
                                  <td className="border border-border p-3 text-center text-sm">
                                    ${brand.totalSales.toFixed(2)}
                                  </td>
                                  <td className="border border-border p-3 text-center text-sm">
                                    ${brand.totalCost.toFixed(2)}
                                  </td>
                                  <td className="border border-border p-3 text-center text-sm text-green-600">
                                    ${brandGrossMargin.toFixed(2)}
                                  </td>
                                  <td className="border border-border p-3 text-center text-sm">
                                    {brandMarginPercent.toFixed(1)}%
                                  </td>
                                  <td className="border border-border p-3 text-center text-sm">
                                    ${brandAvgPrice.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // For new reports, you can add specific rendering logic here
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{filteredData.length} record(s) found</div>
          <Button onClick={exportCSV}>Export CSV</Button>
        </div>
        {renderTable(paginatedData)}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Analytics Suite</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence and reporting platform</p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(REPORT_SECTIONS).map(([sectionKey, section]) => (
            <Card
              key={sectionKey}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeSection === sectionKey
                  ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
              onClick={() => {
                setActiveSection(sectionKey as ReportSection);
                setActiveTab(section.reports[0]);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      activeSection === sectionKey
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {section.icon}
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-sm ${
                        activeSection === sectionKey ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {section.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {section.reports.length} report{section.reports.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Tabs within Active Section */}
        <div className="border-b">
          <div className="flex flex-wrap gap-1">
            {REPORT_SECTIONS[activeSection].reports.map((reportKey) => (
              <Button
                key={reportKey}
                variant="ghost"
                onClick={() => setActiveTab(reportKey)}
                className={`flex items-center gap-2 rounded-none border-b-2 transition-all ${
                  activeTab === reportKey
                    ? "border-primary text-primary bg-primary/10 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {REPORT_CONFIG[reportKey].icon}
                {REPORT_CONFIG[reportKey].name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Report Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                {REPORT_CONFIG[activeTab].icon}
                {REPORT_CONFIG[activeTab].name}
              </h2>
              <p className="text-muted-foreground mt-1">{REPORT_CONFIG[activeTab].description}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search">Search</Label>
              <input
                id="search"
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              />
            </div>

            <div>
              <Label htmlFor="store">Store</Label>
              <select
                id="store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              >
                <option value="all">All Stores</option>
                {stores.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              >
                <option value="all">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              />
            </div>
          </div>

          {/* Active Report Content */}
          {renderActiveReport()}
        </CardContent>
      </Card>
    </div>
  );
}
