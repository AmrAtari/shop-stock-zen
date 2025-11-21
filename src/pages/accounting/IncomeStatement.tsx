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
import { exportToCSV, formatReportData } from "@/utils/reportExport";

const IncomeStatement = () => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    cogs: true,
    expense: true,
  });

  const handleExport = () => {
    if (!incomeStatementData) return;
    
    const allAccounts = [
      ...incomeStatementData.revenue,
      ...incomeStatementData.cogs,
      ...incomeStatementData.expenses
    ];
    
    const formattedData = formatReportData(allAccounts, "income_statement");
    exportToCSV(formattedData, `income_statement_${format(dateRange.from!, "yyyy-MM-dd")}_to_${format(dateRange.to!, "yyyy-MM-dd")}`);
  };

  const { data: incomeStatementData, isLoading } = useQuery({
    queryKey: ["income_statement", dateRange],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return null;

      // Get all revenue, COGS, and expense accounts
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .in("account_type", ["revenue", "cogs", "expense"])
        .eq("is_active", true)
        .order("account_code");

      if (accountsError) throw accountsError;

      // Get journal entry lines within date range
      const { data: journalLines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entry:journal_entries!inner(entry_date, status)
        `)
        .eq("journal_entry.status", "posted")
        .gte("journal_entry.entry_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("journal_entry.entry_date", format(dateRange.to, "yyyy-MM-dd"));

      if (linesError) throw linesError;

      // Calculate balances for each account
      const accountBalances = accounts.map((account) => {
        const lines = journalLines.filter(
          (line: any) => line.account_id === account.id
        );

        const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);

        // For P&L accounts: Revenue is credit-normal, expenses/COGS are debit-normal
        let balance = 0;
        if (account.account_type === "revenue") {
          balance = totalCredit - totalDebit;
        } else {
          balance = totalDebit - totalCredit;
        }

        return {
          ...account,
          balance,
        };
      });

      // Group by account type
      const revenue = accountBalances.filter((a) => a.account_type === "revenue");
      const cogs = accountBalances.filter((a) => a.account_type === "cogs");
      const expenses = accountBalances.filter((a) => a.account_type === "expense");

      const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
      const totalCOGS = cogs.reduce((sum, a) => sum + a.balance, 0);
      const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);

      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = grossProfit - totalExpenses;

      return {
        revenue,
        cogs,
        expenses,
        totalRevenue,
        totalCOGS,
        totalExpenses,
        grossProfit,
        netIncome,
      };
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const AccountSection = ({ title, accounts, total, sectionKey }: any) => {
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
          <span className="font-semibold">{formatCurrency(total, currency)}</span>
        </div>

        {isExpanded && (
          <div className="ml-6 space-y-1">
            {accounts.map((account: any) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-2 hover:bg-muted/30 rounded text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{account.account_code}</span>
                  <span>{account.account_name}</span>
                </span>
                <span className="font-mono">{formatCurrency(account.balance, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Income Statement (P&L)</h1>
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
            Income Statement
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
          ) : !incomeStatementData ? (
            <div className="text-center py-8">No data available</div>
          ) : (
            <div className="space-y-6">
              {/* Revenue */}
              <AccountSection
                title="Revenue"
                accounts={incomeStatementData.revenue}
                total={incomeStatementData.totalRevenue}
                sectionKey="revenue"
              />

              {/* COGS */}
              <AccountSection
                title="Cost of Goods Sold"
                accounts={incomeStatementData.cogs}
                total={incomeStatementData.totalCOGS}
                sectionKey="cogs"
              />

              {/* Gross Profit */}
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-lg p-2 bg-muted/50 rounded">
                  <span>Gross Profit</span>
                  <span className={cn(
                    incomeStatementData.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(incomeStatementData.grossProfit, currency)}
                  </span>
                </div>
              </div>

              {/* Operating Expenses */}
              <AccountSection
                title="Operating Expenses"
                accounts={incomeStatementData.expenses}
                total={incomeStatementData.totalExpenses}
                sectionKey="expense"
              />

              {/* Net Income */}
              <div className="border-t-2 pt-4">
                <div className={cn(
                  "flex justify-between font-bold text-xl p-4 rounded",
                  incomeStatementData.netIncome >= 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                )}>
                  <span>Net Income</span>
                  <span className="font-mono">
                    {formatCurrency(incomeStatementData.netIncome, currency)}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-muted/30 rounded">
                <div>
                  <div className="text-sm text-muted-foreground">Gross Margin</div>
                  <div className="text-lg font-semibold">
                    {incomeStatementData.totalRevenue > 0
                      ? ((incomeStatementData.grossProfit / incomeStatementData.totalRevenue) * 100).toFixed(1)
                      : "0.0"}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Net Margin</div>
                  <div className="text-lg font-semibold">
                    {incomeStatementData.totalRevenue > 0
                      ? ((incomeStatementData.netIncome / incomeStatementData.totalRevenue) * 100).toFixed(1)
                      : "0.0"}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeStatement;
