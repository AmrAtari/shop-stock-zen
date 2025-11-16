import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Trash2 } from "lucide-react";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
  useReceiveTransfer,
} from "@/hooks/useTransferDetail";
import { TransferItemImport } from "@/components/TransferItemImport";

const TransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useTransferDetail(id || "");
  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();
  const receiveMutation = useReceiveTransfer();

  const [showAddItems, setShowAddItems] = useState(false);

  if (isLoading) return <div>Loading transfer...</div>;
  if (error) return <div className="text-red-600">Error: {(error as Error).message}</div>;
  if (!data) return <div>No transfer found</div>;

  const { transfer, items } = data;

  const handleItemImport = useCallback(
    async (importedItems: any[]) => {
      if (!transfer?.transfer_id) return;
      try {
        await addItemsMutation.mutateAsync({
          transferId: transfer.transfer_id,
          items: importedItems.map((i) => ({
            sku: i.sku,
            itemName: i.item_name || i.sku,
            quantity: i.quantity,
            itemId: i.item_id,
          })),
        });
        toast.success("Items added successfully");
        setShowAddItems(false);
      } catch (err) {
        console.error(err);
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
        toast.success("Item removed");
      } catch (err) {
        console.error(err);
        toast.error("Failed to remove item");
      }
    },
    [removeItemMutation, transfer],
  );

  const handleApprove = async () => {
    if (!transfer?.transfer_id) return;
    try {
      await updateStatusMutation.mutateAsync({ transferId: transfer.transfer_id, status: "approved" });
      toast.success("Transfer approved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve transfer");
    }
  };

  const handleReceive = async () => {
    if (!transfer?.transfer_id) return;
    try {
      await receiveMutation.mutateAsync({
        transferId: transfer.transfer_id,
        items,
        fromStoreId: transfer.from_store_id,
        toStoreId: transfer.to_store_id,
      });
      toast.success("Transfer received successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to receive transfer");
    }
  };

  return (
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Transfer {transfer.transfer_number}</h2>
        <div className="flex gap-2">
          {transfer.status === "pending" && <Button onClick={() => setShowAddItems(true)}>Add Items</Button>}
          {transfer.status === "pending" && (
            <Button variant="secondary" onClick={handleApprove}>
              Approve
            </Button>
          )}
          {transfer.status === "approved" && <Button onClick={handleReceive}>Receive</Button>}
        </div>
      </div>

      {showAddItems && <TransferItemImport onImport={handleItemImport} existingSkus={items.map((i) => i.sku)} />}

      <div className="border rounded-lg max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </TableCell>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                <TableCell>{item.item_name || "-"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  {transfer.status === "pending" && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransferDetail;
