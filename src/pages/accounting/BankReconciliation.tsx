import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, CheckCircle2, Upload } from "lucide-react";
import {
  useBankAccounts,
  useCreateReconciliation,
  useReconciliationDetail,
  useReconciliationItems,
  useToggleReconciliationItem,
  useCompleteReconciliation,
  useBankTransactions,
} from "@/hooks/useBankAccounts";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const BankReconciliation = () => {
  const { id, accountId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSystemSettings();
  const [selectedBankAccount, setSelectedBankAccount] = useState(accountId || "");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0]);
  const [statementBalance, setStatementBalance] = useState("");

  const { data: bankAccounts } = useBankAccounts();
  const { data: reconciliation, isLoading: reconLoading } = useReconciliationDetail(id || "");
  const { data: reconItems } = useReconciliationItems(id || "");
  const { data: transactions } = useBankTransactions(selectedBankAccount || accountId || "");
  const createReconciliation = useCreateReconciliation();
  const toggleItem = useToggleReconciliationItem();
  const completeReconciliation = useCompleteReconciliation();

  const handleCreateReconciliation = async () => {
    if (!selectedBankAccount || !statementBalance) {
      return;
    }

    const result = await createReconciliation.mutateAsync({
      bank_account_id: selectedBankAccount,
      statement_date: statementDate,
      statement_balance: parseFloat(statementBalance),
      book_balance: 0, // Will be calculated
      reconciled_balance: 0,
      status: "draft",
    });

    navigate(`/accounting/bank-reconciliation/${result.id}`);
  };

  const handleToggleItem = (itemId: string, isReconciled: boolean) => {
    toggleItem.mutate({ itemId, isReconciled: !isReconciled });
  };

  const handleComplete = () => {
    if (id) {
      completeReconciliation.mutate(id);
    }
  };

  const reconciledSum = reconItems?.filter(item => item.is_reconciled)
    .reduce((sum, item) => sum + (item.debit_amount || 0) - (item.credit_amount || 0), 0) || 0;

  const unreconciledSum = reconItems?.filter(item => !item.is_reconciled)
    .reduce((sum, item) => sum + (item.debit_amount || 0) - (item.credit_amount || 0), 0) || 0;

  if (!id && !accountId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/accounting/bank-accounts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">New Bank Reconciliation</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account">Bank Account *</Label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement_date">Statement Date *</Label>
              <Input
                id="statement_date"
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement_balance">Statement Balance *</Label>
              <Input
                id="statement_balance"
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <Button
              onClick={handleCreateReconciliation}
              disabled={!selectedBankAccount || !statementBalance}
            >
              Start Reconciliation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reconLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/accounting/bank-accounts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
            <p className="text-muted-foreground">
              {reconciliation?.bank_account?.account_name} - {format(new Date(reconciliation?.statement_date || ""), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Statement
          </Button>
          {reconciliation?.status === "draft" && (
            <Button onClick={handleComplete}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Reconciliation
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Statement Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reconciliation?.statement_balance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Book Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reconciliation?.book_balance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Math.abs((reconciliation?.statement_balance || 0) - (reconciliation?.book_balance || 0)) < 0.01 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(Math.abs((reconciliation?.statement_balance || 0) - (reconciliation?.book_balance || 0)))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={reconciliation?.status === "reconciled" ? "default" : "secondary"}>
              {reconciliation?.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox disabled />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Entry #</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((transaction: any, index) => {
                const runningBalance = transactions
                  .slice(0, index + 1)
                  .reduce((sum: number, t: any) => 
                    sum + (t.debit_amount || 0) - (t.credit_amount || 0), 0
                  );

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox
                        disabled={reconciliation?.status === "reconciled"}
                      />
                    </TableCell>
                    <TableCell>
                      {transaction.journal_entry?.entry_date && format(new Date(transaction.journal_entry.entry_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || transaction.journal_entry?.description}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.journal_entry?.entry_number}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(runningBalance)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {transactions?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found for this account
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankReconciliation;
