import { useState } from "react";
import { useItemBatches, useCreateBatch } from "@/hooks/useAdvancedInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package } from "lucide-react";
import { format } from "date-fns";

const BatchTracking = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: batches, isLoading } = useItemBatches();
  const createBatch = useCreateBatch();

  const [newBatch, setNewBatch] = useState({
    item_id: "",
    batch_number: "",
    manufacture_date: "",
    expiry_date: "",
    quantity: 0,
    cost_price: 0,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBatch.mutateAsync(newBatch);
    setIsDialogOpen(false);
    setNewBatch({
      item_id: "",
      batch_number: "",
      manufacture_date: "",
      expiry_date: "",
      quantity: 0,
      cost_price: 0,
      notes: "",
    });
  };

  const filteredBatches = batches?.filter(batch =>
    batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.items?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Batch Tracking</h1>
          <p className="text-muted-foreground">Manage item batches and lot numbers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value={newBatch.batch_number}
                  onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Manufacture Date</Label>
                  <Input
                    type="date"
                    value={newBatch.manufacture_date}
                    onChange={(e) => setNewBatch({ ...newBatch, manufacture_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={newBatch.expiry_date}
                    onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newBatch.quantity}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBatch.cost_price}
                    onChange={(e) => setNewBatch({ ...newBatch, cost_price: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createBatch.isPending}>
                {createBatch.isPending ? "Creating..." : "Create Batch"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading batches...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Manufacture Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>No batches found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches?.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batch_number}</TableCell>
                      <TableCell>{batch.items?.name || "N/A"}</TableCell>
                      <TableCell>
                        {batch.manufacture_date ? format(new Date(batch.manufacture_date), "PP") : "-"}
                      </TableCell>
                      <TableCell>
                        {batch.expiry_date ? format(new Date(batch.expiry_date), "PP") : "-"}
                      </TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>{batch.stores?.name || "N/A"}</TableCell>
                      <TableCell>
                        {isExpired(batch.expiry_date) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : isExpiringSoon(batch.expiry_date) ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>
                        ) : (
                          <Badge variant="outline">{batch.status}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchTracking;
