import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, DollarSign, BarChart3, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

// 1. NOTICE THE NAME CHANGE HERE: "FinancialReports"
const FinancialReports = () => {
  const reports = [
    {
      title: "Balance Sheet",
      description: "Assets, Liabilities, and Equity",
      icon: FileText,
      path: "/accounting/reports/balance-sheet",
      color: "text-blue-600",
    },
    {
      title: "Income Statement (P&L)",
      description: "Revenue and Expenses",
      icon: TrendingUp,
      path: "/accounting/reports/income-statement",
      color: "text-green-600",
    },
    {
      title: "Cash Flow Statement",
      description: "Cash Inflows and Outflows",
      icon: DollarSign,
      path: "/accounting/reports/cash-flow",
      color: "text-purple-600",
    },
    {
      title: "Trial Balance",
      description: "All Account Balances",
      icon: BarChart3,
      path: "/accounting/reports/trial-balance",
      color: "text-orange-600",
    },
    {
      title: "General Ledger",
      description: "Detailed Transaction History",
      icon: BookOpen,
      path: "/accounting/reports/general-ledger",
      color: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">View and download accounting statements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.path} to={report.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${report.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// 2. THIS EXPORT NOW MATCHES THE COMPONENT NAME ABOVE
export default FinancialReports;
