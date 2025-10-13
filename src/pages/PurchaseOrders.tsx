import { useState, useEffect, useMemo } from "react";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrder } from "@/types/database";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load purchase orders");
    } finally {
      setIsLoading(false);
    }
  };

  const pagination = usePagination({
    totalItems: purchaseOrders.length,
    itemsPerPage: 10,
    initialPage: 1,
  });

  const paginatedPurchaseOrders = useMemo(() => {
    return purchaseOrders.slice(pagination.startIndex, pagination.endIndex);
  }, [purchaseOrders, pagination.startIndex, pagination.endIndex]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

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
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No purchase orders yet</p>
              <Button className="mt-4" onClick={() => navigate("/purchase-orders/new")}>
                Create Your First PO
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPurchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(po.status) as any}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.total_items}</TableCell>
                    <TableCell>${po.total_cost.toFixed(2)}</TableCell>
                    <TableCell>
                      {po.expected_delivery
                        ? new Date(po.expected_delivery).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {purchaseOrders.length > 0 && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
              canGoPrev={pagination.canGoPrev}
              canGoNext={pagination.canGoNext}
              totalItems={purchaseOrders.length}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrders;
