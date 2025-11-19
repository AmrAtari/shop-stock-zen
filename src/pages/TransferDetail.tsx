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
import { TransferItemSelector, TransferSelectorItem } from "@/components/TransferItemSelector";
import { TransferItemImport } from "@/components/TransferItemImport";
import { TransferBarcodeScanner } from "@/components/TransferBarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Transfer, TransferItem } from "@/types/database";

export const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id);

  const { data, isLoading } = useTransferDetail(transferId);
  const enhancedTransfer = data?.transfer as Transfer | undefined;
  const items = data?.items || [];

  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveMutation = useReceiveTransfer();

  // Convert store_inventory -> TransferSelectorItem for selector
  const { data: allItems = [] } = useQuery<TransferSelectorItem[]>({
    queryKey: ["items-for-transfer", enhancedTransfer?.from_store_id],
    queryFn: async () => {
      if (!enhancedTransfer?.from_store_id) return [];
      const { data: inv, error } = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/store_inventory?select=quantity,items(id,sku,name,unit,category)&store_id=eq.${enhancedTransfer.from_store_id}&quantity=gt.0`,
      ).then((r) => r.json());
      if (error) throw error;
      return inv.map((i: any) => ({
        id: i.items.id,
        sku: i.items.sku,
        name: i.items.name,
        unit: i.items.unit,
        quantity: i.quantity,
        category: i.items.category?.name || null,
      }));
    },
    enabled: !!enhancedTransfer?.from_store_id,
  });

  if (isLoading || !data) return <div>Loading...</div>;

  const handleAddItems = (newItems: Array<{ item: TransferSelectorItem; quantity: number }>) => {
    addItemsMutation.mutate({
      transferId: transferId,
      items: newItems.map((i) => ({
        sku: i.item.sku,
        itemName: i.item.name,
        quantity: i.quantity,
      })),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (["shipped", "received"].includes(enhancedTransfer?.status || "")) {
      toast.error("Cannot remove items from shipped or received transfer.");
      return;
    }
    removeItemMutation.mutate({ transferId, itemId });
  };

  const handleUpdateStatus = (status: "approved" | "shipped") => {
    updateStatusMutation.mutate({ transferId, status });
  };

  const handleReceiveTransfer = () => {
    receiveMutation.mutate({ transferId });
  };

  const existingSkus = allItems.map((i) => i.sku);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Transfer #{enhancedTransfer?.transfer_number}</h1>

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
          <p className="font-semibold capitalize">{enhancedTransfer?.status}</p>
        </div>
        <div>
          <p className="font-medium">Total Items:</p>
          <p>{enhancedTransfer?.total_items || 0}</p>
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
            <TransferItemSelector items={allItems} onSelect={handleAddItems} />
          </TabsContent>

          <TabsContent value="barcode" className="mt-4">
            <TransferBarcodeScanner
              onScan={(scannedItems) =>
                handleAddItems(scannedItems.map((i) => ({ item: { ...i, name: i.name }, quantity: i.quantity })))
              }
              onLookupSku={async (sku) => {
                const found = allItems.find((i) => i.sku === sku);
                return found ? { name: found.name } : null;
              }}
            />
          </TabsContent>

          <TabsContent value="excel" className="mt-4">
            <TransferItemImport
              onImport={(items) =>
                handleAddItems(items.map((i) => ({ item: { ...i, name: i.itemName }, quantity: i.quantity })))
              }
              existingSkus={existingSkus}
            />
          </TabsContent>

          <TabsContent value="sheets" className="mt-4">
            <TransferItemImport
              onImport={(items) =>
                handleAddItems(items.map((i) => ({ item: { ...i, name: i.itemName }, quantity: i.quantity })))
              }
              existingSkus={existingSkus}
            />
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
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.requested_quantity}</TableCell>
                  <TableCell>{item.received_quantity}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={["shipped", "received"].includes(enhancedTransfer?.status || "")}
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
        <Button onClick={() => handleUpdateStatus("approved")} disabled={enhancedTransfer?.status !== "pending"}>
          Approve
        </Button>
        <Button onClick={() => handleUpdateStatus("shipped")} disabled={enhancedTransfer?.status !== "approved"}>
          Ship
        </Button>
        <Button onClick={handleReceiveTransfer} disabled={enhancedTransfer?.status !== "shipped"}>
          Receive
        </Button>
      </div>
    </div>
  );
};

export default TransferDetailPage;
