import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Package, Plus, Send, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePOS } from "./POSContext";
import { useNavigate } from "react-router-dom";

type ItemWithStores = {
  item_id: string;
  item_name: string;
  sku: string;
  price: number;
  stores: Array<{
    store_id: string;
    store_name: string;
    quantity: number;
  }>;
};

type TransferItem = {
  item_id: string;
  item_name: string;
  sku: string;
  from_store_id: string;
  from_store_name: string;
  available_quantity: number;
  requested_quantity: number;
};

const POSTransferRequest = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { storeId } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Search items across all stores
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["item-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      // Get all store inventory matching search
      const { data, error } = await supabase
        .from("store_inventory")
        .select(`
          item_id,
          store_id,
          quantity,
          items!inner(id, name, sku, price),
          stores!inner(id, name)
        `)
        .neq("store_id", storeId)
        .gt("quantity", 0)
        .or(`items.name.ilike.%${searchTerm}%,items.sku.ilike.%${searchTerm}%`);

      if (error) throw error;

      // Group by item
      const itemsMap = new Map<string, ItemWithStores>();
      
      (data || []).forEach((inv: any) => {
        const itemId = inv.items.id;
        if (!itemsMap.has(itemId)) {
          itemsMap.set(itemId, {
            item_id: itemId,
            item_name: inv.items.name,
            sku: inv.items.sku,
            price: inv.items.price,
            stores: [],
          });
        }
        itemsMap.get(itemId)!.stores.push({
          store_id: inv.stores.id,
          store_name: inv.stores.name,
          quantity: inv.quantity,
        });
      });

      return Array.from(itemsMap.values());
    },
    enabled: searchTerm.length >= 2,
  });

  const addToTransfer = (item: ItemWithStores, storeId: string, storeName: string, qty: number) => {
    const key = `${item.item_id}-${storeId}`;
    setTransferItems((prev) => {
      const existing = prev.find((i) => `${i.item_id}-${i.from_store_id}` === key);
      if (existing) {
        if (existing.requested_quantity + 1 > qty) {
          toast.error("Cannot request more than available");
          return prev;
        }
        return prev.map((i) =>
          `${i.item_id}-${i.from_store_id}` === key
            ? { ...i, requested_quantity: i.requested_quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          item_id: item.item_id,
          item_name: item.item_name,
          sku: item.sku,
          from_store_id: storeId,
          from_store_name: storeName,
          available_quantity: qty,
          requested_quantity: 1,
        },
      ];
    });
    toast.success(`Added ${item.item_name} from ${storeName}`);
  };

  const updateQuantity = (itemId: string, storeId: string, qty: number) => {
    setTransferItems((prev) =>
      prev.map((i) =>
        i.item_id === itemId && i.from_store_id === storeId
          ? { ...i, requested_quantity: Math.max(1, Math.min(qty, i.available_quantity)) }
          : i
      )
    );
  };

  const removeItem = (itemId: string, storeId: string) => {
    setTransferItems((prev) => prev.filter((i) => !(i.item_id === itemId && i.from_store_id === storeId)));
  };

  const createTransferMutation = useMutation({
    mutationFn: async () => {
      if (!storeId || transferItems.length === 0) {
        throw new Error("Missing required data");
      }

      // Group items by source store
      const storeGroups = new Map<string, TransferItem[]>();
      transferItems.forEach((item) => {
        if (!storeGroups.has(item.from_store_id)) {
          storeGroups.set(item.from_store_id, []);
        }
        storeGroups.get(item.from_store_id)!.push(item);
      });

      // Create a transfer for each source store
      for (const [fromStoreId, items] of storeGroups.entries()) {
        const { data: transferNumber } = await supabase.rpc("generate_transfer_number");

        const { data: transfer, error: transferError } = await supabase
          .from("transfers")
          .insert({
            transfer_number: transferNumber,
            from_store_id: fromStoreId,
            to_store_id: storeId,
            status: "requested",
            reason,
            notes,
          })
          .select()
          .single();

        if (transferError) throw transferError;

        const { error: itemsError } = await supabase.from("transfer_items").insert(
          items.map((item) => ({
            transfer_id: transfer.transfer_id,
            item_id: item.item_id,
            requested_quantity: item.requested_quantity,
          }))
        );

        if (itemsError) throw itemsError;
      }
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
              <p className="text-sm text-muted-foreground">Search items and see which stores have them</p>
            </div>
          </div>
          {transferItems.length > 0 && (
            <Button onClick={() => setShowRequestDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Submit Request ({transferItems.length})
            </Button>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item name or SKU (min 2 characters)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchTerm.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items found in other stores
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((item) => (
                    <Card key={item.item_id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{item.item_name}</CardTitle>
                            <p className="text-sm text-muted-foreground font-mono">{item.sku}</p>
                          </div>
                          <Badge variant="secondary">${item.price.toFixed(2)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Available in:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {item.stores.map((store) => (
                              <div
                                key={store.store_id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm">{store.store_name}</p>
                                    <p className="text-xs text-muted-foreground">Qty: {store.quantity}</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    addToTransfer(item, store.store_id, store.store_name, store.quantity)
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                    <TableHead>From Store</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferItems.map((item) => (
                    <TableRow key={`${item.item_id}-${item.from_store_id}`}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.from_store_name}</TableCell>
                      <TableCell className="text-right">{item.available_quantity}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={1}
                          max={item.available_quantity}
                          value={item.requested_quantity}
                          onChange={(e) =>
                            updateQuantity(item.item_id, item.from_store_id, parseInt(e.target.value) || 1)
                          }
                          className="w-20 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.item_id, item.from_store_id)}
                        >
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
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Summary:</p>
              <p>
                Requesting {transferItems.length} item(s) from{" "}
                {new Set(transferItems.map((i) => i.from_store_name)).size} store(s)
              </p>
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
