import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, Truck, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useSalesOrder,
  useSalesOrderItems,
  useUpdateSalesOrder,
  useDeleteSalesOrder,
} from "@/hooks/useSalesOrders";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { AttachmentList } from "@/components/documents/AttachmentList";
import { AttachmentUpload } from "@/components/documents/AttachmentUpload";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-500/20 text-blue-700",
  processing: "bg-yellow-500/20 text-yellow-700",
  shipped: "bg-purple-500/20 text-purple-700",
  delivered: "bg-green-500/20 text-green-700",
  cancelled: "bg-destructive/20 text-destructive",
};

const statusFlow = ["draft", "confirmed", "processing", "shipped", "delivered"];

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useSystemSettings();

  const { data: order, isLoading } = useSalesOrder(id!);
  const { data: items } = useSalesOrderItems(id!);
  const updateOrder = useUpdateSalesOrder();
  const deleteOrder = useDeleteSalesOrder();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">Order not found</div>;
  }

  const currentStatusIndex = statusFlow.indexOf(order.status || "draft");
  const canAdvance = currentStatusIndex < statusFlow.length - 1 && order.status !== "cancelled";

  const advanceStatus = () => {
    if (canAdvance) {
      const nextStatus = statusFlow[currentStatusIndex + 1];
      updateOrder.mutate({ id: order.id, status: nextStatus });
    }
  };

  const cancelOrder = () => {
    updateOrder.mutate({ id: order.id, status: "cancelled" });
  };

  const handleDelete = async () => {
    await deleteOrder.mutateAsync(order.id);
    navigate("/sales/orders");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{order.order_number}</h1>
            <p className="text-muted-foreground">
              {order.order_type === "quotation" ? "Quotation" : "Sales Order"}
            </p>
          </div>
          <Badge variant="secondary" className={statusColors[order.status || "draft"]}>
            {order.status || "draft"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <>
              {canAdvance && (
                <Button onClick={advanceStatus} disabled={updateOrder.isPending}>
                  <Truck className="mr-2 h-4 w-4" />
                  Advance to {statusFlow[currentStatusIndex + 1]}
                </Button>
              )}
              <Button variant="outline" onClick={cancelOrder} disabled={updateOrder.isPending}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Sales Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the sales order
                  and all its items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {format(new Date(order.order_date), "MMMM dd, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
                <p className="font-medium">
                  {order.expected_delivery
                    ? format(new Date(order.expected_delivery), "MMMM dd, yyyy")
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{order.payment_terms || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Store</p>
                <p className="font-medium">{order.stores?.name || "N/A"}</p>
              </div>
            </div>
            {order.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customers?.name || "N/A"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{order.customers?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customers?.phone || "N/A"}</p>
              </div>
            </div>
            {order.shipping_address && (
              <div>
                <p className="text-sm text-muted-foreground">Shipping Address</p>
                <p className="font-medium whitespace-pre-line">{order.shipping_address}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.discount_percentage || 0}%
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.line_total || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(order.discount_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(order.tax_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>{formatCurrency(order.shipping_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(order.total_amount || 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attachments</CardTitle>
          <AttachmentUpload entityType="sales_order" entityId={order.id} />
        </CardHeader>
        <CardContent>
          <AttachmentList entityType="sales_order" entityId={order.id} />
        </CardContent>
      </Card>
    </div>
  );
}
