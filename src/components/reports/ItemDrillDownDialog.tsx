import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  ShoppingCart, 
  TrendingDown, 
  ArrowRightLeft, 
  Package,
  Calendar,
  DollarSign
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface ItemDrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  sku: string;
  itemName: string;
}

export const ItemDrillDownDialog = ({ 
  open, 
  onOpenChange, 
  itemId, 
  sku, 
  itemName 
}: ItemDrillDownDialogProps) => {
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  // Fetch item details
  const { data: itemDetails } = useQuery({
    queryKey: ["item-details", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          supplier:suppliers(name),
          brand:main_groups(name),
          category:categories(name)
        `)
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!itemId,
  });

  // Fetch transaction history
  const { data: transactions } = useQuery({
    queryKey: ["item-transactions", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          session:cash_sessions(cashier_id)
        `)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!itemId,
  });

  // Fetch purchase order history
  const { data: purchaseOrders } = useQuery({
    queryKey: ["item-purchase-orders", sku],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          purchase_order:purchase_orders(
            po_number,
            order_date,
            status,
            supplier
          )
        `)
        .eq("sku", sku)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!sku,
  });

  // Fetch store inventory
  const { data: storeInventory } = useQuery({
    queryKey: ["item-store-inventory", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_inventory")
        .select(`
          *,
          store:stores(name, location)
        `)
        .eq("item_id", itemId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!itemId,
  });

  // Build timeline from all activities
  const timeline = [
    ...(transactions || []).map((t: any) => ({
      date: new Date(t.created_at),
      type: t.is_refund ? "refund" : "sale",
      description: t.is_refund 
        ? `Refunded ${t.quantity} units` 
        : `Sold ${t.quantity} units`,
      amount: t.amount,
      icon: TrendingDown,
      status: undefined,
    })),
    ...(purchaseOrders || []).map((po: any) => ({
      date: new Date(po.purchase_order?.order_date || po.created_at),
      type: "purchase",
      description: `PO ${po.purchase_order?.po_number}: Ordered ${po.quantity} units`,
      amount: po.cost_price * po.quantity,
      icon: ShoppingCart,
      status: po.purchase_order?.status,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calculate summary stats
  const totalSales = transactions?.filter((t: any) => !t.is_refund)
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0) || 0;
  const totalQuantitySold = transactions?.filter((t: any) => !t.is_refund)
    .reduce((sum: number, t: any) => sum + Number(t.quantity || 0), 0) || 0;
  const totalPurchased = purchaseOrders?.reduce(
    (sum: number, po: any) => sum + Number(po.quantity || 0), 0
  ) || 0;
  const currentStock = storeInventory?.reduce(
    (sum: number, si: any) => sum + Number(si.quantity || 0), 0
  ) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {itemName}
          </DialogTitle>
          <DialogDescription>
            SKU: {sku} • Item ID: {itemId}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(currentStock, 0)}</div>
                  <p className="text-xs text-muted-foreground">across all stores</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(totalQuantitySold, 0)}</div>
                  <p className="text-xs text-muted-foreground">units</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalSales, currency)}</div>
                  <p className="text-xs text-muted-foreground">from sales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(totalPurchased, 0)}</div>
                  <p className="text-xs text-muted-foreground">via POs</p>
                </CardContent>
              </Card>
            </div>

            {/* Item Details */}
            {itemDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Item Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Brand</p>
                      <p className="font-medium">{itemDetails.brand?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium">{itemDetails.category?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Price</p>
                      <p className="font-medium">{formatCurrency(itemDetails.price, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">{formatCurrency(itemDetails.cost, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Stock</p>
                      <p className="font-medium">{itemDetails.min_stock || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unit</p>
                      <p className="font-medium">{itemDetails.unit || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Supplier</p>
                      <p className="font-medium">{itemDetails.supplier?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(itemDetails.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for detailed views */}
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Orders
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Stock by Store
                </TabsTrigger>
              </TabsList>

              {/* Timeline */}
              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>Complete history of all item movements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timeline.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No activity yet</p>
                      ) : (
                        timeline.map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <div key={idx} className="flex gap-4 pb-4 border-b last:border-0">
                              <div className="flex flex-col items-center">
                                <div className={`rounded-full p-2 ${
                                  item.type === "sale" ? "bg-success/10 text-success" :
                                  item.type === "refund" ? "bg-destructive/10 text-destructive" :
                                  "bg-primary/10 text-primary"
                                }`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                {idx < timeline.length - 1 && (
                                  <div className="w-px h-full bg-border mt-2" />
                                )}
                              </div>
                              <div className="flex-1 pt-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm">{item.description}</p>
                                  {item.status && (
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {item.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {item.date.toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(item.amount, currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transactions */}
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Transactions</CardTitle>
                    <CardDescription>All POS sales for this item</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No transactions yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactions?.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell>
                                {new Date(tx.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {tx.transaction_id?.substring(0, 8)}...
                              </TableCell>
                              <TableCell>{tx.quantity}</TableCell>
                              <TableCell>{formatCurrency(tx.price, currency)}</TableCell>
                              <TableCell>
                                {formatCurrency((tx.discount_fixed || 0) + (tx.discount_percent || 0), currency)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(tx.amount, currency)}
                              </TableCell>
                              <TableCell className="capitalize">{tx.payment_method}</TableCell>
                              <TableCell>
                                {tx.is_refund ? (
                                  <Badge variant="destructive">Refund</Badge>
                                ) : tx.is_refunded ? (
                                  <Badge variant="outline">Refunded</Badge>
                                ) : (
                                  <Badge variant="default">Complete</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Purchase Orders */}
              <TabsContent value="purchase-orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase Orders</CardTitle>
                    <CardDescription>All POs containing this item</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Cost Price</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No purchase orders yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          purchaseOrders?.map((po: any) => (
                            <TableRow key={po.id}>
                              <TableCell className="font-mono">
                                {po.purchase_order?.po_number}
                              </TableCell>
                              <TableCell>
                                {po.purchase_order?.order_date 
                                  ? new Date(po.purchase_order.order_date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell>{po.purchase_order?.supplier || "-"}</TableCell>
                              <TableCell>{po.quantity}</TableCell>
                              <TableCell>{formatCurrency(po.cost_price, currency)}</TableCell>
                              <TableCell>{po.received_quantity || 0}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(po.quantity * po.cost_price, currency)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {po.purchase_order?.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Store Inventory */}
              <TabsContent value="inventory">
                <Card>
                  <CardHeader>
                    <CardTitle>Stock by Store</CardTitle>
                    <CardDescription>Current inventory levels across all locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>On Order</TableHead>
                          <TableHead>Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {storeInventory?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No inventory data
                            </TableCell>
                          </TableRow>
                        ) : (
                          storeInventory?.map((inv: any) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">
                                {inv.store?.name}
                              </TableCell>
                              <TableCell>{inv.store?.location || "-"}</TableCell>
                              <TableCell>
                                <span className={Number(inv.quantity) < itemDetails?.min_stock 
                                  ? "text-destructive font-semibold" 
                                  : ""}>
                                  {formatNumber(inv.quantity, 0)}
                                </span>
                              </TableCell>
                              <TableCell>{inv.qty_on_order || 0}</TableCell>
                              <TableCell>
                                {inv.updated_at 
                                  ? new Date(inv.updated_at).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};