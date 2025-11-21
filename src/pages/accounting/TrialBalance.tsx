import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { exportToCSV, formatReportData } from "@/utils/reportExport";

const TrialBalance = () => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const handleExport = () => {
    if (!trialBalanceData) return;
    
    const formattedData = formatReportData(trialBalanceData.accounts, "trial_balance");
    exportToCSV(formattedData, `trial_balance_${format(asOfDate, "yyyy-MM-dd")}`);
  };

  const { data: trialBalanceData, isLoading } = useQuery({
    queryKey: ["trial_balance", asOfDate],
    queryFn: async () => {
      // Get all active accounts
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

        return {
          ...account,
          totalDebit,
          totalCredit,
          debitBalance: totalDebit > totalCredit ? totalDebit - totalCredit : 0,
          creditBalance: totalCredit > totalDebit ? totalCredit - totalDebit : 0,
        };
      }).filter(account => account.totalDebit > 0 || account.totalCredit > 0); // Only show accounts with activity

      const grandTotalDebit = accountBalances.reduce((sum, a) => sum + a.debitBalance, 0);
      const grandTotalCredit = accountBalances.reduce((sum, a) => sum + a.creditBalance, 0);
      const isBalanced = Math.abs(grandTotalDebit - grandTotalCredit) < 0.01;

      return {
        accounts: accountBalances,
        grandTotalDebit,
        grandTotalCredit,
        isBalanced,
        difference: grandTotalDebit - grandTotalCredit,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trial Balance</h1>
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance as of {format(asOfDate, "MMMM dd, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !trialBalanceData ? (
            <div className="text-center py-8">No data available</div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalanceData.accounts.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.account_code}</TableCell>
                      <TableCell>{account.account_name}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded bg-muted">
                          {account.account_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {account.debitBalance > 0 ? formatCurrency(account.debitBalance, currency) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {account.creditBalance > 0 ? formatCurrency(account.creditBalance, currency) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                    <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(trialBalanceData.grandTotalDebit, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(trialBalanceData.grandTotalCredit, currency)}
                    </TableCell>
                  </TableRow>
                  <TableRow className={cn(
                    "font-bold",
                    trialBalanceData.isBalanced
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  )}>
                    <TableCell colSpan={3}>
                      {trialBalanceData.isBalanced ? "✓ Balanced" : "⚠ Out of Balance"}
                    </TableCell>
                    <TableCell colSpan={2} className="text-right font-mono">
                      Difference: {formatCurrency(Math.abs(trialBalanceData.difference), currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialBalance;
