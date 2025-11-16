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
import TransferItemImport, { ImportedItem } from "@/components/TransferItemImport";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Transfer, TransferItem } from "@/types/database";

// Define an extended type locally to satisfy TypeScript
interface EnhancedTransfer extends Transfer {
  from_store_name: string;
  to_store_name: string;
}

export const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id);
  const { data, isLoading } = useTransferDetail(transferId);

  // These now correctly hold the mutation objects, fixing the 'mutate does not exist on type void' errors
  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveMutation = useReceiveTransfer();

  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);

  if (isLoading || !data) return <div>Loading...</div>;

  const { transfer, items } = data;
  const enhancedTransfer = transfer as EnhancedTransfer;

  const handleAddItems = (newItems: ImportedItem[]) => {
    addItemsMutation.mutate({
      // Now valid
      transferId: enhancedTransfer.transfer_id,
      items: newItems.map((i) => ({ sku: i.sku, itemName: i.itemName || "", quantity: i.quantity })),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (["shipped", "received"].includes(enhancedTransfer.status)) {
      toast.error("Cannot remove items from a shipped or received transfer.");
      return;
    }
    removeItemMutation.mutate({ transferId: enhancedTransfer.transfer_id, itemId }); // Now valid
  };

  const handleUpdateStatus = (status: "approved" | "shipped") => {
    updateStatusMutation.mutate({ transferId: enhancedTransfer.transfer_id, status }); // Now valid
  };

  const handleReceiveTransfer = () => {
    receiveMutation.mutate({ transferId: enhancedTransfer.transfer_id }); // Now valid
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Transfer #{enhancedTransfer.transfer_number}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="font-medium">From Store:</p>
          <p>{enhancedTransfer.from_store_name || "N/A"}</p>
        </div>
        <div>
          <p className="font-medium">To Store:</p>
          <p>{enhancedTransfer.to_store_name || "N/A"}</p>
        </div>
        <div>
          <p className="font-medium">Status:</p>
          <p className="font-semibold capitalize">{enhancedTransfer.status}</p>
        </div>
        <div>
          <p className="font-medium">Total Items:</p>
          <p>{enhancedTransfer.total_items || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TransferItemImport onImport={handleAddItems} existingSkus={[]} />
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
                      disabled={["shipped", "received"].includes(enhancedTransfer.status)}
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
        <Button onClick={() => handleUpdateStatus("approved")} disabled={enhancedTransfer.status !== "pending"}>
          Approve
        </Button>
        <Button onClick={() => handleUpdateStatus("shipped")} disabled={enhancedTransfer.status !== "approved"}>
          Ship
        </Button>
        <Button onClick={handleReceiveTransfer} disabled={enhancedTransfer.status !== "shipped"}>
          Receive
        </Button>
      </div>
    </div>
  );
};
export default TransferDetailPage;
