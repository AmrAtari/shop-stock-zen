import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
  useReceiveTransfer,
  TransferableItem, // FIX 1: Import TransferableItem from the hook file
} from "@/hooks/useTransferDetail";

// FIX 2: Corrected imports to use named exports for the component and its type
import { TransferItemImport, ImportedItem } from "@/components/TransferItemImport";

import { TransferBarcodeScanner } from "@/components/TransferBarcodeScanner";
import { TransferItemSelector } from "@/components/TransferItemSelector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Transfer, TransferItem } from "@/types/database";

// Interface to allow access to joined store names
interface EnhancedTransfer extends Transfer {
  from_store_name: string;
  to_store_name: string;
}

export const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id);

  const { data, isLoading } = useTransferDetail(transferId);
  // Casting data?.transfer to EnhancedTransfer
  const enhancedTransfer = data?.transfer as EnhancedTransfer | undefined;
  const { items: transferItems = [] } = data || {};

  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveMutation = useReceiveTransfer();

  // fetch available items from store_inventory
  const { data: availableItems = [] } = useQuery<TransferableItem[]>({
    queryKey: ["store-inventory", enhancedTransfer?.from_store_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_inventory")
        .select(
          `
            quantity,
            items!inner(
              id, sku, name, unit, categories!items_category_fkey(name)
            )
          `,
        )
        .eq("store_id", enhancedTransfer?.from_store_id)
        .gt("quantity", 0);

      if (error) throw error;

      return (data || []).map((inv: any) => ({
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

  const existingSkus = availableItems.map((i) => i.sku);

  const handleAddItems = (newItems: ImportedItem[]) => {
    addItemsMutation.mutate({
      transferId: transferId,
      items: newItems.map((i) => ({
        sku: i.sku,
        itemName: i.itemName || "",
        quantity: i.quantity,
      })),
    });
  };

  // Using TransferableItem from the hook to match the data source (availableItems)
  const handleManualSelection = (selectedItems: Array<{ item: TransferableItem; quantity: number }>) => {
    addItemsMutation.mutate({
      transferId,
      items: selectedItems.map((i) => ({
        sku: i.item.sku,
        itemName: i.item.name,
        quantity: i.quantity,
        item_id: i.item.id,
      })),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (["shipped", "received"].includes(enhancedTransfer?.status || "")) {
      toast.error("Cannot remove items from a shipped or received transfer.");
      return;
    }
    removeItemMutation.mutate({ transferId, itemId });
  };

  if (isLoading || !data) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
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
        <h2 className="text-xl font-semibold mb-4">Add Items</h2>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="barcode">Barcode</TabsTrigger>
            <TabsTrigger value="excel">Excel</TabsTrigger>
            <TabsTrigger value="sheets">Sheets</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            <TransferItemSelector items={availableItems} onSelect={handleManualSelection} />
          </TabsContent>

          <TabsContent value="barcode" className="mt-4">
            <TransferBarcodeScanner
              onScan={(scanned) =>
                addItemsMutation.mutate({
                  transferId,
                  items: scanned.map((i) => ({ sku: i.sku, itemName: "", quantity: i.quantity })),
                })
              }
              onLookupSku={async (sku) => {
                const item = availableItems.find((i) => i.sku === sku);
                return item ? { name: item.name } : null;
              }}
            />
          </TabsContent>

          <TabsContent value="excel" className="mt-4">
            <TransferItemImport onImport={handleAddItems} existingSkus={existingSkus} />
          </TabsContent>

          <TabsContent value="sheets" className="mt-4">
            <TransferItemImport onImport={handleAddItems} existingSkus={existingSkus} />
          </TabsContent>
        </Tabs>
      </Card>

      <h2 className="text-2xl font-semibold mt-8">Transfer Items ({transferItems.length})</h2>
      {transferItems.length > 0 && (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Requested Qty</TableHead>
                <TableHead>Received Qty</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.requested_quantity}</TableCell>
                  <TableCell>{item.received_quantity}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={["shipped", "received"].includes(enhancedTransfer?.status || "")}
                      onClick={() => handleRemoveItem(item.id)}
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
        <Button
          onClick={() => updateStatusMutation.mutate({ transferId, status: "approved" })}
          disabled={enhancedTransfer?.status !== "pending"}
        >
          Approve
        </Button>
        <Button
          onClick={() => updateStatusMutation.mutate({ transferId, status: "shipped" })}
          disabled={enhancedTransfer?.status !== "approved"}
        >
          Ship
        </Button>
        <Button
          onClick={() => receiveMutation.mutate({ transferId })}
          disabled={enhancedTransfer?.status !== "shipped"}
        >
          Receive
        </Button>
      </div>
    </div>
  );
};

export default TransferDetailPage;
