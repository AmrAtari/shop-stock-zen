// src/pages/TransferDetail.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
  useReceiveTransfer,
} from "@/hooks/useTransferDetail";
// 🛠️ FIX APPLIED HERE: Changed TransferItemImport to a default import
import TransferItemImport, { ImportedItem } from "@/components/TransferItemImport";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
// NOTE: Assuming TransferBarcodeScanner and TransferItemSelector are imported later
// import { TransferBarcodeScanner } from "@/components/TransferBarcodeScanner";
// import { TransferItemSelector } from "@/components/TransferItemSelector";

export const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id); // Ensure it's a number
  const { data, isLoading } = useTransferDetail(transferId);

  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveMutation = useReceiveTransfer();

  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);

  if (isLoading || !data) return <div>Loading...</div>;

  const { transfer, items } = data;

  const handleAddItems = (newItems: ImportedItem[]) => {
    addItemsMutation.mutate({
      transferId: transfer.transfer_id,
      items: newItems.map((i) => ({ sku: i.sku, itemName: i.itemName || "", quantity: i.quantity })),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    // Only allow removal if the transfer is not yet shipped or received
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
          <p>{transfer.from_store_name || "N/A"}</p>
        </div>
        <div>
          <p className="font-medium">To Store:</p>
          <p>{transfer.to_store_name || "N/A"}</p>
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

      {/* Transfer Item Management Components (Now loading correctly) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Assuming TransferItemSelector and TransferBarcodeScanner are also implemented */}
        <TransferItemImport onImport={handleAddItems} existingSkus={[]} />
        {/* <TransferItemSelector ... /> */}
        {/* <TransferBarcodeScanner ... /> */}
      </div>

      <h2 className="text-2xl font-semibold mt-8">Items ({items.length})</h2>
      {items.length > 0 && (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      // Disable button if transfer is shipped or received
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
