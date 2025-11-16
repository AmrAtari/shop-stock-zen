// src/pages/TransferDetail.tsx
import { useParams, useNavigate } from "react-router-dom";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransferItemSelector } from "@/components/TransferItemSelector";
import { TransferBarcodeScanner } from "@/components/TransferBarcodeScanner";
import { TransferItemImport } from "@/components/TransferItemImport";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
  useReceiveTransfer,
} from "@/hooks/useTransferDetail";
import { useStores } from "@/hooks/useTransfers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, CheckCircle, XCircle, Truck, Package, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const TransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data hooks
  const { data, isLoading } = useTransferDetail(id || "");
  const { data: stores } = useStores();
  const { isAdmin } = useIsAdmin();

  const [showAddItems, setShowAddItems] = useState(false);

  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveTransferMutation = useReceiveTransfer();

  const isMutating = useCallback((m: any) => Boolean(m?.isLoading || m?.isPending || false), []);

  const { data: rawInventoryItems } = useQuery({
    queryKey: ["inventory-for-transfer"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("items")
        .select(
          `
          *,
          supplier:suppliers(name),
          gender:genders(name),
          main_group:main_groups(name),
          category:categories(name),
          origin:origins(name),
          season:seasons(name),
          size:sizes(name),
          color:colors(name),
          theme:themes(name)
        `,
        )
        .order("name");
      if (error) throw error;

      return (rows || []).map((item: any) => ({
        ...item,
        supplier: item.supplier?.name || "",
        gender: item.gender?.name || "",
        main_group: item.main_group?.name || "",
        category: item.category?.name || "",
        origin: item.origin?.name || "",
        season: item.season?.name || "",
        size: item.size?.name || "",
        color: item.color?.name || "",
        theme: item.theme?.name || "",
      }));
    },
  });

  const inventoryItems = useMemo(() => rawInventoryItems || [], [rawInventoryItems]);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  if (isLoading) return <div className="p-8">Loading...</div>;

  if (!data)
    return (
      <div className="p-8 text-center py-12">
        <p className="text-muted-foreground">Transfer not found</p>
        <Button className="mt-4" onClick={() => navigate("/transfers")}>
          Back to Transfers
        </Button>
      </div>
    );

  const { transfer, items } = data;

  const getStoreName = useCallback(
    (storeId: string | null) => {
      if (!storeId || !stores) return "Unknown";
      const store = stores.find((s: any) => s.id === storeId);
      return store?.name || "Unknown";
    },
    [stores],
  );

  const getStatusVariant = useCallback((status: string) => {
    switch (status) {
      case "received":
        return "success";
      case "approved":
      case "in_transit":
        return "default";
      case "pending":
        return "warning";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  }, []);

  const isPending = transfer.status === "pending";
  const isApproved = transfer.status === "approved";
  const isInTransit = transfer.status === "in_transit";
  const canEdit = isPending;

  const handleExportExcel = useCallback(() => {
    try {
      const rows: any[] = [
        { Field: "Transfer Number", Value: transfer.transfer_number },
        { Field: "From Store", Value: getStoreName(transfer.from_store_id) },
        { Field: "To Store", Value: getStoreName(transfer.to_store_id) },
        {
          Field: "Transfer Date",
          Value: transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : "",
        },
        { Field: "Status", Value: transfer.status },
        { Field: "Reason", Value: transfer.reason || "" },
        {},
        { Field: "ITEMS", Value: "" },
        ...items.map((item: any) => ({
          SKU: item.sku,
          Name: item.item_name,
          Quantity: item.quantity,
        })),
      ];

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transfer");
      XLSX.writeFile(workbook, `Transfer_${transfer.transfer_number}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export Excel");
    }
  }, [transfer, items, getStoreName]);

  // Handlers (add, remove, approve, reject, receive) - all using transfer.transfer_id
  const handleItemSelect = useCallback(
    async (selectedItems: Array<{ item: any; quantity: number }>) => {
      if (!transfer?.transfer_id) return;
      if (!selectedItems || selectedItems.length === 0) return toast.error("No items selected");

      try {
        await addItemsMutation.mutateAsync({
          transferId: transfer.transfer_id,
          items: selectedItems.map((si) => ({
            sku: si.item.sku,
            itemName: si.item.name || si.item.item_name || si.item.sku,
            quantity: si.quantity,
            itemId: si.item.id,
          })),
        });
        toast.success("Items added to transfer");
        setShowAddItems(false);
      } catch (error) {
        console.error("Add items failed", error);
        toast.error("Failed to add items");
      }
    },
    [addItemsMutation, transfer],
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (!transfer?.transfer_id) return;
      try {
        await removeItemMutation.mutateAsync({ itemId, transferId: transfer.transfer_id });
        toast.success("Item removed from transfer");
      } catch (error) {
        console.error("Remove item failed", error);
        toast.error("Failed to remove item");
      }
    },
    [removeItemMutation, transfer],
  );

  const handleApprove = useCallback(async () => {
    if (!transfer?.transfer_id) return;
    if (transfer.status !== "pending") return toast.error("Cannot approve this transfer");

    try {
      await updateStatusMutation.mutateAsync({
        transferId: transfer.transfer_id,
        status: "approved",
        userId: currentUser?.id,
      });
      toast.success("Transfer approved");
    } catch (error) {
      console.error("Approve failed", error);
      toast.error("Failed to approve transfer");
    }
  }, [updateStatusMutation, transfer, currentUser]);

  const handleMarkInTransit = useCallback(async () => {
    if (!transfer?.transfer_id) return;
    if (transfer.status !== "approved") return toast.error("Only approved transfers can be marked in transit");

    try {
      await updateStatusMutation.mutateAsync({
        transferId: transfer.transfer_id,
        status: "in_transit",
      });
      toast.success("Transfer marked as in transit");
    } catch (error) {
      console.error("Mark in transit failed", error);
      toast.error("Failed to update status");
    }
  }, [updateStatusMutation, transfer]);

  const handleReceive = useCallback(async () => {
    if (!transfer?.transfer_id) return;
    if (transfer.status !== "in_transit") return toast.error("Transfer must be in transit to receive");

    try {
      await receiveTransferMutation.mutateAsync({
        transferId: transfer.transfer_id,
        items,
        fromStoreId: transfer.from_store_id,
        toStoreId: transfer.to_store_id,
      });
      toast.success("Transfer received and inventory updated");
    } catch (error) {
      console.error("Receive failed", error);
      toast.error("Failed to receive transfer");
    }
  }, [receiveTransferMutation, transfer, items]);

  const handleReject = useCallback(async () => {
    if (!transfer?.transfer_id) return;
    if (transfer.status !== "pending") return toast.error("Only pending transfers can be rejected");

    try {
      await updateStatusMutation.mutateAsync({
        transferId: transfer.transfer_id,
        status: "rejected",
      });
      toast.success("Transfer rejected");
    } catch (error) {
      console.error("Reject failed", error);
      toast.error("Failed to reject transfer");
    }
  }, [updateStatusMutation, transfer]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/transfers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Transfer Voucher</h1>
            <p className="text-muted-foreground mt-1">{transfer.transfer_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={isMutating({})}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>

          {isPending && isAdmin && (
            <>
              <Button onClick={handleApprove} disabled={isMutating(updateStatusMutation)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button onClick={handleReject} variant="destructive" disabled={isMutating(updateStatusMutation)}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </>
          )}

          {isApproved && isAdmin && (
            <Button onClick={handleMarkInTransit} disabled={isMutating(updateStatusMutation)}>
              <Truck className="mr-2 h-4 w-4" /> Mark In Transit
            </Button>
          )}

          {isInTransit && (
            <Button onClick={handleReceive} disabled={isMutating(receiveTransferMutation)}>
              {isMutating(receiveTransferMutation) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Receiving...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" /> Receive & Update Stock
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{transfer.transfer_number}</CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  Transfer Date: {transfer.transfer_date ? format(new Date(transfer.transfer_date), "PPP") : "-"}
                </span>
                {transfer.reason && <span>• Reason: {transfer.reason}</span>}
              </div>
            </div>
            <Badge variant={(getStatusVariant(transfer.status) as any) ?? "secondary"} className="text-lg px-4 py-2">
              {String(transfer.status).toUpperCase().replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Store Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Source Store</h3>
              <p className="text-lg">{getStoreName(transfer.from_store_id)}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Destination Store</h3>
              <p className="text-lg">{getStoreName(transfer.to_store_id)}</p>
            </div>
          </div>

          <Separator />

          {/* Reason / Notes */}
          {transfer.reason && (
            <div>
              <h3 className="font-semibold mb-2">Reason</h3>
              <p className="text-muted-foreground">{transfer.reason}</p>
            </div>
          )}

          {transfer.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-muted-foreground whitespace-pre-line">{transfer.notes}</p>
            </div>
          )}

          <Separator />

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Transfer Items ({items.length})</h3>
              {canEdit && (
                <Button onClick={() => setShowAddItems((s) => !s)} disabled={isMutating(addItemsMutation)}>
                  {showAddItems ? "Hide" : "Add Items"}
                </Button>
              )}
            </div>

            {showAddItems && canEdit && (
              <Tabs defaultValue="select" className="mb-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="select">Select from Inventory</TabsTrigger>
                  <TabsTrigger value="scan">Barcode Scanner</TabsTrigger>
                  <TabsTrigger value="import">Import Excel</TabsTrigger>
                </TabsList>
                <TabsContent value="select" className="mt-4">
                  <TransferItemSelector items={inventoryItems || []} onSelect={handleItemSelect} />
                </TabsContent>
                <TabsContent value="scan" className="mt-4">
                  <TransferBarcodeScanner
                    onScan={handleItemSelect}
                    onLookupSku={async (sku) => inventoryItems.find((i) => i.sku === sku) || null}
                  />
                </TabsContent>
                <TabsContent value="import" className="mt-4">
                  <TransferItemImport
                    onImport={handleItemSelect}
                    existingSkus={inventoryItems.map((i) => i.sku) || []}
                  />
                </TabsContent>
              </Tabs>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    {canEdit && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                        No items added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: any, index: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isMutating(removeItemMutation)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferDetail;
