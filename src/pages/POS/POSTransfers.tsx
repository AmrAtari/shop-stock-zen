import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Package, CheckCircle, XCircle, Truck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePOS } from "./POSContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

type Transfer = {
  transfer_id: number;
  transfer_number: string;
  from_store_id: string;
  to_store_id: string;
  status: string;
  reason: string;
  notes: string;
  request_date: string;
  from_store: { name: string; location: string };
  to_store: { name: string; location: string };
};

type TransferItem = {
  id: string;
  item_id: string;
  requested_quantity: number;
  approved_quantity: number | null;
  shipped_quantity: number | null;
  received_quantity: number;
  items: { name: string; sku: string };
};

const POSTransfers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { storeId } = usePOS();
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  // Fetch transfers
  const { data: outgoingTransfers = [] } = useQuery({
    queryKey: ["transfers", "outgoing", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select(`
          *,
          from_store:stores!transfers_from_store_id_fkey(name, location),
          to_store:stores!transfers_to_store_id_fkey(name, location)
        `)
        .eq("to_store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transfer[];
    },
  });

  const { data: incomingTransfers = [] } = useQuery({
    queryKey: ["transfers", "incoming", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select(`
          *,
          from_store:stores!transfers_from_store_id_fkey(name, location),
          to_store:stores!transfers_to_store_id_fkey(name, location)
        `)
        .eq("from_store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transfer[];
    },
  });

  // Fetch transfer items
  const { data: transferItems = [] } = useQuery({
    queryKey: ["transfer-items", selectedTransfer?.transfer_id],
    queryFn: async () => {
      if (!selectedTransfer) return [];
      const { data, error } = await supabase
        .from("transfer_items")
        .select("*, items(name, sku)")
        .eq("transfer_id", selectedTransfer.transfer_id);

      if (error) throw error;
      return data as TransferItem[];
    },
    enabled: !!selectedTransfer,
  });

  // Approve transfer
  const approveMutation = useMutation({
    mutationFn: async ({ transferId, items }: { transferId: number; items: { id: string; qty: number }[] }) => {
      // Update transfer status
      const { error: transferError } = await supabase
        .from("transfers")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("transfer_id", transferId);

      if (transferError) throw transferError;

      // Update approved quantities
      for (const item of items) {
        const { error } = await supabase
          .from("transfer_items")
          .update({ approved_quantity: item.qty })
          .eq("id", item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Transfer approved");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setShowDetailsDialog(false);
    },
  });

  // Ship transfer
  const shipMutation = useMutation({
    mutationFn: async (transferId: number) => {
      const { error } = await supabase
        .from("transfers")
        .update({ status: "in_transit", shipped_at: new Date().toISOString() })
        .eq("transfer_id", transferId);

      if (error) throw error;

      // Update shipped quantities to match approved
      const { error: itemsError } = await supabase.rpc("update_shipped_quantities", {
        p_transfer_id: transferId,
      });
    },
    onSuccess: () => {
      toast.success("Transfer marked as shipped");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setShowDetailsDialog(false);
    },
  });

  // Receive transfer
  const receiveMutation = useMutation({
    mutationFn: async ({ transferId, items }: { transferId: number; items: { id: string; qty: number }[] }) => {
      // Update received quantities
      for (const item of items) {
        const { error } = await supabase
          .from("transfer_items")
          .update({ received_quantity: item.qty })
          .eq("id", item.id);

        if (error) throw error;
      }

      // Update transfer status (trigger will handle inventory)
      const { error } = await supabase
        .from("transfers")
        .update({ status: "received" })
        .eq("transfer_id", transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transfer received and inventory updated");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["store-inventory"] });
      setShowDetailsDialog(false);
      setReceivedQuantities({});
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      requested: "secondary",
      approved: "default",
      in_transit: "default",
      received: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace("_", " ").toUpperCase()}</Badge>;
  };

  const openDetails = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setShowDetailsDialog(true);
  };

  const handleApprove = () => {
    if (!selectedTransfer) return;
    const items = transferItems.map((item) => ({
      id: item.id,
      qty: item.requested_quantity,
    }));
    approveMutation.mutate({ transferId: selectedTransfer.transfer_id, items });
  };

  const handleShip = () => {
    if (!selectedTransfer) return;
    shipMutation.mutate(selectedTransfer.transfer_id);
  };

  const handleReceive = () => {
    if (!selectedTransfer) return;
    const items = transferItems.map((item) => ({
      id: item.id,
      qty: receivedQuantities[item.id] ?? item.shipped_quantity ?? item.approved_quantity ?? 0,
    }));
    receiveMutation.mutate({ transferId: selectedTransfer.transfer_id, items });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Transfers</h1>
              <p className="text-sm text-muted-foreground">Manage store transfers</p>
            </div>
          </div>
          <Button onClick={() => navigate("/pos/transfer-request")}>
            <Package className="h-4 w-4 mr-2" />
            Request Transfer
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="outgoing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="outgoing">
              Requested By Me ({outgoingTransfers.filter((t) => t.status !== "received").length})
            </TabsTrigger>
            <TabsTrigger value="incoming">
              Requested From Me ({incomingTransfers.filter((t) => t.status !== "received").length})
            </TabsTrigger>
          </TabsList>

          {/* Outgoing Transfers */}
          <TabsContent value="outgoing">
            <Card>
              <CardHeader>
                <CardTitle>My Transfer Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {outgoingTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No transfer requests</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer #</TableHead>
                        <TableHead>From Store</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outgoingTransfers.map((transfer) => (
                        <TableRow key={transfer.transfer_id}>
                          <TableCell className="font-mono">{transfer.transfer_number}</TableCell>
                          <TableCell>{transfer.from_store.name}</TableCell>
                          <TableCell>{transfer.reason}</TableCell>
                          <TableCell>{format(new Date(transfer.request_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openDetails(transfer)}>
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incoming Transfers */}
          <TabsContent value="incoming">
            <Card>
              <CardHeader>
                <CardTitle>Transfers to Approve</CardTitle>
              </CardHeader>
              <CardContent>
                {incomingTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No incoming transfer requests</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer #</TableHead>
                        <TableHead>To Store</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomingTransfers.map((transfer) => (
                        <TableRow key={transfer.transfer_id}>
                          <TableCell className="font-mono">{transfer.transfer_number}</TableCell>
                          <TableCell>{transfer.to_store.name}</TableCell>
                          <TableCell>{transfer.reason}</TableCell>
                          <TableCell>{format(new Date(transfer.request_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => openDetails(transfer)}>
                              {transfer.status === "requested" ? "Approve" : "View Details"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transfer Details: {selectedTransfer?.transfer_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">From:</span> {selectedTransfer?.from_store.name}
              </div>
              <div>
                <span className="font-medium">To:</span> {selectedTransfer?.to_store.name}
              </div>
              <div>
                <span className="font-medium">Status:</span> {selectedTransfer && getStatusBadge(selectedTransfer.status)}
              </div>
              <div>
                <span className="font-medium">Reason:</span> {selectedTransfer?.reason}
              </div>
            </div>

            {selectedTransfer?.notes && (
              <div className="text-sm">
                <span className="font-medium">Notes:</span> {selectedTransfer.notes}
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  {selectedTransfer?.status !== "requested" && (
                    <TableHead className="text-right">Approved</TableHead>
                  )}
                  {selectedTransfer?.status === "in_transit" && (
                    <TableHead className="text-right">Shipped</TableHead>
                  )}
                  {selectedTransfer?.status === "in_transit" && (
                    <TableHead className="text-right">Receive</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.items.sku}</TableCell>
                    <TableCell>{item.items.name}</TableCell>
                    <TableCell className="text-right">{item.requested_quantity}</TableCell>
                    {selectedTransfer?.status !== "requested" && (
                      <TableCell className="text-right">{item.approved_quantity ?? "-"}</TableCell>
                    )}
                    {selectedTransfer?.status === "in_transit" && (
                      <TableCell className="text-right">{item.shipped_quantity ?? "-"}</TableCell>
                    )}
                    {selectedTransfer?.status === "in_transit" && selectedTransfer.to_store_id === storeId && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.shipped_quantity ?? 0}
                          defaultValue={item.shipped_quantity ?? 0}
                          onChange={(e) =>
                            setReceivedQuantities((prev) => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-20"
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2">
              {selectedTransfer?.status === "requested" && selectedTransfer.from_store_id === storeId && (
                <>
                  <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleApprove}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Transfer
                  </Button>
                </>
              )}
              {selectedTransfer?.status === "approved" && selectedTransfer.from_store_id === storeId && (
                <Button onClick={handleShip}>
                  <Truck className="h-4 w-4 mr-2" />
                  Mark as Shipped
                </Button>
              )}
              {selectedTransfer?.status === "in_transit" && selectedTransfer.to_store_id === storeId && (
                <Button onClick={handleReceive}>
                  <Download className="h-4 w-4 mr-2" />
                  Receive Transfer
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTransfers;
