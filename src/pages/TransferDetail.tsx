import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
  useReceiveTransfer,
} from "@/hooks/useTransferDetail";
import { TransferItemImport, ImportedItem } from "@/components/TransferItemImport";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

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
    removeItemMutation.mutate({ transferId: transfer.transfer_id, itemId });
  };

  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate({ transferId: transfer.transfer_id, status });
  };

  const handleReceiveTransfer = () => {
    receiveMutation.mutate({
      transferId: transfer.transfer_id,
      items,
      fromStoreId: transfer.from_store_id,
      toStoreId: transfer.to_store_id,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Transfer #{transfer.transfer_number}</h1>
      <p>Date: {transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleString() : "-"}</p>
      <p>Status: {transfer.status}</p>
      <p>Total Items: {transfer.total_items || 0}</p>

      <TransferItemImport
        existingSkus={items.map((i) => i.sku)}
        onImport={(items) => {
          setImportedItems(items);
          handleAddItems(items);
        }}
      />

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
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex gap-2">
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
