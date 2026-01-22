import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Receipt, Users, CreditCard, Calendar, TrendingDown, ShoppingBag, DollarSign } from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { ItemDrillDownDialog } from "@/components/reports/ItemDrillDownDialog";

interface POSReportsProps {
  searchTerm: string;
  selectedStore: string;
  selectedCategory: string;
  selectedBrand: string;
  dateFrom?: string;
  dateTo?: string;
}

const POSReports = ({ searchTerm, selectedStore, selectedCategory, selectedBrand, dateFrom, dateTo }: POSReportsProps) => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    itemId: string;
    sku: string;
    itemName: string;
  } | null>(null);

  const { 
    posReceiptsReport,
    itemsSoldReport,
    cashSessionsReport,
    refundsReport,
    paymentMethodsReport,
    cashierPerformanceReport,
    dailyPosSummaryReport,
  } = useReportsData(dateFrom, dateTo);

  const handleRowClick = (itemId: string, sku: string, itemName: string) => {
    setSelectedItem({ itemId, sku, itemName });
    setDrillDownOpen(true);
  };

  // Filter functions - use correct column names from views
  const filteredReceipts = useMemo(() => {
    return posReceiptsReport.filter((item: any) => {
      const matchesSearch = item.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.cashier_id?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [posReceiptsReport, searchTerm]);

  const filteredItemsSold = useMemo(() => {
    return itemsSoldReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [itemsSoldReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredCashSessions = useMemo(() => {
    return cashSessionsReport.filter((session: any) => {
      const matchesSearch = session.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = selectedStore === "all" || session.store_name?.toLowerCase().includes(selectedStore.toLowerCase());
      return matchesSearch && matchesStore;
    });
  }, [cashSessionsReport, searchTerm, selectedStore]);

  const filteredRefunds = useMemo(() => {
    return refundsReport.filter((refund: any) => {
      const matchesSearch = refund.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           refund.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || refund.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || refund.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [refundsReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredPaymentMethods = useMemo(() => {
    return paymentMethodsReport.filter((payment: any) => {
      const matchesStore = selectedStore === "all" || payment.store_name?.toLowerCase().includes(selectedStore.toLowerCase());
      return matchesStore;
    });
  }, [paymentMethodsReport, selectedStore]);

  const filteredCashierPerformance = useMemo(() => {
    return cashierPerformanceReport.filter((cashier: any) => {
      const matchesSearch = cashier.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = selectedStore === "all" || cashier.store_name?.toLowerCase().includes(selectedStore.toLowerCase());
      return matchesSearch && matchesStore;
    });
  }, [cashierPerformanceReport, searchTerm, selectedStore]);

  const filteredDailyPosSummary = useMemo(() => {
    return dailyPosSummaryReport.filter((summary: any) => {
      const matchesStore = selectedStore === "all" || summary.store_name?.toLowerCase().includes(selectedStore.toLowerCase());
      return matchesStore;
    });
  }, [dailyPosSummaryReport, selectedStore]);

  // Summary calculations - use correct column names
  const posSummary = useMemo(() => {
    const totalReceipts = filteredReceipts.length;
    const totalSales = filteredReceipts.reduce((sum: number, item: any) => sum + Number(item.total_amount || 0), 0);
    const totalRefunds = filteredRefunds.reduce((sum: number, item: any) => sum + Number(item.refund_amount || 0), 0);
    const totalItemsSold = filteredItemsSold.reduce((sum: number, item: any) => sum + Number(item.total_sold || 0), 0);
    return { totalReceipts, totalSales, totalRefunds, totalItemsSold };
  }, [filteredReceipts, filteredRefunds, filteredItemsSold]);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(posSummary.totalReceipts, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(posSummary.totalSales, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(posSummary.totalRefunds, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Items Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(posSummary.totalItemsSold, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* POS Reports Tabs */}
      <Tabs defaultValue="receipts" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="items-sold" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Items Sold
          </TabsTrigger>
          <TabsTrigger value="cash-sessions" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cash Sessions
          </TabsTrigger>
          <TabsTrigger value="daily-summary" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Summary
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Refunds
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="cashiers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cashier Performance
          </TabsTrigger>
        </TabsList>

        {/* POS Receipts Report */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>POS Receipts</CardTitle>
                <CardDescription>All transactions from POS system</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredReceipts, "pos-receipts-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Line Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.slice(0, 100).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{item.transaction_id}</TableCell>
                        <TableCell>{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</TableCell>
                        <TableCell>{item.cashier_id}</TableCell>
                        <TableCell>{item.line_items}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.total_amount || 0, currency)}</TableCell>
                        <TableCell className="capitalize">{item.payment_method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Sold Report */}
        <TabsContent value="items-sold">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Items Sold</CardTitle>
                <CardDescription>Sales breakdown by item</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredItemsSold, "items-sold-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Qty Sold</TableHead>
                      <TableHead>Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItemsSold.slice(0, 100).map((item: any, idx: number) => (
                      <TableRow 
                        key={`${item.item_id}-${item.store_id}-${idx}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                      >
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell>{item.store_name || "-"}</TableCell>
                        <TableCell>{formatNumber(item.total_sold || 0, 0)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.total_revenue || 0, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Sessions Report */}
        <TabsContent value="cash-sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cash Sessions</CardTitle>
                <CardDescription>Opening and closing cash sessions</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredCashSessions, "cash-sessions-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Closed</TableHead>
                      <TableHead>Start Cash</TableHead>
                      <TableHead>End Cash</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCashSessions.slice(0, 100).map((session: any) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.cashier_name || "Unknown"}</TableCell>
                        <TableCell>{session.store_name || "-"}</TableCell>
                        <TableCell>{new Date(session.open_at).toLocaleString()}</TableCell>
                        <TableCell>{session.close_at ? new Date(session.close_at).toLocaleString() : "Open"}</TableCell>
                        <TableCell>{formatCurrency(session.start_cash || 0, currency)}</TableCell>
                        <TableCell>{session.end_cash ? formatCurrency(session.end_cash, currency) : "-"}</TableCell>
                        <TableCell>{formatCurrency(session.total_sales || 0, currency)}</TableCell>
                        <TableCell className={Math.abs(Number(session.variance)) < 1 ? "" : "text-destructive"}>
                          {formatCurrency(session.variance || 0, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily POS Summary */}
        <TabsContent value="daily-summary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily POS Summary</CardTitle>
                <CardDescription>Daily totals and transaction counts</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredDailyPosSummary, "daily-pos-summary")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Refunds</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Refund Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyPosSummary.slice(0, 100).map((summary: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{summary.transaction_date ? new Date(summary.transaction_date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{summary.store_name || "-"}</TableCell>
                        <TableCell>{summary.total_transactions || 0}</TableCell>
                        <TableCell>{summary.total_refunds || 0}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(summary.total_sales || 0, currency)}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(summary.total_refund_amount || 0, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Report */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Refunds</CardTitle>
                <CardDescription>Refunded transactions and items</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredRefunds, "refunds-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Refunded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRefunds.slice(0, 100).map((refund: any) => (
                      <TableRow key={refund.refund_id}>
                        <TableCell>{new Date(refund.refund_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">{refund.transaction_id}</TableCell>
                        <TableCell>{refund.item_name}</TableCell>
                        <TableCell>{refund.quantity}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(refund.refund_amount || 0, currency)}</TableCell>
                        <TableCell>{refund.refund_reason || "-"}</TableCell>
                        <TableCell>{refund.refunded_by || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Report */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Breakdown by payment type</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredPaymentMethods, "payment-methods-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Transaction Count</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPaymentMethods.slice(0, 100).map((payment: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(payment.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.store_name || "-"}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                        <TableCell>{payment.transaction_count || 0}</TableCell>
                        <TableCell>{formatCurrency(payment.total_amount || 0, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cashier Performance */}
        <TabsContent value="cashiers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cashier Performance</CardTitle>
                <CardDescription>Sales performance by cashier</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportToCSV(filteredCashierPerformance, "cashier-performance-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Items Sold</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Avg per Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCashierPerformance.slice(0, 100).map((cashier: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{cashier.cashier_name || "Unknown"}</TableCell>
                        <TableCell>{cashier.store_name || "-"}</TableCell>
                        <TableCell>{cashier.transaction_count || 0}</TableCell>
                        <TableCell>{cashier.items_sold || 0}</TableCell>
                        <TableCell>{formatCurrency(cashier.total_sales || 0, currency)}</TableCell>
                        <TableCell>
                          {formatCurrency(
                            cashier.transaction_count > 0 ? (cashier.total_sales || 0) / cashier.transaction_count : 0,
                            currency
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ItemDrillDownDialog
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        itemId={selectedItem?.itemId || ""}
        sku={selectedItem?.sku || ""}
        itemName={selectedItem?.itemName || ""}
      />
    </>
  );
};

export default POSReports;
