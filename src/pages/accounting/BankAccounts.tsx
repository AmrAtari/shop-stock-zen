import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Activity } from "lucide-react";
import { useBankAccounts, useBankReconciliations } from "@/hooks/useBankAccounts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const BankAccounts = () => {
  const { data: bankAccounts, isLoading } = useBankAccounts();
  const { data: reconciliations } = useBankReconciliations();

  const pendingReconciliations = reconciliations?.filter(r => r.status === "draft").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bank Accounts</h1>
        <div className="flex gap-2">
          <Link to="/accounting/bank-accounts/reconciliation/new">
            <Button variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              New Reconciliation
            </Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Bank Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bankAccounts?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0).toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reconciliations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReconciliations}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>{account.bank_name}</TableCell>
                    <TableCell className="font-mono">{account.account_number}</TableCell>
                    <TableCell>{account.currency_id}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${account.current_balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/accounting/bank-accounts/${account.id}/transactions`}>
                          <Button size="sm" variant="outline">
                            Transactions
                          </Button>
                        </Link>
                        <Link to={`/accounting/bank-accounts/${account.id}/reconciliation`}>
                          <Button size="sm">
                            Reconcile
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && bankAccounts?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No bank accounts found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reconciliations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Account</TableHead>
                <TableHead>Statement Date</TableHead>
                <TableHead className="text-right">Statement Balance</TableHead>
                <TableHead className="text-right">Book Balance</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliations?.slice(0, 5).map((recon) => {
                const difference = recon.statement_balance - recon.book_balance;
                return (
                  <TableRow key={recon.id}>
                    <TableCell className="font-medium">
                      {recon.bank_account?.account_name}
                    </TableCell>
                    <TableCell>{format(new Date(recon.statement_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${recon.statement_balance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${recon.book_balance.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${difference !== 0 ? "text-destructive" : "text-green-600"}`}>
                      ${Math.abs(difference).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recon.status === "reconciled" ? "default" : "secondary"}>
                        {recon.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/accounting/bank-reconciliation/${recon.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {reconciliations?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No reconciliations found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccounts;
