import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Package, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePOS } from "./POSContext";
import { useNavigate } from "react-router-dom";

type StoreInventory = {
  store_id: string;
  store_name: string;
  item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  price: number;
};

type TransferItem = {
  item_id: string;
  item_name: string;
  sku: string;
  available_quantity: number;
  requested_quantity: number;
};

const POSTransferRequest = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { storeId } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").neq("id", storeId).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory from other stores
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["other-store-inventory", selectedStore, searchTerm],
    queryFn: async () => {
      if (!selectedStore) return [];
      
      let query = supabase
        .from("store_inventory")
        .select(`
          store_id,
          item_id,
          quantity,
          items!inner(id, name, sku, price)
        `)
        .eq("store_id", selectedStore)
        .gt("quantity", 0);

      if (searchTerm) {
        query = query.or(`items.name.ilike.%${searchTerm}%,items.sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((inv: any) => ({
        store_id: inv.store_id,
        item_id: inv.items.id,
        item_name: inv.items.name,
        sku: inv.items.sku,
        quantity: inv.quantity,
        price: inv.items.price,
      })) as StoreInventory[];
    },
    enabled: !!selectedStore,
  });

  const addToTransfer = (item: StoreInventory) => {
    setTransferItems((prev) => {
      const existing = prev.find((i) => i.item_id === item.item_id);
      if (existing) {
        if (existing.requested_quantity + 1 > item.quantity) {
          toast.error("Cannot request more than available");
          return prev;
        }
        return prev.map((i) =>
          i.item_id === item.item_id ? { ...i, requested_quantity: i.requested_quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          item_id: item.item_id,
          item_name: item.item_name,
          sku: item.sku,
          available_quantity: item.quantity,
          requested_quantity: 1,
        },
      ];
    });
    toast.success(`Added ${item.item_name} to transfer request`);
  };

  const updateQuantity = (itemId: string, qty: number) => {
    setTransferItems((prev) =>
      prev.map((i) =>
        i.item_id === itemId
          ? { ...i, requested_quantity: Math.max(1, Math.min(qty, i.available_quantity)) }
          : i
      )
    );
  };

  const removeItem = (itemId: string) => {
    setTransferItems((prev) => prev.filter((i) => i.item_id !== itemId));
  };

  const createTransferMutation = useMutation({
    mutationFn: async () => {
      if (!storeId || !selectedStore || transferItems.length === 0) {
        throw new Error("Missing required data");
      }

      // Generate transfer number
      const { data: transferNumber } = await supabase.rpc("generate_transfer_number");

      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .insert({
          transfer_number: transferNumber,
          from_store_id: selectedStore,
          to_store_id: storeId,
          status: "requested",
          reason,
          notes,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const { error: itemsError } = await supabase.from("transfer_items").insert(
        transferItems.map((item) => ({
          transfer_id: transfer.transfer_id,
          item_id: item.item_id,
          requested_quantity: item.requested_quantity,
        }))
      );

      if (itemsError) throw itemsError;

      return transfer;
    },
    onSuccess: () => {
      toast.success("Transfer request created successfully");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setTransferItems([]);
      setReason("");
      setNotes("");
      setShowRequestDialog(false);
      navigate("/pos/transfers");
    },
    onError: (error) => {
      toast.error("Failed to create transfer request");
      console.error(error);
    },
  });

  const handleSubmitRequest = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the transfer");
      return;
    }
    if (transferItems.length === 0) {
      toast.error("Please add items to the transfer");
      return;
    }
    createTransferMutation.mutate();
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
              <h1 className="text-2xl font-bold">Request Transfer</h1>
              <p className="text-sm text-muted-foreground">Check other stores and request items</p>
            </div>
          </div>
          {transferItems.length > 0 && (
            <Button onClick={() => setShowRequestDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Request Transfer ({transferItems.length})
            </Button>
          )}
        </div>

        {/* Store Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Store</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="Select a store to view inventory" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store: any) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} {store.location && `- ${store.location}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedStore && (
          <>
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory List */}
            <Card>
              <CardHeader>
                <CardTitle>Available Items</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items found in this store
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => addToTransfer(item)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Transfer Items Cart */}
            {transferItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Package className="inline h-5 w-5 mr-2" />
                    Transfer Request Items ({transferItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Requested</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferItems.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-right">{item.available_quantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              max={item.available_quantity}
                              value={item.requested_quantity}
                              onChange={(e) => updateQuantity(item.item_id, parseInt(e.target.value) || 1)}
                              className="w-20 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="sm" onClick={() => removeItem(item.item_id)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Transfer Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason *</label>
              <Input
                placeholder="e.g., Stock out, Customer request"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea
                placeholder="Any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest} disabled={createTransferMutation.isPending}>
                {createTransferMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTransferRequest;
