import { useState } from "react";
import { useBinLocations, useCreateBinLocation } from "@/hooks/useAdvancedInventory";
import { useStores } from "@/hooks/usePurchaseOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, MapPin } from "lucide-react";

const BinLocations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: binLocations, isLoading } = useBinLocations(selectedStore);
  const { data: stores } = useStores();
  const createBin = useCreateBinLocation();

  const [newBin, setNewBin] = useState({
    store_id: "",
    bin_code: "",
    aisle: "",
    rack: "",
    shelf: "",
    bin: "",
    capacity: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBin.mutateAsync(newBin);
    setIsDialogOpen(false);
    setNewBin({
      store_id: "",
      bin_code: "",
      aisle: "",
      rack: "",
      shelf: "",
      bin: "",
      capacity: 0,
    });
  };

  const filteredBins = binLocations?.filter(bin =>
    bin.bin_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bin Locations</h1>
          <p className="text-muted-foreground">Manage warehouse bin locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Bin Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Bin Location</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Store</Label>
                <Select
                  value={newBin.store_id}
                  onValueChange={(value) => setNewBin({ ...newBin, store_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores?.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bin Code</Label>
                <Input
                  value={newBin.bin_code}
                  onChange={(e) => setNewBin({ ...newBin, bin_code: e.target.value })}
                  placeholder="e.g., A-01-02-03"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aisle</Label>
                  <Input
                    value={newBin.aisle}
                    onChange={(e) => setNewBin({ ...newBin, aisle: e.target.value })}
                    placeholder="A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rack</Label>
                  <Input
                    value={newBin.rack}
                    onChange={(e) => setNewBin({ ...newBin, rack: e.target.value })}
                    placeholder="01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shelf</Label>
                  <Input
                    value={newBin.shelf}
                    onChange={(e) => setNewBin({ ...newBin, shelf: e.target.value })}
                    placeholder="02"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bin</Label>
                  <Input
                    value={newBin.bin}
                    onChange={(e) => setNewBin({ ...newBin, bin: e.target.value })}
                    placeholder="03"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={newBin.capacity}
                  onChange={(e) => setNewBin({ ...newBin, capacity: parseInt(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createBin.isPending}>
                {createBin.isPending ? "Creating..." : "Create Bin Location"}
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
                placeholder="Search bin locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores?.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading bin locations...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bin Code</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Aisle</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBins?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>No bin locations found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBins?.map((bin) => (
                    <TableRow key={bin.id}>
                      <TableCell className="font-medium">{bin.bin_code}</TableCell>
                      <TableCell>{bin.stores?.name || "N/A"}</TableCell>
                      <TableCell>{bin.aisle || "-"}</TableCell>
                      <TableCell>{bin.rack || "-"}</TableCell>
                      <TableCell>{bin.shelf || "-"}</TableCell>
                      <TableCell>{bin.bin || "-"}</TableCell>
                      <TableCell>{bin.capacity || "-"}</TableCell>
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

export default BinLocations;
