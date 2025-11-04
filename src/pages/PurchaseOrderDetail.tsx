import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
// New imports from the revised hook file
import { usePurchaseOrderDetail, usePOApprovalMutation, useIsPoApprover } from "@/hooks/usePurchaseOrderDetail";
import { ArrowLeft, Printer, Download, Edit, CheckCircle, XCircle, Send, Package, Clock } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Using sonner for toast consistency
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Assuming Item type is defined globally, using any for type safety bypass
type Item = any;

const PurchaseOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Fetch PO details, items, and history
  const { data, isLoading, error } = usePurchaseOrderDetail(id || "");
  // Fetch user's approver status
  const { data: isApprover, isLoading: isApproverLoading } = useIsPoApprover();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject">("approve");
  const [notes, setNotes] = useState("");

  const po = data?.po;
  const items = data?.items || [];
  const history = data?.history || []; // New: Approval History
  const storeName = po?.store?.name || "N/A"; // Use store name from join

  // Hook for the new Approval/Rejection logic
  const poApprovalMutation = usePOApprovalMutation(id || "");

  // Existing mutation for Send/Receive actions (non-approval status updates)
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id || "") });
      toast.success(`PO status updated to ${newStatus}`);
      if (newStatus === "Received") {
        invalidateInventoryData(queryClient);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleUpdateStatus = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  // Handlers for NEW Approval/Rejection Flow
  const openApprovalDialog = (action: "approve" | "reject") => {
    setDialogAction(action);
    setNotes("");
    setIsDialogOpen(true);
  };

  const handleApprovalAction = () => {
    if (!id) return;
    poApprovalMutation.mutate({ action: dialogAction, notes: notes });
    setIsDialogOpen(false);
  };
  // End NEW Handlers

  if (isLoading || isApproverLoading) {
    return <div>Loading Purchase Order...</div>;
  }

  if (error || !po) {
    return <div>Error loading purchase order or PO not found.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Approved":
        return "default";
      case "Awaiting Approval":
        return "secondary";
      case "Sent":
        return "blue";
      case "Received":
        return "success";
      case "Partially Received":
        return "warning";
      case "Rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleDownload = () => {
    const dataToExport = items.map((item) => ({
      "PO Number": po.po_number,
      SKU: item.sku,
      "Item Name": item.item_name,
      Description: item.item_description,
      Color: item.color,
      Size: item.size,
      "Model Number": item.model_number,
      "Quantity Ordered": item.quantity,
      "Quantity Received": item.received_quantity || 0,
      "Cost Price": item.cost_price,
      "Total Cost": item.quantity * item.cost_price,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PO Items");
    XLSX.writeFile(workbook, `${po.po_number}_Items.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Rendering Approval/Action Buttons
  const renderApprovalActions = () => {
    // 1. Approval/Rejection buttons for approvers
    if (po.status === "Awaiting Approval" && isApprover) {
      return (
        <>
          <Button
            onClick={() => openApprovalDialog("approve")}
            variant="success"
            className="flex items-center gap-2"
            disabled={poApprovalMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" /> Approve PO
          </Button>
          <Button
            onClick={() => openApprovalDialog("reject")}
            variant="destructive"
            className="flex items-center gap-2"
            disabled={poApprovalMutation.isPending}
          >
            <XCircle className="h-4 w-4" /> Reject PO
          </Button>
        </>
      );
    }
    // 2. Send button (only if Approved)
    if (po.status === "Approved") {
      return (
        <Button
          onClick={() => handleUpdateStatus("Sent")}
          className="flex items-center gap-2"
          disabled={updateStatusMutation.isPending}
        >
          <Send className="h-4 w-4" /> Send to Supplier
        </Button>
      );
    }
    // 3. Receiving button (only if Sent or Partially Received)
    if (po.status === "Sent" || po.status === "Partially Received") {
      return (
        <Button
          onClick={() => handleUpdateStatus("Received")}
          className="flex items-center gap-2"
          disabled={updateStatusMutation.isPending}
        >
          <Package className="h-4 w-4" /> Complete Receiving
        </Button>
      );
    }
    return null;
  };
  // End Rendering Approval/Action Buttons

  return (
    <div className="p-8 space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Order: {po.po_number}</h1>
            <Badge variant={getStatusBadgeVariant(po.status)} className="mt-1 text-sm">
              {po.status}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {renderApprovalActions()}
          <Button variant="outline" className="flex items-center gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          {/* Edit button should only be visible if status is Draft or Awaiting Approval */}
          {(po.status === "Draft" || po.status === "Awaiting Approval") && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => navigate(`/purchase-orders/edit/${id}`)}
            >
              <Edit className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* PO Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: PO Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>PO Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold">{format(new Date(po.order_date), "PPP")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Expected Delivery</p>
              <p className="font-semibold">
                {po.expected_delivery ? format(new Date(po.expected_delivery), "PPP") : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-semibold">{po.supplier}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Destination Store</p>
              <p className="font-semibold">{storeName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <p className="font-semibold">{po.payment_terms}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Authorized By (Created)</p>
              {/* Display a truncated User ID or N/A */}
              <p className="font-semibold">
                {po.authorized_by ? `User ID: ${po.authorized_by.substring(0, 8)}...` : "N/A"}
              </p>
            </div>
            {/* Display Approved By (NEW) */}
            {po.approved_by && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-semibold">{`User ID: ${po.approved_by.substring(0, 8)}...`}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Committed Cost ({po.currency})</p>
              {/* Note: Committed cost is now the total_cost at the time of creation/approval */}
              <p className="font-semibold text-lg">{po.total_cost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Currency:</span>
              <span className="font-semibold">{po.currency}</span>
            </div>
            {/* Display Exchange Rate (NEW) */}
            {po.exchange_rate && po.exchange_rate !== 1.0 && (
              <div className="flex justify-between">
                <span>Exchange Rate (to USD):</span>
                <span className="font-semibold">{po.exchange_rate.toFixed(4)}</span>
              </div>
            )}
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
          </CardContent>
        </Card>
      </div>

      {/* Card 3: Line Items (No changes from previous) */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Color/Size</TableHead>
                  <TableHead>Qty Ordered</TableHead>
                  <TableHead>Qty Received</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>
                      {item.color || "N/A"} / {item.size || "N/A"}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.received_quantity || 0}</TableCell>
                    <TableCell>
                      {po.currency} {item.cost_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {po.currency} {(item.quantity * item.cost_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Approval History and Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Approval History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {history.length === 0 && (
                <p className="text-muted-foreground text-sm p-2">No approval actions recorded yet.</p>
              )}
              {history.map((h, index) => (
                <div key={index} className="flex items-start space-x-4 border-b pb-2 mb-2 last:border-b-0 last:pb-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {h.approver_id ? h.approver_id.substring(0, 2).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      <Badge variant={h.status_change === "Approved" ? "default" : "destructive"} className="mr-2">
                        {h.status_change}
                      </Badge>
                      by User ID: {h.approver_id ? h.approver_id.substring(0, 8) : "System"}...
                    </p>
                    <p className="text-muted-foreground text-xs">{format(new Date(h.created_at), "PPP pp")}</p>
                    {h.notes && <p className="text-xs italic mt-1">Notes: "{h.notes}"</p>}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {po.special_instructions && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Special Instructions</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line border p-2 rounded-md">
                  {po.special_instructions}
                </p>
              </div>
            )}
            {po.notes && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Internal Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line border p-2 rounded-md">{po.notes}</p>
              </div>
            )}
            {!po.special_instructions && !po.notes && (
              <p className="text-muted-foreground text-sm">No special or internal notes provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval/Rejection Dialog (Confirmation Modal) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction === "approve" ? "Approve Purchase Order" : "Reject Purchase Order"}</DialogTitle>
            <DialogDescription>
              {dialogAction === "approve"
                ? `Confirm approval for PO ${po.po_number}. The status will change to "Approved" and the order can be sent.`
                : `Are you sure you want to reject PO ${po.po_number}? It will be marked as "Rejected" and cannot be processed.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="approval-notes">Notes (Optional)</Label>
            <Textarea
              id="approval-notes"
              placeholder="Add a reason or any required changes."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === "approve" ? "default" : "destructive"}
              onClick={handleApprovalAction}
              disabled={poApprovalMutation.isPending}
            >
              {poApprovalMutation.isPending
                ? `${dialogAction === "approve" ? "Approving" : "Rejecting"}...`
                : `${dialogAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrderDetail;
