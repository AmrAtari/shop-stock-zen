import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ArrowRightLeft, BarChart2, Target, DollarSign, History } from "lucide-react";
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

  // Filter functions
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          Inventory & Stock Analysis Reports
        </h3>
        
        <Tabs defaultValue="lifecycle" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="lifecycle" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Item Lifecycle
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transfers
            </TabsTrigger>
            <TabsTrigger value="stock-movement" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Stock Movement
            </TabsTrigger>
            <TabsTrigger value="turnover" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Inventory Turnover
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Profit Margin
            </TabsTrigger>
            <TabsTrigger value="pivot">
              Pivot Table
            </TabsTrigger>
          </TabsList>

          {/* Item Lifecycle Report */}
          <TabsContent value="lifecycle">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Item Lifecycle Report</CardTitle>
                  <CardDescription>Track items from entry to sale with full traceability</CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToCSV(filteredItemLifecycle, "item-lifecycle-report")}>
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
                        <TableHead>Model Number</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Qty Sold</TableHead>
                        <TableHead>Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItemLifecycle.slice(0, 100).map((item: any, idx: number) => (
                        <TableRow 
                          key={idx}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                        >
                          <TableCell className="font-mono">{item.sku}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.model_number || "-"}</TableCell>
                          <TableCell>{item.date_added ? new Date(item.date_added).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{item.current_stock || 0}</TableCell>
                          <TableCell>{formatNumber(item.total_quantity_sold || 0, 0)}</TableCell>
                          <TableCell>{formatCurrency(item.total_revenue || 0, currency)}</TableCell>
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
                  <CardDescription>Inter-store transfer history and details</CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToCSV(filteredTransfers, "transfers-report")}>
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
                      {filteredTransfers.slice(0, 100).map((item: any, index: number) => (
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
                  <CardDescription>All inventory movements (PO receipts, sales, transfers)</CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToCSV(filteredStockMovement, "stock-movement-report")}>
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
                        <TableHead>Item Name</TableHead>
                        <TableHead>Quantity Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStockMovement.slice(0, 100).map((item: any, index: number) => (
                        <TableRow 
                          key={index}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                        >
                          <TableCell>{item.movement_date ? new Date(item.movement_date).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="capitalize">{item.movement_type}</TableCell>
                          <TableCell className="font-mono">{item.sku}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className={Number(item.quantity_change) >= 0 ? "text-success" : "text-destructive"}>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventory Turnover Report</CardTitle>
                  <CardDescription>Item turnover rates and performance analysis</CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToCSV(filteredTurnover, "inventory-turnover-report")}>
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
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Qty Sold</TableHead>
                        <TableHead>Turnover Ratio</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTurnover.slice(0, 100).map((item: any) => {
                        const ratio = Number(item.turnover_ratio) || 0;
                        let status = "Slow";
                        let statusColor = "text-destructive";
                        if (ratio >= 4) {
                          status = "Fast";
                          statusColor = "text-success";
                        } else if (ratio >= 2) {
                          status = "Normal";
                          statusColor = "text-warning";
                        }
                        return (
                          <TableRow 
                            key={item.item_id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                          >
                            <TableCell className="font-mono">{item.sku}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>{item.current_stock || 0}</TableCell>
                            <TableCell>{formatNumber(item.total_quantity_sold || 0, 0)}</TableCell>
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
                  <CardTitle>Profit Margin Report</CardTitle>
                  <CardDescription>Profitability analysis by item</CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToCSV(filteredProfitMargin, "profit-margin-report")}>
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
                        <TableHead>Cost Price</TableHead>
                        <TableHead>Selling Price</TableHead>
                        <TableHead>Margin %</TableHead>
                        <TableHead>Total Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfitMargin.slice(0, 100).map((item: any) => (
                        <TableRow 
                          key={item.item_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(item.item_id, item.sku, item.item_name)}
                        >
                          <TableCell className="font-mono">{item.sku}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{formatCurrency(item.cost_price || 0, currency)}</TableCell>
                          <TableCell>{formatCurrency(item.selling_price || 0, currency)}</TableCell>
                          <TableCell className={Number(item.profit_margin_percent) >= 30 ? "text-success" : Number(item.profit_margin_percent) >= 15 ? "text-warning" : "text-destructive"}>
                            {formatNumber(item.profit_margin_percent || 0, 1)}%
                          </TableCell>
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

          {/* Pivot Table */}
          <TabsContent value="pivot">
            <PivotTable 
              data={filteredItemLifecycle}
              title="Pivot Analysis"
              description="Custom cross-tabulations for detailed analysis"
            />
          </TabsContent>
        </Tabs>
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
