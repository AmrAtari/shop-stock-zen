import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { useReportsData } from "@/hooks/useReportsData";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import ReportsExtended from "./ReportsExtended";

const Reports = () => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const { 
    stores, 
    categories, 
    brands, 
    storeInventoryReport, 
    salesReport, 
    poReport,
    posReceiptsReport,
    itemsSoldReport,
    transfersReport,
    stockMovementReport,
    inventoryTurnoverReport,
    profitMarginReport,
    isLoading 
  } = useReportsData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // Filter inventory data
  const filteredInventory = useMemo(() => {
    return storeInventoryReport.filter((item: any) => {
      const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = selectedStore === "all" || item.store_id === selectedStore;
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesStore && matchesCategory && matchesBrand;
    });
  }, [storeInventoryReport, searchTerm, selectedStore, selectedCategory, selectedBrand]);

  // Calculate inventory summary
  const inventorySummary = useMemo(() => {
    const totalValue = filteredInventory.reduce((sum: number, item: any) => 
      sum + (item.store_quantity || 0) * (item.cost_price || 0), 0);
    const totalItems = filteredInventory.reduce((sum: number, item: any) => 
      sum + (item.store_quantity || 0), 0);
    const lowStockItems = filteredInventory.filter((item: any) => 
      (item.store_quantity || 0) <= (item.min_stock || 0)).length;
    return { totalValue, totalItems, lowStockItems };
  }, [filteredInventory]);

  // Filter sales data
  const filteredSales = useMemo(() => {
    return salesReport.filter((item: any) => {
      const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || item.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [salesReport, searchTerm, selectedCategory, selectedBrand]);

  // Calculate sales summary
  const salesSummary = useMemo(() => {
    const totalSales = filteredSales.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const totalQuantity = filteredSales.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const totalTransactions = filteredSales.length;
    const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    return { totalSales, totalQuantity, totalTransactions, avgTransaction };
  }, [filteredSales]);

  // Filter PO data
  const filteredPO = useMemo(() => {
    return poReport.filter((item: any) => {
      const matchesSearch = item.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = selectedStore === "all" || item.store_id === selectedStore;
      return matchesSearch && matchesStore;
    });
  }, [poReport, searchTerm, selectedStore]);

  // Calculate PO summary
  const poSummary = useMemo(() => {
    const totalPOs = filteredPO.length;
    const totalValue = filteredPO.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0);
    const pendingPOs = filteredPO.filter((item: any) => item.status === 'pending').length;
    const completedPOs = filteredPO.filter((item: any) => item.status === 'completed').length;
    return { totalPOs, totalValue, pendingPOs, completedPOs };
  }, [filteredPO]);

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

  if (isLoading) {
    return <div className="p-8">Loading reports...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Reports</h1>
          <p className="text-muted-foreground">Comprehensive analytics and reporting</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store: any) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand: any) => (
                  <SelectItem key={brand.id} value={brand.name}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="po" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Advanced Reports
          </TabsTrigger>
        </TabsList>

        {/* Inventory Report */}
        <TabsContent value="inventory">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(inventorySummary.totalValue, currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(inventorySummary.totalItems, 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{inventorySummary.lowStockItems}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Store Inventory Report</CardTitle>
                <CardDescription>Current stock levels across all stores</CardDescription>
              </div>
              <Button onClick={() => exportToCSV(filteredInventory, "inventory-report")}>
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
                      <TableHead>Store</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>On Order</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.store_name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell>{item.brand || "-"}</TableCell>
                        <TableCell>{formatNumber(item.store_quantity || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(item.qty_on_order || 0, 0)}</TableCell>
                        <TableCell>{formatCurrency(item.cost_price || 0, currency)}</TableCell>
                        <TableCell>{formatCurrency((item.store_quantity || 0) * (item.cost_price || 0), currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Report */}
        <TabsContent value="sales">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesSummary.totalSales, currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(salesSummary.totalQuantity, 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesSummary.totalTransactions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesSummary.avgTransaction, currency)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Report</CardTitle>
                <CardDescription>Transaction history and sales analysis</CardDescription>
              </div>
              <Button onClick={() => exportToCSV(filteredSales, "sales-report")}>
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
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.transaction_id}</TableCell>
                        <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell>{item.brand || "-"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price, currency)}</TableCell>
                        <TableCell>{formatCurrency(item.amount, currency)}</TableCell>
                        <TableCell className="capitalize">{item.payment_method}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Report */}
        <TabsContent value="po">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total POs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{poSummary.totalPOs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(poSummary.totalValue, currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{poSummary.pendingPOs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{poSummary.completedPOs}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Orders Report</CardTitle>
                <CardDescription>PO tracking and supplier analytics</CardDescription>
              </div>
              <Button onClick={() => exportToCSV(filteredPO, "po-report")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPO.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.po_number}</TableCell>
                        <TableCell>{item.supplier_name}</TableCell>
                        <TableCell>{item.store_name || "-"}</TableCell>
                        <TableCell>{new Date(item.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>{item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="capitalize">{item.status}</TableCell>
                        <TableCell>{item.total_items || 0}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost || 0, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Reports Tab */}
        <TabsContent value="advanced">
          <ReportsExtended 
            searchTerm={searchTerm}
            selectedStore={selectedStore}
            selectedCategory={selectedCategory}
            selectedBrand={selectedBrand}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
