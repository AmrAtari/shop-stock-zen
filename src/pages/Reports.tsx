// src/pages/Reports.tsx

import React, { useState, useMemo } from "react";
import { useReportsData } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, TrendingUp, DollarSign, Repeat2, BarChart } from "lucide-react";
import { format } from "date-fns";

const REPORT_TABS = [
  "DASHBOARD",
  "INVENTORY_ON_HAND",
  "INVENTORY_VALUATION",
  "LOW_STOCK",
  "INVENTORY_AGING",
  "STOCK_MOVEMENT",
  "INVENTORY_DISCREPANCY",
  "ABC_ANALYSIS",
  "COGS",
  "SALES_PERFORMANCE",
  "PIVOT_REPORT",
  "STOCK_MOVEMENT_TRANSACTION",
] as const;

type ReportTab = (typeof REPORT_TABS)[number];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>("DASHBOARD");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  
  // Pivot report specific states
  const [pivotGroupBy, setPivotGroupBy] = useState<string>("category");
  const [pivotMetric, setPivotMetric] = useState<string>("quantity");
  const [pivotAggregation, setPivotAggregation] = useState<string>("sum");

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
        data = generatePivotData();
        break;
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
    pivotGroupBy,
    pivotMetric,
    pivotAggregation,
  ]);
  
  // Generate pivot data based on selections
  const generatePivotData = () => {
    if (!inventoryOnHand || inventoryOnHand.length === 0) return [];
    
    const grouped: Record<string, any> = {};
    
    inventoryOnHand.forEach((item: any) => {
      const groupKey = item[pivotGroupBy] || "Unknown";
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          [pivotGroupBy]: groupKey,
          count: 0,
          total_quantity: 0,
          total_cost: 0,
          total_value: 0,
          avg_quantity: 0,
          avg_cost: 0,
          avg_selling: 0,
          max_quantity: 0,
          min_quantity: Infinity,
        };
      }
      
      grouped[groupKey].count += 1;
      grouped[groupKey].total_quantity += item.quantity || 0;
      grouped[groupKey].total_cost += (item.quantity || 0) * (item.cost_price || 0);
      grouped[groupKey].total_value += (item.quantity || 0) * (item.selling_price || 0);
      grouped[groupKey].max_quantity = Math.max(grouped[groupKey].max_quantity, item.quantity || 0);
      grouped[groupKey].min_quantity = Math.min(grouped[groupKey].min_quantity, item.quantity || 0);
    });
    
    // Calculate averages
    Object.keys(grouped).forEach(key => {
      if (grouped[key].count > 0) {
        grouped[key].avg_quantity = grouped[key].total_quantity / grouped[key].count;
        grouped[key].avg_cost = grouped[key].total_cost / grouped[key].total_quantity || 0;
        grouped[key].avg_selling = grouped[key].total_value / grouped[key].total_quantity || 0;
      }
      // Round values
      grouped[key].total_cost = grouped[key].total_cost.toFixed(2);
      grouped[key].total_value = grouped[key].total_value.toFixed(2);
      grouped[key].avg_quantity = grouped[key].avg_quantity.toFixed(2);
      grouped[key].avg_cost = grouped[key].avg_cost.toFixed(2);
      grouped[key].avg_selling = grouped[key].avg_selling.toFixed(2);
    });
    
    return Object.values(grouped);
  };

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
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading reports: {(error as Error).message}</div>
      </div>
    );
  }

  // Reset to page 1 when filters change
  const resetPagination = () => setCurrentPage(1);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Render table helper
  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return <p>No data available.</p>;
    
    // Filter out columns with "id" in the name (case insensitive)
    const columns = Object.keys(data[0]).filter(key => !key.toLowerCase().includes('id'));
    
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border border-border">
            <thead className="bg-muted">
              <tr>
                {columns.map((key) => (
                  <th key={key} className="border border-border p-3 text-left font-semibold">
                    {key.replace(/_/g, ' ').toUpperCase()}
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
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
          <h2 className="text-xl font-semibold">Reports Dashboard</h2>
          <p>Select a report from the menu above to view detailed analytics.</p>
        </div>
      );
    }
    
    if (activeTab === "PIVOT_REPORT") {
      return (
        <div>
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Group By</label>
                <select
                  value={pivotGroupBy}
                  onChange={(e) => setPivotGroupBy(e.target.value)}
                  className="w-full border border-border rounded-md p-2 bg-background"
                >
                  <option value="category">Category</option>
                  <option value="brand">Brand</option>
                  <option value="location">Store/Location</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Metric</label>
                <select
                  value={pivotMetric}
                  onChange={(e) => setPivotMetric(e.target.value)}
                  className="w-full border border-border rounded-md p-2 bg-background"
                >
                  <option value="quantity">Quantity</option>
                  <option value="cost_price">Cost Price</option>
                  <option value="selling_price">Selling Price</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Aggregation</label>
                <select
                  value={pivotAggregation}
                  onChange={(e) => setPivotAggregation(e.target.value)}
                  className="w-full border border-border rounded-md p-2 bg-background"
                >
                  <option value="sum">Sum</option>
                  <option value="count">Count</option>
                  <option value="average">Average</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedData.length} of {filteredData.length} results
              </div>
              <Button onClick={exportCSV}>Export CSV</Button>
            </div>
          </div>
          {renderTable(paginatedData)}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Store</label>
              <select
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-border rounded-md p-2 bg-background"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand</label>
              <select
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
            <div className="flex items-end">
              <Button onClick={exportCSV} className="w-full">
                Export CSV
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {paginatedData.length} of {filteredData.length} results
          </div>
        </div>
        {renderTable(paginatedData)}
      </div>
    );
  };

  const reportButtons: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: "DASHBOARD", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
    { key: "INVENTORY_ON_HAND", label: "On-Hand", icon: <BarChart className="w-4 h-4 mr-2" /> },
    { key: "INVENTORY_VALUATION", label: "Valuation", icon: <DollarSign className="w-4 h-4 mr-2" /> },
    { key: "LOW_STOCK", label: "Low Stock", icon: <Repeat2 className="w-4 h-4 mr-2" /> },
    { key: "INVENTORY_AGING", label: "Aging", icon: <TrendingUp className="w-4 h-4 mr-2" /> },
    { key: "STOCK_MOVEMENT", label: "Movement", icon: <TrendingUp className="w-4 h-4 mr-2" /> },
    { key: "INVENTORY_DISCREPANCY", label: "Discrepancy", icon: <Repeat2 className="w-4 h-4 mr-2" /> },
    { key: "ABC_ANALYSIS", label: "ABC Analysis", icon: <BarChart className="w-4 h-4 mr-2" /> },
    { key: "COGS", label: "COGS", icon: <DollarSign className="w-4 h-4 mr-2" /> },
    { key: "SALES_PERFORMANCE", label: "Sales", icon: <TrendingUp className="w-4 h-4 mr-2" /> },
    { key: "PIVOT_REPORT", label: "Pivot Report", icon: <BarChart className="w-4 h-4 mr-2" /> },
    { key: "STOCK_MOVEMENT_TRANSACTION", label: "Stock Transactions", icon: <Repeat2 className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Inventory Reports</h1>
      <p className="text-muted-foreground mt-1">
        Select a detailed report to analyze inventory health and profitability.
      </p>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {reportButtons.map(({ key, label, icon }) => (
          <Button key={key} variant={activeTab === key ? "default" : "outline"} onClick={() => setActiveTab(key)}>
            {icon}
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">{renderActiveReport()}</CardContent>
      </Card>
    </div>
  );
}
