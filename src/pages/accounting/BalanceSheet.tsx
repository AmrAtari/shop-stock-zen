import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const BalanceSheet = () => {
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assets: true,
    liabilities: true,
    equity: true,
  });

  const { data: balanceSheetData, isLoading } = useQuery({
    queryKey: ["balance_sheet", asOfDate],
    queryFn: async () => {
      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_code");

      if (accountsError) throw accountsError;

      // Get journal entry lines up to the as-of date
      const { data: journalLines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entry:journal_entries!inner(entry_date, status)
        `)
        .eq("journal_entry.status", "posted")
        .lte("journal_entry.entry_date", format(asOfDate, "yyyy-MM-dd"));

      if (linesError) throw linesError;

      // Calculate balances for each account
      const accountBalances = accounts.map((account) => {
        const lines = journalLines.filter(
          (line: any) => line.account_id === account.id
        );

        const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);

        // Calculate balance based on account type
        let balance = 0;
        if (account.normal_balance === "debit") {
          balance = totalDebit - totalCredit;
        } else {
          balance = totalCredit - totalDebit;
        }

        return {
          ...account,
          balance,
        };
      });

      // Group by account type
      const assets = accountBalances.filter((a) => a.account_type === "asset");
      const liabilities = accountBalances.filter((a) => a.account_type === "liability");
      const equity = accountBalances.filter((a) => a.account_type === "equity");

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
      const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
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
          <span className="font-semibold">${total.toFixed(2)}</span>
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
                <span className="font-mono">${account.balance.toFixed(2)}</span>
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
        <h1 className="text-3xl font-bold">Balance Sheet</h1>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                As of: {format(asOfDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={asOfDate}
                onSelect={(date) => date && setAsOfDate(date)}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet as of {format(asOfDate, "MMMM dd, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !balanceSheetData ? (
            <div className="text-center py-8">No data available</div>
          ) : (
            <div className="space-y-6">
              {/* Assets */}
              <AccountSection
                title="Assets"
                accounts={balanceSheetData.assets}
                total={balanceSheetData.totalAssets}
                sectionKey="assets"
              />

              {/* Liabilities */}
              <AccountSection
                title="Liabilities"
                accounts={balanceSheetData.liabilities}
                total={balanceSheetData.totalLiabilities}
                sectionKey="liabilities"
              />

              {/* Equity */}
              <AccountSection
                title="Equity"
                accounts={balanceSheetData.equity}
                total={balanceSheetData.totalEquity}
                sectionKey="equity"
              />

              {/* Totals */}
              <div className="border-t-2 pt-4 space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Assets</span>
                  <span>${balanceSheetData.totalAssets.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Liabilities & Equity</span>
                  <span>${balanceSheetData.totalLiabilitiesAndEquity.toFixed(2)}</span>
                </div>
                <div
                  className={cn(
                    "flex justify-between p-2 rounded",
                    Math.abs(balanceSheetData.totalAssets - balanceSheetData.totalLiabilitiesAndEquity) < 0.01
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  )}
                >
                  <span className="font-semibold">Difference</span>
                  <span className="font-mono">
                    ${(balanceSheetData.totalAssets - balanceSheetData.totalLiabilitiesAndEquity).toFixed(2)}
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

export default BalanceSheet;
