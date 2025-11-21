import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { exportToCSV } from "@/utils/reportExport";

const CashFlow = () => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    operating: true,
    investing: true,
    financing: true,
  });

  const handleExport = () => {
    if (!cashFlowData) return;
    
    const exportData = [
      { Section: "Operating Activities", Inflows: cashFlowData.operating.inflows, Outflows: cashFlowData.operating.outflows, Net: cashFlowData.operating.net },
      { Section: "Investing Activities", Inflows: cashFlowData.investing.inflows, Outflows: cashFlowData.investing.outflows, Net: cashFlowData.investing.net },
      { Section: "Financing Activities", Inflows: cashFlowData.financing.inflows, Outflows: cashFlowData.financing.outflows, Net: cashFlowData.financing.net },
      { Section: "Net Cash Flow", Inflows: "-", Outflows: "-", Net: cashFlowData.netCashFlow },
    ];
    
    exportToCSV(exportData, `cash_flow_${format(dateRange.from!, "yyyy-MM-dd")}_to_${format(dateRange.to!, "yyyy-MM-dd")}`);
  };

  const { data: cashFlowData, isLoading } = useQuery({
    queryKey: ["cash_flow", dateRange],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return null;

      // Get all posted journal entries in the date range
      const { data: journalLines, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entry:journal_entries!inner(
            entry_number,
            entry_date,
            entry_type,
            description,
            status
          ),
          account:accounts!inner(
            account_code,
            account_name,
            account_type
          )
        `)
        .eq("journal_entry.status", "posted")
        .gte("journal_entry.entry_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("journal_entry.entry_date", format(dateRange.to, "yyyy-MM-dd"));

      if (error) throw error;

      // Simplified cash flow calculation
      // Operating Activities: Revenue and Operating Expenses
      const operating = journalLines.filter((line: any) =>
        ["revenue", "expense", "cogs"].includes(line.account.account_type)
      );

      const operatingInflows = operating
        .filter((l: any) => l.account.account_type === "revenue")
        .reduce((sum: number, l: any) => sum + Number(l.credit_amount || 0) - Number(l.debit_amount || 0), 0);

      const operatingOutflows = operating
        .filter((l: any) => ["expense", "cogs"].includes(l.account.account_type))
        .reduce((sum: number, l: any) => sum + Number(l.debit_amount || 0) - Number(l.credit_amount || 0), 0);

      const netOperatingCashFlow = operatingInflows - operatingOutflows;

      // Investing Activities: Asset purchases/sales
      const investing = journalLines.filter((line: any) =>
        line.account.account_type === "asset" &&
        !line.account.account_name.toLowerCase().includes("cash") &&
        !line.account.account_name.toLowerCase().includes("receivable")
      );

      const investingOutflows = investing.reduce(
        (sum: number, l: any) => sum + Number(l.debit_amount || 0),
        0
      );
      const investingInflows = investing.reduce(
        (sum: number, l: any) => sum + Number(l.credit_amount || 0),
        0
      );
      const netInvestingCashFlow = investingInflows - investingOutflows;

      // Financing Activities: Liabilities and Equity
      const financing = journalLines.filter((line: any) =>
        ["liability", "equity"].includes(line.account.account_type)
      );

      const financingInflows = financing.reduce(
        (sum: number, l: any) => sum + Number(l.credit_amount || 0),
        0
      );
      const financingOutflows = financing.reduce(
        (sum: number, l: any) => sum + Number(l.debit_amount || 0),
        0
      );
      const netFinancingCashFlow = financingInflows - financingOutflows;

      const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

      return {
        operating: {
          inflows: operatingInflows,
          outflows: operatingOutflows,
          net: netOperatingCashFlow,
        },
        investing: {
          inflows: investingInflows,
          outflows: investingOutflows,
          net: netInvestingCashFlow,
        },
        financing: {
          inflows: financingInflows,
          outflows: financingOutflows,
          net: netFinancingCashFlow,
        },
        netCashFlow,
      };
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const CashFlowSection = ({ title, data, sectionKey }: any) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="space-y-2">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2 font-semibold text-lg">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {title}
          </div>
          <span className={cn(
            "font-semibold",
            data.net >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(data.net, currency)}
          </span>
        </div>

        {isExpanded && (
          <div className="ml-6 space-y-1">
            <div className="flex items-center justify-between p-2 text-sm">
              <span>Cash Inflows</span>
              <span className="font-mono text-green-600">
                {formatCurrency(data.inflows, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 text-sm">
              <span>Cash Outflows</span>
              <span className="font-mono text-red-600">
                ({formatCurrency(data.outflows, currency)})
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash Flow Statement</h1>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateRange.from && dateRange.to
                  ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                  : "Select date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Cash Flow Statement
            {dateRange.from && dateRange.to && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {format(dateRange.from, "MMMM dd, yyyy")} - {format(dateRange.to, "MMMM dd, yyyy")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !cashFlowData ? (
            <div className="text-center py-8">No data available</div>
          ) : (
            <div className="space-y-6">
              {/* Operating Activities */}
              <CashFlowSection
                title="Cash Flow from Operating Activities"
                data={cashFlowData.operating}
                sectionKey="operating"
              />

              {/* Investing Activities */}
              <CashFlowSection
                title="Cash Flow from Investing Activities"
                data={cashFlowData.investing}
                sectionKey="investing"
              />

              {/* Financing Activities */}
              <CashFlowSection
                title="Cash Flow from Financing Activities"
                data={cashFlowData.financing}
                sectionKey="financing"
              />

              {/* Net Cash Flow */}
              <div className="border-t-2 pt-4">
                <div className={cn(
                  "flex justify-between font-bold text-xl p-4 rounded",
                  cashFlowData.netCashFlow >= 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                )}>
                  <span>Net Increase/(Decrease) in Cash</span>
                  <span className="font-mono">
                    {formatCurrency(cashFlowData.netCashFlow, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlow;
