import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export const useAccountingDashboard = () => {
  return useQuery({
    queryKey: queryKeys.accounting.dashboardMetrics,
    queryFn: async () => {
      // Get account balances for assets, liabilities, revenue, expenses
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, account_code, account_name, account_type");

      if (!accounts) throw new Error("Failed to fetch accounts");

      // Get journal entry lines to calculate balances
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entry:journal_entries!journal_entry_lines_journal_entry_id_fkey(
            status,
            entry_date
          )
        `)
        .eq("journal_entry.status", "posted");

      // Calculate balances by account type
      const balances = accounts.reduce((acc, account) => {
        const accountLines = lines?.filter((line: any) => line.account_id === account.id) || [];
        
        const balance = accountLines.reduce((sum: number, line: any) => {
          if (line.journal_entry?.status !== "posted") return sum;
          
          // For assets and expenses: debit increases, credit decreases
          if (account.account_type === "asset" || account.account_type === "expense" || account.account_type === "cogs") {
            return sum + (line.debit_amount || 0) - (line.credit_amount || 0);
          }
          // For liabilities, equity, and revenue: credit increases, debit decreases
          return sum + (line.credit_amount || 0) - (line.debit_amount || 0);
        }, 0);

        if (!acc[account.account_type]) {
          acc[account.account_type] = 0;
        }
        acc[account.account_type] += balance;
        return acc;
      }, {} as Record<string, number>);

      // Get current month data for MTD calculations
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const { data: monthLines } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entry:journal_entries!journal_entry_lines_journal_entry_id_fkey(
            status,
            entry_date
          )
        `)
        .eq("journal_entry.status", "posted")
        .gte("journal_entry.entry_date", firstDayOfMonth.toISOString());

      const monthBalances = accounts.reduce((acc, account) => {
        const accountLines = monthLines?.filter((line: any) => line.account_id === account.id) || [];
        
        const balance = accountLines.reduce((sum: number, line: any) => {
          if (account.account_type === "revenue") {
            return sum + (line.credit_amount || 0) - (line.debit_amount || 0);
          }
          if (account.account_type === "expense" || account.account_type === "cogs") {
            return sum + (line.debit_amount || 0) - (line.credit_amount || 0);
          }
          return sum;
        }, 0);

        if (!acc[account.account_type]) {
          acc[account.account_type] = 0;
        }
        acc[account.account_type] += balance;
        return acc;
      }, {} as Record<string, number>);

      // Get AP/AR summary
      const { data: apData } = await supabase
        .from("accounts_payable")
        .select("balance, status")
        .neq("status", "paid")
        .neq("status", "cancelled");

      const { data: arData } = await supabase
        .from("accounts_receivable")
        .select("balance, status")
        .neq("status", "paid")
        .neq("status", "cancelled");

      const apTotal = apData?.reduce((sum, bill) => sum + (bill.balance || 0), 0) || 0;
      const apOverdue = apData?.filter(bill => bill.status === "overdue").reduce((sum, bill) => sum + (bill.balance || 0), 0) || 0;
      
      const arTotal = arData?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
      const arOverdue = arData?.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

      // Get transaction count for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayEntries } = await supabase
        .from("journal_entries")
        .select("id, status")
        .gte("entry_date", today.toISOString());

      const todayCount = todayEntries?.length || 0;
      const pendingCount = todayEntries?.filter(e => e.status === "draft").length || 0;

      return {
        totalAssets: balances.asset || 0,
        totalLiabilities: balances.liability || 0,
        totalEquity: balances.equity || 0,
        revenueMTD: monthBalances.revenue || 0,
        expensesMTD: (monthBalances.expense || 0) + (monthBalances.cogs || 0),
        netIncomeMTD: (monthBalances.revenue || 0) - ((monthBalances.expense || 0) + (monthBalances.cogs || 0)),
        apTotal,
        apOverdue,
        arTotal,
        arOverdue,
        todayTransactions: todayCount,
        pendingApprovals: pendingCount,
      };
    },
  });
};
