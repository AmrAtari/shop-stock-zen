import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, CalendarIcon, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";

const GeneralLedger = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  // Fetch all accounts
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_code");

      if (error) throw error;
      return data;
    },
  });

  // Fetch general ledger transactions
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ["general_ledger", dateRange, selectedAccount],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return null;

      let query = supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entry:journal_entries!inner(
            entry_number,
            entry_date,
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
        .lte("journal_entry.entry_date", format(dateRange.to, "yyyy-MM-dd"))
        .order("journal_entry(entry_date)", { ascending: true });

      if (selectedAccount !== "all") {
        query = query.eq("account_id", selectedAccount);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate running balance
      let runningBalance = 0;
      const transactions = data.map((line: any) => {
        const debit = Number(line.debit_amount || 0);
        const credit = Number(line.credit_amount || 0);
        
        // For simplicity, debit increases balance, credit decreases
        // In reality, this depends on account type
        if (line.account.account_type === "asset" || line.account.account_type === "expense" || line.account.account_type === "cogs") {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        return {
          ...line,
          runningBalance,
        };
      });

      return transactions;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">General Ledger</h1>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_code} - {account.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            General Ledger
            {dateRange.from && dateRange.to && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !ledgerData || ledgerData.length === 0 ? (
            <div className="text-center py-8">No transactions found for the selected criteria</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.journal_entry.entry_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.journal_entry.entry_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.account.account_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.account.account_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || transaction.journal_entry.description}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.debit_amount > 0 ? `$${Number(transaction.debit_amount).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.credit_amount > 0 ? `$${Number(transaction.credit_amount).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ${transaction.runningBalance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link to={`/accounting/journal-entries/${transaction.journal_entry.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralLedger;
