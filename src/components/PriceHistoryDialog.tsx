import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
// NOTE: Since we don't have access to "@/types/database", we define a placeholder interface here.
// Please ensure this matches your actual database schema and the types in your PriceLevel file.
// If you have a types/database.ts file, remove this definition and ensure your imported type is correct.
interface PriceLevel {
  id: string;
  item_id: string;
  effective_date: string;
  cost_price: number;
  selling_price: number;
  wholesale_price: number | null;
  is_current: boolean;
  created_at: string;
}

import { TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner"; // Assuming you use sonner for notifications

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

const PriceHistoryDialog = ({ open, onOpenChange, itemId, itemName }: PriceHistoryDialogProps) => {
  const [priceHistory, setPriceHistory] = useState<PriceLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && itemId) {
      setError(null);
      fetchPriceHistory();
    }
  }, [open, itemId]);

  const fetchPriceHistory = async () => {
    setIsLoading(true);
    setPriceHistory([]);
    try {
      // NOTE: This assumes the table is correctly named 'price_levels'
      const { data, error } = await supabase
        .from("price_levels")
        .select("*")
        .eq("item_id", itemId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (err: any) {
      console.error("Error fetching price history:", err);
      // Display a toast for better visibility
      toast.error(`Failed to load price history: ${err.message}. Check RLS policy on 'price_levels' table.`);
      setError(err.message || "Unknown error fetching data.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceChange = (current: number, previous: number | null) => {
    if (previous === null || previous === 0) return null; // Avoid division by zero
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      direction: change > 0 ? "up" : change < 0 ? "down" : "same",
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Helper to safely calculate margin, avoiding NaN
  const calculateMargin = (sell: number, cost: number) => {
    if (sell <= 0) return 0;
    return ((sell - cost) / sell) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price History - {itemName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            Loading price history...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 mb-2" />
            <p className="font-semibold">Error loading history:</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-red-700">
              *Tip: Ensure the 'price_levels' table exists and RLS allows reading.
            </p>
          </div>
        ) : priceHistory.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
            <XCircle className="w-6 h-6 mb-2" />
            No price history available
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Wholesale Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistory.map((price, index) => {
                  // Get the next (chronologically previous) price level for comparison
                  const previousPrice = priceHistory[index + 1];

                  const costChange = getPriceChange(price.cost_price, previousPrice?.cost_price || null);
                  const sellingChange = getPriceChange(price.selling_price, previousPrice?.selling_price || null);
                  const margin = calculateMargin(price.selling_price, price.cost_price);

                  return (
                    <TableRow key={price.id}>
                      <TableCell>{format(new Date(price.effective_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {price.is_current ? (
                          <Badge variant="default">Current</Badge>
                        ) : (
                          <Badge variant="secondary">Historical</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {formatCurrency(price.cost_price)}
                          {costChange && costChange.direction !== "same" && (
                            <div className="flex items-center gap-1">
                              {costChange.direction === "up" ? (
                                <TrendingUp className="w-3 h-3 text-destructive" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-green-600" />
                              )}
                              <span
                                className={`text-xs ${costChange.direction === "up" ? "text-destructive" : "text-green-600"}`}
                              >
                                {costChange.percentage}%
                              </span>
                            </div>
                          )}
                          {costChange && costChange.direction === "same" && (
                            <Minus className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {formatCurrency(price.selling_price)}
                          {sellingChange && sellingChange.direction !== "same" && (
                            <div className="flex items-center gap-1">
                              {sellingChange.direction === "up" ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-destructive" />
                              )}
                              <span
                                className={`text-xs ${sellingChange.direction === "up" ? "text-green-600" : "text-destructive"}`}
                              >
                                {sellingChange.percentage}%
                              </span>
                            </div>
                          )}
                          {sellingChange && sellingChange.direction === "same" && (
                            <Minus className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {price.wholesale_price ? formatCurrency(price.wholesale_price) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          // Use neutral variant if margin is too low/high to avoid too many colors
                          variant={margin > 30 ? "default" : margin > 15 ? "secondary" : "destructive"}
                        >
                          {margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryDialog;
