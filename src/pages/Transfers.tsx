import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Trash2, Package, ArrowRightLeft, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { useTransfers, useStores } from "@/hooks/useTransfers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Transfers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    from_store_id: "",
    to_store_id: "",
    transfer_date: new Date(),
    reason: "",
    notes: "",
  });

  const { data: transfers = [], isLoading } = useTransfers(searchTerm, statusFilter);
  const { data: stores = [] } = useStores();

  const pagination = usePagination({
    totalItems: transfers.length,
    itemsPerPage: 10,
    initialPage: 1,
  });

  const paginatedTransfers = useMemo(() => {
    return transfers.slice(pagination.startIndex, pagination.endIndex);
  }, [transfers, pagination.startIndex, pagination.endIndex]);

  // NEW: Function to update inventory when transfer is received
  const updateInventoryFromTransfer = async (transferId: string) => {
    try {
      const { error } = await supabase.rpc("process_transfer_inventory", {
        p_transfer_id: transferId,
        p_status: "received",
      });

      if (error) throw error;

      // Update transfer status to received
      await supabase.from("transfers").update({ status: "received" }).eq("id", transferId);

      toast.success("Transfer completed and inventory updated");
    } catch (error: any) {
      console.error("Transfer inventory update error:", error);
      throw error;
    }
  };

  const handleDelete = async (id: string, transferNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${transferNumber}?`)) return;

    try {
      const { error } = await supabase.from("transfers").delete().eq("id", id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      toast.success("Transfer deleted");
    } catch (error: any) {
      toast.error("Failed to delete transfer");
    }
  };

  // NEW: Function to mark transfer as received and update inventory
  const handleReceiveTransfer = async (transferId: string, transferNumber: string) => {
    if (!confirm(`Mark ${transferNumber} as received and update inventory?`)) return;

    try {
      await updateInventoryFromTransfer(transferId);

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    } catch (error: any) {
      toast.error("Failed to receive transfer: " + error.message);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "received":
        return "success";
      case "approved":
      case "in_transit":
        return "default";
      case "pending":
        return "warning";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return "N/A";
    const store = stores.find((s) => s.id === storeId);
    return store?.name || storeId;
  };

  const handleCreateTransfer = async () => {
    if (!formData.from_store_id || !formData.to_store_id) {
      toast.error("Please select both stores");
      return;
    }

    if (formData.from_store_id === formData.to_store_id) {
      toast.error("Source and destination stores must be different");
      return;
    }

    setIsCreating(true);
    try {
      const transferNumber = `TRF-${String(transfers.length + 1).padStart(5, "0")}`;

      const { data, error } = await supabase
        .from("transfers")
        .insert({
          transfer_number: transferNumber,
          from_store_id: formData.from_store_id,
          to_store_id: formData.to_store_id,
          created_at: formData.transfer_date.toISOString(),
          status: "pending",
          total_items: 0,
          reason: formData.reason || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      toast.success("Transfer created successfully");
      setIsCreateModalOpen(false);
      setFormData({
        from_store_id: "",
        to_store_id: "",
        transfer_date: new Date(),
        reason: "",
        notes: "",
      });

      // Navigate to the transfer detail page to add items
      if (data) {
        navigate(`/transfers/${data.id}`);
      }
    } catch (error: any) {
      toast.error("Failed to create transfer");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Transfers</h1>
          <p className="text-muted-foreground mt-1">Manage transfers between stores</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search by Transfer Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>From Store</TableHead>
                <TableHead>To Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transfers found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                    <TableCell>{getStoreName(transfer.from_store_id)}</TableCell>
                    <TableCell>{getStoreName(transfer.to_store_id)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(transfer.status)}>
                        {transfer.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{transfer.total_items}</TableCell>
                    <TableCell>{format(new Date(transfer.created_at), "PP")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/transfers/${transfer.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {transfer.status === "in_transit" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReceiveTransfer(transfer.id, transfer.transfer_number)}
                          >
                            Receive
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transfer.id, transfer.transfer_number)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              goToPage={pagination.goToPage}
              canGoPrev={pagination.canGoPrev}
              canGoNext={pagination.canGoNext}
              totalItems={transfers.length}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="from_store">From Store</Label>
              <Select
                value={formData.from_store_id}
                onValueChange={(value) => setFormData({ ...formData, from_store_id: value })}
              >
                <SelectTrigger id="from_store">
                  <SelectValue placeholder="Select source store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to_store">To Store</Label>
              <Select
                value={formData.to_store_id}
                onValueChange={(value) => setFormData({ ...formData, to_store_id: value })}
              >
                <SelectTrigger id="to_store">
                  <SelectValue placeholder="Select destination store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer_date">Transfer Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.transfer_date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.transfer_date ? format(formData.transfer_date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.transfer_date}
                    onSelect={(date) => date && setFormData({ ...formData, transfer_date: date })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="e.g., Stock rebalancing"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transfers;
