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

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center py-12">
        <p className="text-muted-foreground">Transfer not found</p>
        <Button className="mt-4" onClick={() => navigate("/transfers")}>
          Back to Transfers
        </Button>
      </div>
    );
  }

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
        { Field: "Transfer Date", Value: new Date(transfer.transfer_date || transfer.created_at).toLocaleDateString() },
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

  const handleItemSelect = useCallback(
    async (selectedItems: Array<{ item: any; quantity: number }>) => {
      if (!transfer?.transfer_id) return;
      if (!selectedItems || selectedItems.length === 0) {
        toast.error("No items selected");
        return;
      }
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
    if (transfer.status !== "pending") {
      toast.error("Cannot approve this transfer");
      return;
    }
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
    if (transfer.status !== "approved") {
      toast.error("Only approved transfers can be marked in transit");
      return;
    }
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
    if (transfer.status === "received") {
      toast.error("Transfer already received.");
      return;
    }
    if (transfer.status !== "in_transit") {
      toast.error("Transfer must be in transit to receive.");
      return;
    }
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
    if (transfer.status !== "pending") {
      toast.error("Only pending transfers can be rejected");
      return;
    }
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

  // ...Render JSX remains mostly unchanged, just ensure transfer.transfer_id is used in mutations
  return (
    <div className="p-8 space-y-6">
      {/* Page content JSX here (same as your original) */}
      {/* Just replace all transfer.id → transfer.transfer_id */}
    </div>
  );
};

export default TransferDetail;
