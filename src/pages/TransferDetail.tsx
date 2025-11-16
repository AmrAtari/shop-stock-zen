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
import { format } from "date-fns";

export const TransferDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const transferId = Number(id); // transfer_id is number
  const { data, isLoading } = useTransferDetail(transferId);
  const addTransferItems = useAddTransferItems();
  const removeTransferItem = useRemoveTransferItem();
  const updateTransferStatus = useUpdateTransferStatus();
  const receiveTransfer = useReceiveTransfer();

  const [selectedItems, setSelectedItems] = useState<ImportedItem[]>([]);

  if (isLoading || !data) return <div>Loading...</div>;

  const { transfer, items } = data;

  const handleImportItems = (imported: ImportedItem[]) => {
    // Add imported items to transfer
    const formattedItems = imported.map((i) => ({
      sku: i.sku,
      itemName: i.itemName || "",
      quantity: i.quantity,
    }));

    addTransferItems.mutate(
      { transferId: transfer.transfer_id, items: formattedItems },
      {
        onSuccess: () => toast.success("Items added successfully"),
        onError: (err: any) => toast.error(err.message),
      },
    );
  };

  const handleRemoveItem = (itemId: number) => {
    removeTransferItem.mutate(
      { itemId, transferId: transfer.transfer_id },
      {
        onSuccess: () => toast.success("Item removed"),
        onError: (err: any) => toast.error(err.message),
      },
    );
  };

  const handleStatusUpdate = (status: string) => {
    updateTransferStatus.mutate(
      { transferId: transfer.transfer_id, status },
      {
        onSuccess: () => toast.success(`Status updated to ${status}`),
        onError: (err: any) => toast.error(err.message),
      },
    );
  };

  const handleReceiveTransfer = () => {
    receiveTransfer.mutate(
      {
        transferId: transfer.transfer_id,
        items,
        fromStoreId: transfer.from_store_id,
        toStoreId: transfer.to_store_id,
      },
      {
        onSuccess: () => toast.success("Transfer received successfully"),
        onError: (err: any) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Transfer Detail: {transfer.transfer_number}</h1>
      <div>
        <p>
          <strong>Status:</strong> {transfer.status}
        </p>
        <p>
          <strong>Transfer Date:</strong>{" "}
          {transfer.transfer_date ? format(new Date(transfer.transfer_date), "PPP p") : "-"}
        </p>
        <p>
          <strong>Total Items:</strong> {transfer.total_items || 0}
        </p>
      </div>

      <TransferItemImport onImport={handleImportItems} existingSkus={items.map((i) => i.sku)} />

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
                  <Button size="sm" variant="destructive" onClick={() => handleRemoveItem(item.id)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => handleStatusUpdate("approved")}>Approve</Button>
        <Button onClick={() => handleStatusUpdate("shipped")}>Ship</Button>
        <Button onClick={handleReceiveTransfer}>Receive</Button>
      </div>
    </div>
  );
};
