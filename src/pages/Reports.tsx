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
  ]);

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

  // Render table helper
  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return <p>No data available.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300">
          <thead>
            <tr>
              {Object.keys(data[0]).map((key) => (
                <th key={key} className="border p-2">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row, idx) => (
              <tr key={idx}>
                {Object.values(row).map((val, i) => (
                  <td key={i} className="border p-2">
                    {val?.toString() ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
            Showing {filteredData.length} results
          </div>
        </div>
        {renderTable(filteredData)}
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
