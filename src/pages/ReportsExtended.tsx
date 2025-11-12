import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, Receipt, TrendingDown, ArrowRightLeft, BarChart2, Target, DollarSign, History } from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/formatters";
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
  } = useReportsData(dateFrom, dateTo);

  const handleRowClick = (itemId: string, sku: string, itemName: string) => {
    setSelectedItem({ itemId, sku, itemName });
    setDrillDownOpen(true);
  };

  // Filter POS Receipts
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

  // Filter Items Sold
  const filteredItemsSold = useMemo(() => {
    return itemsSoldReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [itemsSoldReport, searchTerm, selectedCategory, selectedBrand]);

  // Filter Transfers
  const filteredTransfers = useMemo(() => {
    return transfersReport.filter((item: any) => {
      const matchesSearch = item.transfer_id?.toString().includes(searchTerm);
      const matchesStore = selectedStore === "all" || 
                          item.from_store_id === selectedStore || 
                          item.to_store_id === selectedStore;
      return matchesSearch && matchesStore;
    });
  }, [transfersReport, searchTerm, selectedStore]);

  // Filter Stock Movement
  const filteredStockMovement = useMemo(() => {
    return stockMovementReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [stockMovementReport, searchTerm, selectedCategory, selectedBrand]);

  // Filter Inventory Turnover
  const filteredTurnover = useMemo(() => {
    return inventoryTurnoverReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [inventoryTurnoverReport, searchTerm, selectedCategory, selectedBrand]);

  // Filter Profit Margin
  const filteredProfitMargin = useMemo(() => {
    return profitMarginReport.filter((item: any) => {
      const matchesSearch = item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [profitMarginReport, searchTerm, selectedCategory, selectedBrand]);

  // Filter Item Lifecycle
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
    <Tabs defaultValue="receipts" className="space-y-4">
      <TabsList className="grid grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="receipts" className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          <span className="hidden sm:inline">Receipts</span>
        </TabsTrigger>
        <TabsTrigger value="items-sold" className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          <span className="hidden sm:inline">Items Sold</span>
        </TabsTrigger>
        <TabsTrigger value="lifecycle" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Lifecycle</span>
        </TabsTrigger>
        <TabsTrigger value="transfers" className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Transfers</span>
        </TabsTrigger>
        <TabsTrigger value="stock-movement" className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          <span className="hidden sm:inline">Stock Movement</span>
        </TabsTrigger>
        <TabsTrigger value="turnover" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">Turnover</span>
        </TabsTrigger>
        <TabsTrigger value="profit" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Profit Margin</span>
        </TabsTrigger>
        <TabsTrigger value="pivot" className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          <span className="hidden sm:inline">Pivot Table</span>
        </TabsTrigger>
      </TabsList>

      {/* POS Receipts Report */}
      <TabsContent value="receipts">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>POS Receipts Report</CardTitle>
              <CardDescription>All transactions and receipts from POS</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredReceipts, "pos-receipts-report")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.receipt_number}</TableCell>
                      <TableCell>{item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price || 0, currency)}</TableCell>
                      <TableCell>{formatCurrency((item.discount_fixed || 0) + (item.discount_percent || 0), currency)}</TableCell>
                      <TableCell>{formatCurrency(item.amount || 0, currency)}</TableCell>
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
              <CardTitle>Items Sold Report</CardTitle>
              <CardDescription>Sales performance by item</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredItemsSold, "items-sold-report")}>
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
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Total Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItemsSold.map((item: any) => (
                    <TableRow 
                      key={item.item_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                    >
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{formatNumber(item.total_quantity_sold || 0, 0)}</TableCell>
                      <TableCell>{item.total_transactions || 0}</TableCell>
                      <TableCell>{formatCurrency(item.total_sales_amount || 0, currency)}</TableCell>
                      <TableCell>{formatCurrency(item.avg_selling_price || 0, currency)}</TableCell>
                      <TableCell className={Number(item.total_profit) >= 0 ? "text-success" : "text-destructive"}>
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

      {/* Item Lifecycle Report */}
      <TabsContent value="lifecycle">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Item Lifecycle Tracking</CardTitle>
              <CardDescription>Track items from entry to sale by SKU or model number</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredItemLifecycle, "item-lifecycle-report")}>
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
                    <TableHead>Model #</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Last PO Date</TableHead>
                    <TableHead>Last Sale Date</TableHead>
                    <TableHead>Total Sold</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItemLifecycle.map((item: any, idx: number) => (
                    <TableRow 
                      key={idx}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                    >
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.model_number || "-"}</TableCell>
                      <TableCell>{item.date_added ? new Date(item.date_added).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{item.store_name || "-"}</TableCell>
                      <TableCell>{item.current_stock || 0}</TableCell>
                      <TableCell>
                        {item.last_po_date ? new Date(item.last_po_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        {item.last_sale_date ? new Date(item.last_sale_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{formatNumber(item.total_quantity_sold || 0, 0)}</TableCell>
                      <TableCell>{formatCurrency(item.total_revenue || 0, currency)}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transfers Report</CardTitle>
              <CardDescription>Inter-store transfers and movements</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredTransfers, "transfers-report")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>From Store</TableHead>
                    <TableHead>To Store</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.transfer_id}</TableCell>
                      <TableCell>{item.transfer_date ? new Date(item.transfer_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{item.from_store_name}</TableCell>
                      <TableCell>{item.to_store_name}</TableCell>
                      <TableCell>{item.transfer_quantity || 0}</TableCell>
                      <TableCell className="capitalize">{item.status}</TableCell>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stock Movement Report</CardTitle>
              <CardDescription>All inventory movements (Sales, Refunds, POs)</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredStockMovement, "stock-movement-report")}>
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
                    <TableHead>Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Qty Change</TableHead>
                    <TableHead>Store</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockMovement.map((item: any, index: number) => (
                    <TableRow 
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                    >
                      <TableCell>{item.movement_date ? new Date(item.movement_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell className="capitalize">{item.movement_type}</TableCell>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell className={Number(item.quantity_change) >= 0 ? "text-success" : "text-destructive"}>
                        {item.quantity_change > 0 ? "+" : ""}{item.quantity_change}
                      </TableCell>
                      <TableCell>{item.to_store || "-"}</TableCell>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Inventory Turnover Report</CardTitle>
              <CardDescription>Item turnover rates and stock efficiency</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredTurnover, "inventory-turnover-report")}>
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
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Turnover Ratio</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTurnover.map((item: any) => {
                    const ratio = Number(item.turnover_ratio) || 0;
                    let status = "Slow";
                    let statusColor = "text-destructive";
                    if (ratio > 3) { status = "Fast"; statusColor = "text-success"; }
                    else if (ratio > 1.5) { status = "Good"; statusColor = "text-warning"; }
                    
                    return (
                      <TableRow key={item.item_id}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell>{item.brand || "-"}</TableCell>
                        <TableCell>{formatNumber(item.current_stock || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(item.total_sold || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(ratio, 2)}</TableCell>
                        <TableCell className={statusColor}>{status}</TableCell>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Profit Margin Analysis</CardTitle>
              <CardDescription>Profitability by item</CardDescription>
            </div>
            <Button onClick={() => exportToCSV(filteredProfitMargin, "profit-margin-report")}>
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
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Margin %</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Total Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfitMargin.map((item: any) => (
                    <TableRow key={item.item_id}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{formatCurrency(item.cost_price || 0, currency)}</TableCell>
                      <TableCell>{formatCurrency(item.selling_price || 0, currency)}</TableCell>
                      <TableCell className={Number(item.profit_margin_percent) >= 30 ? "text-success" : Number(item.profit_margin_percent) >= 15 ? "text-warning" : "text-destructive"}>
                        {formatNumber(item.profit_margin_percent || 0, 1)}%
                      </TableCell>
                      <TableCell>{formatNumber(item.units_sold || 0, 0)}</TableCell>
                      <TableCell className={Number(item.total_profit) >= 0 ? "text-success" : "text-destructive"}>
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

      {/* Pivot Table Tab */}
      <TabsContent value="pivot">
        <PivotTable 
          data={filteredItemsSold}
          title="Pivot Table Analysis"
          description="Create custom cross-tabulations and aggregations like Excel pivot tables"
        />
      </TabsContent>
    </Tabs>

    {/* Drill-Down Dialog */}
    {selectedItem && (
      <ItemDrillDownDialog
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        itemId={selectedItem.itemId}
        sku={selectedItem.sku}
        itemName={selectedItem.itemName}
      />
    )}
    </>
  );
};

export default ReportsExtended;
