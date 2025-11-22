import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, FileText, Users, CreditCard, Factory } from "lucide-react"; // ADDED Factory ICON
import { Link } from "react-router-dom";
import { useAccountingDashboard } from "@/hooks/useAccountingDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const AccountingDashboard = () => {
  const { data: metrics, isLoading } = useAccountingDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounting</h1>
        <div className="flex gap-2">
          <Link to="/accounting/journal-entries/new">
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              New Journal Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.totalAssets.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.totalLiabilities.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.revenueMTD.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Income (MTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(metrics?.netIncomeMTD || 0) >= 0 ? "text-green-600" : "text-destructive"}`}
            >
              ${metrics?.netIncomeMTD.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accounts Payable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Outstanding Bills</span>
              <span className="font-semibold">${metrics?.apTotal.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Overdue</span>
              <span className="font-semibold text-destructive">${metrics?.apOverdue.toFixed(2) || "0.00"}</span>
            </div>
            <Link to="/accounting/accounts-payable">
              <Button variant="outline" className="w-full mt-2">
                <Users className="w-4 h-4 mr-2" />
                View All Bills
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accounts Receivable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Outstanding Invoices</span>
              <span className="font-semibold">${metrics?.arTotal.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Overdue</span>
              <span className="font-semibold text-destructive">${metrics?.arOverdue.toFixed(2) || "0.00"}</span>
            </div>
            <Link to="/accounting/accounts-receivable">
              <Button variant="outline" className="w-full mt-2">
                <FileText className="w-4 h-4 mr-2" />
                View All Invoices
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Today's Transactions</span>
              <span className="font-semibold">{metrics?.todayTransactions || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pending Approvals</span>
              <span className="font-semibold">{metrics?.pendingApprovals || 0}</span>
            </div>
            <Link to="/accounting/journal-entries">
              <Button variant="outline" className="w-full mt-2">
                <CreditCard className="w-4 h-4 mr-2" />
                View All Entries
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/accounting/chart-of-accounts">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Chart of Accounts</p>
            </CardContent>
          </Card>
        </Link>

        {/* NEW VENDOR LINK */}
        <Link to="/accounting/vendors">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <Factory className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Vendors</p>
            </CardContent>
          </Card>
        </Link>
        {/* END NEW VENDOR LINK */}

        <Link to="/accounting/journal-entries">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Journal Entries</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/payments">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Payments</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/reports">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Financial Reports</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/bank-accounts">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Bank Accounts</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/tax">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Tax Management</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/budgets">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Budgets</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/accounting/period-closing">
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Period Closing</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default AccountingDashboard;
