import { useState, useMemo } from "react";
import { Plus, Eye, Printer, Trash2, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";

// NOTE: Ensure the PaginationControls and usePagination hook are available in your project

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();

  // Data Fetching: usePurchaseOrders fetches the filtered list
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders(searchTerm, statusFilter, dateRange);

  const pagination = usePagination({
    totalItems: purchaseOrders.length,
    itemsPerPage: 10,
    initialPage: 1,
  });

  const paginatedPurchaseOrders = useMemo(() => {
    // Reset to page 1 if search/filter changes dramatically reduce the list size
    if (pagination.currentPage > pagination.totalPages && pagination.totalPages > 0) {
      pagination.goToPage(1);
    }
    return purchaseOrders.slice(pagination.startIndex, pagination.endIndex);
  }, [
    purchaseOrders,
    pagination.startIndex,
    pagination.endIndex,
    pagination.currentPage,
    pagination.totalPages,
    pagination.goToPage,
  ]);

  const handleDelete = async (id: string, poNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${poNumber}?`)) return;

    try {
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;

      // Invalidate the query to force a refresh of the list
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success("Purchase order deleted");
    } catch (error: any) {
      toast.error("Failed to delete purchase order");
    }
  };

  const handlePrint = (id: string) => {
    // Navigate to a print-friendly route, assuming this route exists
    navigate(`/purchase-orders/${id}?print=true`);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "success";
      case "pending":
      case "draft":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Manage your purchase orders</p>
        </div>
        <Button onClick={() => navigate("/purchase-orders/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Search by PO Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-64 justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange ? `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}` : "Filter by Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => range?.from && range?.to && setDateRange({ from: range.from, to: range.to })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="p-2 flex justify-end">
                  <Button variant="outline" onClick={() => setDateRange(undefined)}>
                    Clear Date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {(searchTerm || statusFilter !== "all" || dateRange) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateRange(undefined);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Enhanced Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Loading Purchase Orders...</p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            /* Enhanced Empty State */
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || dateRange
                  ? "No purchase orders match your current filters."
                  : "No purchase orders yet"}
              </p>
              <Button className="mt-4" onClick={() => navigate("/purchase-orders/new")}>
                Create Your First PO
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPurchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{typeof po.supplier === 'string' ? po.supplier : po.supplier?.name}</TableCell>
                      <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(po.status) as any}>{po.status}</Badge>
                      </TableCell>
                      <TableCell>{po.total_items}</TableCell>
                      <TableCell>
                        {po.currency} {po.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(po.id)} title="Print">
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(po.id, po.po_number)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                goToPage={pagination.goToPage}
                canGoPrev={pagination.canGoPrev}
                canGoNext={pagination.canGoNext}
                totalItems={purchaseOrders.length}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrders;
