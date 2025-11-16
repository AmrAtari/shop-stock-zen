import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { TransferItemImport, ImportedItem } from "@/components/TransferItemImport";
import {
  useTransferDetail,
  useAddTransferItems,
  useRemoveTransferItem,
  useUpdateTransferStatus,
} from "@/hooks/useTransferDetail";
import { Transfer, TransferItem } from "@/types/database";

interface ScannedItem {
  sku: string;
  itemName?: string;
  quantity: number;
}

export const TransferDetail = () => {
  const { transferId } = useParams<{ transferId: string }>();
  const numericTransferId = Number(transferId);

  const { data, isLoading } = useTransferDetail(numericTransferId);
  const addItemsMutation = useAddTransferItems();
  const removeItemMutation = useRemoveTransferItem();
  const updateStatusMutation = useUpdateTransferStatus();

  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

  if (isLoading || !data) return <div>Loading...</div>;

  const { transfer, items } = data;

  const handleAddItems = (newItems: ImportedItem[] | ScannedItem[]) => {
    const formattedItems = newItems.map((i) => ({
      item: { sku: i.sku, itemName: i.itemName },
      quantity: i.quantity,
    }));
    addItemsMutation.mutate({ transferId: transfer.transfer_id, items: formattedItems });
  };

  const handleRemoveItem = (item: TransferItem) => {
    removeItemMutation.mutate({ itemId: item.id!, transferId: transfer.transfer_id });
  };

  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate({ transferId: transfer.transfer_id, status });
  };

  const stats = {
    total: items.length,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Transfer Detail: {transfer.transfer_number}</h1>
        <div>
          <Button onClick={() => handleUpdateStatus("approved")}>Approve</Button>
          <Button onClick={() => handleUpdateStatus("received")} className="ml-2">
            Receive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div>
            <strong>From Store:</strong> {transfer.from_store_id}
          </div>
          <div>
            <strong>To Store:</strong> {transfer.to_store_id}
          </div>
        </div>
        <div>
          <div>
            <strong>Transfer Date:</strong>{" "}
            {transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleString() : "-"}
          </div>
          <div>
            <strong>Status:</strong> {transfer.status}
          </div>
        </div>
      </div>

      <TransferItemImport
        existingSkus={items.map((i) => i.sku)}
        onImport={(importedItems) => handleAddItems(importedItems)}
      />

      {items.length > 0 && (
        <>
          <Alert>
            <AlertDescription>
              <div className="flex gap-4">
                <span>Total Items: {stats.total}</span>
                <span>Total Quantity: {stats.totalQuantity}</span>
              </div>
            </AlertDescription>
          </Alert>

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
                  <TableRow key={item.id} className={item.quantity <= 0 ? "bg-destructive/10" : ""}>
                    <TableCell>
                      {item.quantity > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.item_name || "-"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveItem(item)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferDetail;
