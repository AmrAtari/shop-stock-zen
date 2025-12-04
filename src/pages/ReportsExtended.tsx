import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Receipt, TrendingDown, ArrowRightLeft, BarChart2, Target, DollarSign, History, Users, CreditCard, Calendar } from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import PivotTable from "@/components/reports/PivotTable";
import { ItemDrillDownDialog } from "@/components/reports/ItemDrillDownDialog";

interface ReportsExtendedProps {
  searchTerm: string;
  selectedStore: string;
  selectedCategory: string;
  selectedBrand: string;
  dateFrom?: string;
  dateTo?: string;
}

const ReportsExtended = ({ searchTerm, selectedStore, selectedCategory, selectedBrand, dateFrom, dateTo }: ReportsExtendedProps) => {
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
    transfersReport,
    stockMovementReport,
    inventoryTurnoverReport,
    profitMarginReport,
    itemLifecycleReport,
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

  // Filter functions
  const filteredReceipts = useMemo(() => {
    return posReceiptsReport.filter((item: any) => {
      const matchesSearch = item.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [posReceiptsReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredItemsSold = useMemo(() => {
    return itemsSoldReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [itemsSoldReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredTransfers = useMemo(() => {
    return transfersReport.filter((item: any) => {
      const matchesSearch = item.transfer_id?.toString().includes(searchTerm);
      const matchesStore = selectedStore === "all" || 
                          item.from_store_id === selectedStore || 
                          item.to_store_id === selectedStore;
      return matchesSearch && matchesStore;
    });
  }, [transfersReport, searchTerm, selectedStore]);

  const filteredStockMovement = useMemo(() => {
    return stockMovementReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [stockMovementReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredTurnover = useMemo(() => {
    return inventoryTurnoverReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [inventoryTurnoverReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredProfitMargin = useMemo(() => {
    return profitMarginReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [profitMarginReport, searchTerm, selectedCategory, selectedBrand]);

  const filteredItemLifecycle = useMemo(() => {
    return itemLifecycleReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.model_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [itemLifecycleReport, searchTerm, selectedCategory, selectedBrand]);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Inventory & Stock Reports */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Inventory & Stock Reports
          </h3>
          
          <Tabs defaultValue="lifecycle" className="space-y-4">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-1">
              <TabsTrigger value="lifecycle" className="text-xs">Lifecycle</TabsTrigger>
              <TabsTrigger value="transfers" className="text-xs">Transfers</TabsTrigger>
              <TabsTrigger value="stock-movement" className="text-xs">Movement</TabsTrigger>
              <TabsTrigger value="turnover" className="text-xs">Turnover</TabsTrigger>
              <TabsTrigger value="profit" className="text-xs">Profit</TabsTrigger>
              <TabsTrigger value="pivot" className="text-xs">Pivot</TabsTrigger>
            </TabsList>

            {/* Item Lifecycle Report */}
            <TabsContent value="lifecycle">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Item Lifecycle</CardTitle>
                    <CardDescription className="text-xs">Track items from entry to sale</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredItemLifecycle, "item-lifecycle-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Added</TableHead>
                          <TableHead className="text-xs">Stock</TableHead>
                          <TableHead className="text-xs">Sold</TableHead>
                          <TableHead className="text-xs">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItemLifecycle.slice(0, 50).map((item: any, idx: number) => (
                          <TableRow 
                            key={idx}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                          >
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-xs">{item.item_name}</TableCell>
                            <TableCell className="text-xs">{item.date_added ? new Date(item.date_added).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-xs">{item.current_stock || 0}</TableCell>
                            <TableCell className="text-xs">{formatNumber(item.total_quantity_sold || 0, 0)}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(item.total_revenue || 0, currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transfers Report */}
            <TabsContent value="transfers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Transfers</CardTitle>
                    <CardDescription className="text-xs">Inter-store transfers</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredTransfers, "transfers-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ID</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">From</TableHead>
                          <TableHead className="text-xs">To</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransfers.slice(0, 50).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{item.transfer_id}</TableCell>
                            <TableCell className="text-xs">{item.transfer_date ? new Date(item.transfer_date).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-xs">{item.from_store_name}</TableCell>
                            <TableCell className="text-xs">{item.to_store_name}</TableCell>
                            <TableCell className="text-xs">{item.transfer_quantity || 0}</TableCell>
                            <TableCell className="text-xs capitalize">{item.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stock Movement Report */}
            <TabsContent value="stock-movement">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Stock Movement</CardTitle>
                    <CardDescription className="text-xs">All inventory movements</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredStockMovement, "stock-movement-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStockMovement.slice(0, 50).map((item: any, index: number) => (
                          <TableRow 
                            key={index}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                          >
                            <TableCell className="text-xs">{item.movement_date ? new Date(item.movement_date).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-xs capitalize">{item.movement_type}</TableCell>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-xs">{item.item_name}</TableCell>
                            <TableCell className={`text-xs ${Number(item.quantity_change) >= 0 ? "text-success" : "text-destructive"}`}>
                              {item.quantity_change > 0 ? "+" : ""}{item.quantity_change}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Turnover Report */}
            <TabsContent value="turnover">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Inventory Turnover</CardTitle>
                    <CardDescription className="text-xs">Item turnover rates</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredTurnover, "inventory-turnover-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Stock</TableHead>
                          <TableHead className="text-xs">Sold</TableHead>
                          <TableHead className="text-xs">Ratio</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTurnover.slice(0, 50).map((item: any) => {
                          const ratio = Number(item.turnover_ratio) || 0;
                          let status = "Slow";
                          let statusColor = "text-destructive";
                          if (ratio > 3) { status = "Fast"; statusColor = "text-success"; }
                          else if (ratio > 1.5) { status = "Good"; statusColor = "text-warning"; }
                          
                          return (
                            <TableRow key={item.item_id}>
                              <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                              <TableCell className="text-xs">{item.item_name}</TableCell>
                              <TableCell className="text-xs">{formatNumber(item.current_stock || 0, 0)}</TableCell>
                              <TableCell className="text-xs">{formatNumber(item.total_sold || 0, 0)}</TableCell>
                              <TableCell className="text-xs">{formatNumber(ratio, 2)}</TableCell>
                              <TableCell className={`text-xs ${statusColor}`}>{status}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profit Margin Report */}
            <TabsContent value="profit">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Profit Margin</CardTitle>
                    <CardDescription className="text-xs">Profitability by item</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredProfitMargin, "profit-margin-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Cost</TableHead>
                          <TableHead className="text-xs">Price</TableHead>
                          <TableHead className="text-xs">Margin</TableHead>
                          <TableHead className="text-xs">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfitMargin.slice(0, 50).map((item: any) => (
                          <TableRow key={item.item_id}>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-xs">{item.item_name}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(item.cost_price || 0, currency)}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(item.selling_price || 0, currency)}</TableCell>
                            <TableCell className={`text-xs ${Number(item.profit_margin_percent) >= 30 ? "text-success" : Number(item.profit_margin_percent) >= 15 ? "text-warning" : "text-destructive"}`}>
                              {formatNumber(item.profit_margin_percent || 0, 1)}%
                            </TableCell>
                            <TableCell className={`text-xs ${Number(item.total_profit) >= 0 ? "text-success" : "text-destructive"}`}>
                              {formatCurrency(item.total_profit || 0, currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pivot Table */}
            <TabsContent value="pivot">
              <PivotTable 
                data={filteredItemsSold}
                title="Pivot Analysis"
                description="Custom cross-tabulations"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - POS Reports */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            POS Reports
          </h3>
          
          <Tabs defaultValue="receipts" className="space-y-4">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1">
              <TabsTrigger value="receipts" className="text-xs">Receipts</TabsTrigger>
              <TabsTrigger value="items-sold" className="text-xs">Items Sold</TabsTrigger>
              <TabsTrigger value="cash-sessions" className="text-xs">Cash</TabsTrigger>
              <TabsTrigger value="daily-summary" className="text-xs">Daily</TabsTrigger>
              <TabsTrigger value="refunds" className="text-xs">Refunds</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
              <TabsTrigger value="cashiers" className="text-xs">Cashiers</TabsTrigger>
            </TabsList>

            {/* POS Receipts Report */}
            <TabsContent value="receipts">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">POS Receipts</CardTitle>
                    <CardDescription className="text-xs">All transactions from POS</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredReceipts, "pos-receipts-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Receipt #</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReceipts.slice(0, 50).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{item.receipt_number}</TableCell>
                            <TableCell className="text-xs">{item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-xs">{item.item_name}</TableCell>
                            <TableCell className="text-xs">{item.quantity}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(item.amount || 0, currency)}</TableCell>
                            <TableCell className="text-xs capitalize">{item.payment_method}</TableCell>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Items Sold</CardTitle>
                    <CardDescription className="text-xs">Sales by item</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredItemsSold, "items-sold-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Sold</TableHead>
                          <TableHead className="text-xs">Sales</TableHead>
                          <TableHead className="text-xs">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItemsSold.slice(0, 50).map((item: any) => (
                          <TableRow 
                            key={item.item_id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                          >
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell className="text-xs">{item.item_name}</TableCell>
                            <TableCell className="text-xs">{formatNumber(item.total_quantity_sold || 0, 0)}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(item.total_sales_amount || 0, currency)}</TableCell>
                            <TableCell className={`text-xs ${Number(item.total_profit) >= 0 ? "text-success" : "text-destructive"}`}>
                              {formatCurrency(item.total_profit || 0, currency)}
                            </TableCell>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Cash Sessions</CardTitle>
                    <CardDescription className="text-xs">Opening & closing sessions</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredCashSessions, "cash-sessions-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Cashier</TableHead>
                          <TableHead className="text-xs">Opened</TableHead>
                          <TableHead className="text-xs">Closed</TableHead>
                          <TableHead className="text-xs">Sales</TableHead>
                          <TableHead className="text-xs">Variance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCashSessions.slice(0, 50).map((session: any) => (
                          <TableRow key={session.id}>
                            <TableCell className="text-xs">{session.cashier_name || "Unknown"}</TableCell>
                            <TableCell className="text-xs">{new Date(session.open_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs">{session.close_at ? new Date(session.close_at).toLocaleDateString() : "Open"}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(session.total_sales || 0, currency)}</TableCell>
                            <TableCell className={`text-xs ${Math.abs(Number(session.variance)) < 1 ? "" : "text-destructive"}`}>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Daily Summary</CardTitle>
                    <CardDescription className="text-xs">Daily POS totals</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredDailyPosSummary, "daily-pos-summary")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Store</TableHead>
                          <TableHead className="text-xs">Transactions</TableHead>
                          <TableHead className="text-xs">Items</TableHead>
                          <TableHead className="text-xs">Sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDailyPosSummary.slice(0, 50).map((summary: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{new Date(summary.sales_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs">{summary.store_name || "-"}</TableCell>
                            <TableCell className="text-xs">{summary.transaction_count || 0}</TableCell>
                            <TableCell className="text-xs">{summary.items_sold || 0}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(summary.total_sales || 0, currency)}</TableCell>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Refunds</CardTitle>
                    <CardDescription className="text-xs">Refunded transactions</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredRefunds, "refunds-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRefunds.slice(0, 50).map((refund: any) => (
                          <TableRow key={refund.refund_id}>
                            <TableCell className="text-xs">{new Date(refund.refund_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs">{refund.item_name}</TableCell>
                            <TableCell className="text-xs">{refund.quantity}</TableCell>
                            <TableCell className="text-xs text-destructive">{formatCurrency(refund.refund_amount || 0, currency)}</TableCell>
                            <TableCell className="text-xs">{refund.refund_reason || "-"}</TableCell>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription className="text-xs">Breakdown by payment type</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredPaymentMethods, "payment-methods-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Store</TableHead>
                          <TableHead className="text-xs">Method</TableHead>
                          <TableHead className="text-xs">Count</TableHead>
                          <TableHead className="text-xs">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPaymentMethods.slice(0, 50).map((payment: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{new Date(payment.transaction_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs">{payment.store_name || "-"}</TableCell>
                            <TableCell className="text-xs capitalize">{payment.payment_method}</TableCell>
                            <TableCell className="text-xs">{payment.transaction_count || 0}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(payment.total_amount || 0, currency)}</TableCell>
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">Cashier Performance</CardTitle>
                    <CardDescription className="text-xs">Sales by cashier</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredCashierPerformance, "cashier-performance-report")}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Cashier</TableHead>
                          <TableHead className="text-xs">Store</TableHead>
                          <TableHead className="text-xs">Transactions</TableHead>
                          <TableHead className="text-xs">Items</TableHead>
                          <TableHead className="text-xs">Total Sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCashierPerformance.slice(0, 50).map((cashier: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{cashier.cashier_name || "Unknown"}</TableCell>
                            <TableCell className="text-xs">{cashier.store_name || "-"}</TableCell>
                            <TableCell className="text-xs">{cashier.transaction_count || 0}</TableCell>
                            <TableCell className="text-xs">{cashier.items_sold || 0}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(cashier.total_sales || 0, currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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

export default ReportsExtended;
