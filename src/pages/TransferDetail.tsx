import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
  useReceiveTransfer,
} from "@/hooks/useTransferDetail";
import TransferItemImport, { ImportedItem } from "@/components/TransferItemImport";
import { TransferBarcodeScanner } from "@/components/TransferBarcodeScanner";
import { TransferItemSelector } from "@/components/TransferItemSelector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Transfer, TransferItem } from "@/types/database";

// Local type for items we actually display in selection
interface TransferableItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  category: string;
}

interface EnhancedTransfer extends Transfer {
  from_store_name: string;
  to_store_name: string;
}

export const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id);

  const { data, isLoading } = useTransferDetail(transferId);
  const enhancedTransfer = data?.transfer as EnhancedTransfer | undefined;
  const { transfer, items } = data || { transfer: null, items: [] };

  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveMutation = useReceiveTransfer();

  const { data: allItems = [] } = useQuery<TransferableItem[]>({
    queryKey: ["items-for-transfer", enhancedTransfer?.from_store_id],
    queryFn: async () => {
      if (!enhancedTransfer?.from_store_id) return [];

      const { data: inventory, error } = await supabase
        .from("store_inventory")
        .select(
          `
          quantity,
          items!inner(
            id,
            sku,
            name,
            unit,
            categories!items_category_fkey(name)
          )
        `,
        )
        .eq("store_id", enhancedTransfer.from_store_id)
        .gt("quantity", 0);

      if (error) throw error;

      return (inventory || []).map((inv: any) => ({
        id: inv.items.id,
        sku: inv.items.sku,
        name: inv.items.name,
        unit: inv.items.unit,
        quantity: inv.quantity,
        category: inv.items.categories?.name || "Uncategorized",
      }));
    },
    enabled: !!enhancedTransfer?.from_store_id,
  });

  if (isLoading || !data) return <div>Loading...</div>;

  const existingSkus = allItems.map((item) => item.sku);

  const handleAddItems = (newItems: ImportedItem[]) => {
    addItemsMutation.mutate({
      transferId: transfer.transfer_id,
      items: newItems.map((i) => ({
        sku: i.sku,
        itemName: i.itemName || i.sku, // optional placeholder
        quantity: i.quantity,
      })),
    });
  };

  const handleBarcodeScanned = async (scannedItems: Array<{ sku: string; quantity: number }>) => {
    addItemsMutation.mutate({
      transferId: transfer.transfer_id,
      items: scannedItems.map((i) => ({
        sku: i.sku,
        itemName: allItems.find((a) => a.sku === i.sku)?.name || i.sku,
        quantity: i.quantity,
      })),
    });
  };

  const handleManualSelection = (selectedItems: Array<{ item: TransferableItem; quantity: number }>) => {
    addItemsMutation.mutate({
      transferId: transfer.transfer_id,
      items: selectedItems.map((i) => ({
        sku: i.item.sku,
        itemName: i.item.name,
        quantity: i.quantity,
        itemId: i.item.id,
      })),
    });
  };

  const lookupSku = async (sku: string) => {
    const item = allItems.find((i) => i.sku === sku);
    return item ? { name: item.name } : null;
  };

  const handleRemoveItem = (itemId: string) => {
    if (["shipped", "received"].includes(transfer.status)) {
      toast.error("Cannot remove items from a shipped or received transfer.");
      return;
    }
    removeItemMutation.mutate({ transferId: transfer.transfer_id, itemId });
  };

  const handleUpdateStatus = (status: "approved" | "shipped") => {
    updateStatusMutation.mutate({ transferId: transfer.transfer_id, status });
  };

  const handleReceiveTransfer = () => {
    receiveMutation.mutate({ transferId: transfer.transfer_id });
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Transfer #{transfer.transfer_number}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="font-medium">From Store:</p>
          <p>{enhancedTransfer?.from_store_name || "N/A"}</p>
        </div>
        <div>
          <p className="font-medium">To Store:</p>
          <p>{enhancedTransfer?.to_store_name || "N/A"}</p>
        </div>
        <div>
          <p className="font-medium">Status:</p>
          <p className="font-semibold capitalize">{transfer.status}</p>
        </div>
        <div>
          <p className="font-medium">Total Items:</p>
          <p>{transfer.total_items || 0}</p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Add Items to Transfer</h2>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual">Manual Selection</TabsTrigger>
            <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
            <TabsTrigger value="excel">Excel Import</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            <TransferItemSelector items={allItems} onSelect={handleManualSelection} />
          </TabsContent>

          <TabsContent value="barcode" className="mt-4">
            <TransferBarcodeScanner onScan={handleBarcodeScanned} onLookupSku={lookupSku} />
          </TabsContent>

          <TabsContent value="excel" className="mt-4">
            <TransferItemImport onImport={handleAddItems} existingSkus={existingSkus} />
          </TabsContent>

          <TabsContent value="sheets" className="mt-4">
            <TransferItemImport onImport={handleAddItems} existingSkus={existingSkus} />
          </TabsContent>
        </Tabs>
      </Card>

      <h2 className="text-2xl font-semibold mt-8">Transfer Items ({items.length})</h2>
      {items.length > 0 && (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Requested Qty</TableHead>
                <TableHead>Received Qty</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: TransferItem) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.requested_quantity || 0}</TableCell>
                  <TableCell>{item.received_quantity || 0}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={["shipped", "received"].includes(transfer.status)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={() => handleUpdateStatus("approved")} disabled={transfer.status !== "pending"}>
          Approve
        </Button>
        <Button onClick={() => handleUpdateStatus("shipped")} disabled={transfer.status !== "approved"}>
          Ship
        </Button>
        <Button onClick={handleReceiveTransfer} disabled={transfer.status !== "shipped"}>
          Receive
        </Button>
      </div>
    </div>
  );
};

export default TransferDetailPage;
