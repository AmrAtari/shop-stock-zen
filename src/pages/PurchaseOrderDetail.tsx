import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { usePurchaseOrderDetail } from "@/hooks/usePurchaseOrderDetail";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ArrowLeft, Printer, Download, Edit, CheckCircle, XCircle, Send, Package } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";

const PurchaseOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePurchaseOrderDetail(id || "");
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Purchase order not found</p>
          <Button className="mt-4" onClick={() => navigate("/purchase-orders")}>
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    );
  }

  const { po, items } = data;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Field: "PO Number", Value: po.po_number },
      { Field: "Supplier", Value: po.supplier },
      { Field: "Order Date", Value: new Date(po.order_date).toLocaleDateString() },
      { Field: "Status", Value: po.status },
      { Field: "Payment Terms", Value: po.payment_terms },
      { Field: "Currency", Value: po.currency },
      {},
      { Field: "Buyer Company", Value: po.buyer_company_name || "" },
      { Field: "Buyer Address", Value: po.buyer_address || "" },
      { Field: "Billing Address", Value: po.billing_address || "" },
      { Field: "Shipping Address", Value: po.shipping_address || "" },
      {},
      { Field: "ITEMS", Value: "" },
      ...items.map((item) => ({
        SKU: item.sku,
        Name: item.item_name,
        Description: item.item_description || "",
        Color: item.color || "",
        Size: item.size || "",
        Quantity: item.quantity,
        Unit: item.unit,
        "Cost Price": item.cost_price,
        Total: item.quantity * item.cost_price,
      })),
      {},
      { Field: "Subtotal", Value: po.subtotal },
      { Field: "Tax Amount", Value: po.tax_amount },
      { Field: "Shipping Charges", Value: po.shipping_charges },
      { Field: "Grand Total", Value: po.total_cost },
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, `PO_${po.po_number}.xlsx`);
  };

  const handleSubmit = async () => {
    try {
      await updateStatusMutation.mutateAsync("pending");
      toast({
        title: "PO Submitted",
        description: "Purchase order has been submitted for approval.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit purchase order.",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async () => {
    try {
      await updateStatusMutation.mutateAsync("approved");
      toast({
        title: "PO Approved",
        description: "Purchase order has been approved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve purchase order.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      await updateStatusMutation.mutateAsync("cancelled");
      toast({
        title: "PO Rejected",
        description: "Purchase order has been rejected.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject purchase order.",
        variant: "destructive",
      });
    }
  };

  const handleReceive = async () => {
    try {
      let updatedCount = 0;
      const notFoundSkus: string[] = [];

      for (const item of items) {
        let targetItemId: string | null = null;
        let currentGlobalQty = 0;

        // 1. Find the Item ID and Current Global Quantity
        if (item.item_id) {
          const { data: byId, error: byIdErr } = await supabase
            .from("items")
            .select("id, quantity")
            .eq("id", item.item_id)
            .maybeSingle();

          if (byIdErr) throw byIdErr;
          if (byId) {
            targetItemId = byId.id as string;
            currentGlobalQty = (byId.quantity as number) ?? 0;
          }
        } else if (item.sku) {
          const { data: bySku, error: bySkuErr } = await supabase
            .from("items")
            .select("id, quantity")
            .eq("sku", item.sku)
            .maybeSingle();

          if (bySkuErr) throw bySkuErr;
          if (bySku) {
            targetItemId = bySku.id as string;
            currentGlobalQty = (bySku.quantity as number) ?? 0;
          }
        }

        if (targetItemId) {
          // 2. Update Global Inventory (items table)
          const { error: globalUpdateErr } = await supabase
            .from("items")
            .update({
              quantity: currentGlobalQty + item.quantity,
              // CRUCIAL FIX: Remove item.location update. Location is now relational.
              last_restocked: new Date().toISOString(),
            })
            .eq("id", targetItemId);
          if (globalUpdateErr) throw globalUpdateErr;

          // 3. Update Location-Specific Inventory (NEW ARCHITECTURE)
          if (po.store_id) {
            // This relies on you implementing a Postgres RPC function named `increment_location_stock`
            // that safely adds the p_quantity_to_add to the record matching p_item_id and p_store_id
            // in your new relational stock table (e.g., item_stock_by_location).
            const { error: locationUpdateErr } = await supabase.rpc("increment_location_stock", {
              p_item_id: targetItemId,
              p_store_id: po.store_id,
              p_quantity_to_add: item.quantity,
            });

            if (locationUpdateErr) throw locationUpdateErr;
          }

          updatedCount += 1;
        } else {
          if (item.sku) notFoundSkus.push(item.sku);
        }

        // Update received quantity in PO items regardless to reflect processing
        const { error: poiErr } = await supabase
          .from("purchase_order_items")
          .update({ received_quantity: item.quantity })
          .eq("id", item.id);
        if (poiErr) throw poiErr;
      }

      if (updatedCount > 0) {
        await updateStatusMutation.mutateAsync("completed");
        // Refresh all related caches so Inventory and Reports reflect latest stock
        await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });

        toast({
          title: "PO Received",
          description: notFoundSkus.length
            ? `Inventory updated. Missing SKUs not linked to items: ${notFoundSkus.join(", ")}`
            : "Purchase order has been received and inventory updated.",
        });
      } else {
        toast({
          title: "No Items Updated",
          description: "Could not match any PO items to inventory by Item ID or SKU.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to receive purchase order.",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "success";
      case "pending":
      case "draft":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="p-8 space-y-6 print:p-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Order Details</h1>
            <p className="text-muted-foreground mt-1">{po.po_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          {po.status === "draft" && (
            <>
              <Button onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handleSubmit}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </>
          )}
          {po.status === "pending" && isAdmin && (
            <>
              <Button onClick={handleApprove} variant="default">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button onClick={handleReject} variant="destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {po.status === "approved" && isAdmin && (
            <Button onClick={handleReceive} variant="default">
              <Package className="mr-2 h-4 w-4" />
              Receive & Update Stock
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{po.po_number}</CardTitle>
              <p className="text-muted-foreground mt-1">Order Date: {format(new Date(po.order_date), "PPP")}</p>
            </div>
            <Badge variant={getStatusVariant(po.status) as any} className="text-lg px-4 py-2">
              {po.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buyer & Supplier Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Buyer Information</h3>
              <div className="space-y-1 text-sm">
                {po.buyer_company_name && <p className="font-medium">{po.buyer_company_name}</p>}
                {po.buyer_address && <p className="text-muted-foreground whitespace-pre-line">{po.buyer_address}</p>}
                {po.buyer_contact && <p className="text-muted-foreground">{po.buyer_contact}</p>}
              </div>
              {po.billing_address && (
                <>
                  <h4 className="font-semibold mt-4 mb-2">Billing Address</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{po.billing_address}</p>
                </>
              )}
              {po.shipping_address && (
                <>
                  <h4 className="font-semibold mt-4 mb-2">Shipping Address</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{po.shipping_address}</p>
                </>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-3">Supplier Information</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{po.supplier}</p>
                {po.supplier_contact_person && <p className="text-muted-foreground">{po.supplier_contact_person}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Payment Terms:</span>
              <p className="font-medium">{po.payment_terms}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Currency:</span>
              <p className="font-medium">{po.currency}</p>
            </div>
            {po.expected_delivery && (
              <div>
                <span className="text-muted-foreground">Expected Delivery:</span>
                <p className="font-medium">{format(new Date(po.expected_delivery), "PPP")}</p>
              </div>
            )}
            {po.shipping_method && (
              <div>
                <span className="text-muted-foreground">Shipping Method:</span>
                <p className="font-medium">{po.shipping_method}</p>
              </div>
            )}
            {po.fob_terms && (
              <div>
                <span className="text-muted-foreground">FOB Terms:</span>
                <p className="font-medium">{po.fob_terms}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <h3 className="font-semibold mb-4">Order Items</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.item_description || "-"}</TableCell>
                      <TableCell>{item.color || "-"}</TableCell>
                      <TableCell>{item.size || "-"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        {po.currency} {item.cost_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {po.currency} {(item.quantity * item.cost_price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">
                  {po.currency} {po.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax Amount:</span>
                <span className="font-semibold">
                  {po.currency} {po.tax_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Charges:</span>
                <span className="font-semibold">
                  {po.currency} {po.shipping_charges.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>
                  {po.currency} {po.total_cost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {po.special_instructions && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Special Instructions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{po.special_instructions}</p>
              </div>
            </>
          )}

          {po.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Internal Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{po.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderDetail;
