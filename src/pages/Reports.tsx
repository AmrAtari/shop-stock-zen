// src/pages/Reports.tsx

import React, { useState } from "react";
import { useReportsData } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, TrendingUp, DollarSign, Repeat2, BarChart } from "lucide-react";

// Import the individual components (you'll need to create these)
// import { ProfitMarginTable } from "@/components/ProfitMarginTable";
// import { StockMovementChart } from "@/components/StockMovementChart";
// import { AdjustmentsTable } from "@/components/AdjustmentsTable";
// import { CategoryValueChart } from "@/components/CategoryValueChart";

// Define possible report views
const REPORT_VIEWS = {
  DASHBOARD: "Dashboard",
  PROFIT_MARGINS: "Profit Margins",
  STOCK_MOVEMENT: "Stock Movement",
  RECENT_ADJUSTMENTS: "Recent Adjustments",
  CATEGORY_VALUE: "Inventory Value",
} as const;

type ReportView = keyof typeof REPORT_VIEWS;

const Reports = () => {
  // State to track which report is currently selected
  const [activeReport, setActiveReport] = useState<ReportView>("DASHBOARD");

  // Fetch all data once
  const { categoryValue, stockMovement, profitMargins, recentAdjustments, isLoading, error } = useReportsData();

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

  // Function to render the active report component
  const renderActiveReport = () => {
    switch (activeReport) {
      case "PROFIT_MARGINS":
        return (
          <div className="p-6 text-center text-muted-foreground">
            <DollarSign className="mx-auto h-8 w-8 mb-4" />
            <h2 className="text-xl font-semibold">Profit Margin Analysis</h2>
            <p>Displaying {profitMargins?.length || 0} items with profit data.</p>
            <p className="text-sm mt-2">Component coming soon...</p>
          </div>
        );

      // NOTE: You would implement and link other components here
      // case 'STOCK_MOVEMENT':
      //     return <StockMovementChart stockMovement={stockMovement} />;

      case "DASHBOARD":
      default:
        // Default view shows key metrics or a static message
        return (
          <div className="p-6 text-center text-muted-foreground">
            <LayoutDashboard className="mx-auto h-8 w-8 mb-4" />
            <h2 className="text-xl font-semibold">Reports Dashboard</h2>
            <p>Select a report from the menu above to view detailed analytics.</p>
            {/* Optional: Render your two charts here as a mini-dashboard */}
          </div>
        );
    }
  };

  const reportButtons: { key: ReportView; label: string; icon: React.ReactNode }[] = [
    { key: "DASHBOARD", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
    { key: "PROFIT_MARGINS", label: "Profit Analysis", icon: <DollarSign className="w-4 h-4 mr-2" /> },
    { key: "STOCK_MOVEMENT", label: "Movement Trend", icon: <TrendingUp className="w-4 h-4 mr-2" /> },
    { key: "RECENT_ADJUSTMENTS", label: "Recent Adjustments", icon: <Repeat2 className="w-4 h-4 mr-2" /> },
    { key: "CATEGORY_VALUE", label: "Inventory Value", icon: <BarChart className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Inventory Reports</h1>
      <p className="text-muted-foreground mt-1">
        Select a detailed report to analyze inventory health and profitability.
      </p>

      {/* REPORT SELECTION BUTTONS */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {reportButtons.map(({ key, label, icon }) => (
          <Button key={key} variant={activeReport === key ? "default" : "outline"} onClick={() => setActiveReport(key)}>
            {icon}
            {label}
          </Button>
        ))}
      </div>

      {/* REPORT CONTENT AREA */}
      <Card>
        <CardContent className="p-6">{renderActiveReport()}</CardContent>
      </Card>
    </div>
  );
};

export default Reports;
