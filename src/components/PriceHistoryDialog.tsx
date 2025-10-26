import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PriceLevel } from "@/types/database";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

const PriceHistoryDialog = ({ open, onOpenChange, itemId, itemName }: PriceHistoryDialogProps) => {
  const [priceHistory, setPriceHistory] = useState<PriceLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      fetchPriceHistory();
    }
  }, [open, itemId]);

  const fetchPriceHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("price_levels")
        .select("*")
        .eq("item_id", itemId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error("Error fetching price history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriceChange = (current: number, previous: number | null) => {
    if (!previous) return null;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price History - {itemName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : priceHistory.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No price history available</div>
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
                  const previousPrice = priceHistory[index + 1];
                  const costChange = getPriceChange(price.cost_price, previousPrice?.cost_price || null);
                  const sellingChange = getPriceChange(price.selling_price, previousPrice?.selling_price || null);
                  const margin = ((price.selling_price - price.cost_price) / price.selling_price) * 100;

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
                          {costChange && (
                            <div className="flex items-center gap-1">
                              {costChange.direction === "up" && <TrendingUp className="w-3 h-3 text-destructive" />}
                              {costChange.direction === "down" && <TrendingDown className="w-3 h-3 text-green-600" />}
                              {costChange.direction === "same" && <Minus className="w-3 h-3 text-muted-foreground" />}
                              <span className="text-xs text-muted-foreground">{costChange.percentage}%</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {formatCurrency(price.selling_price)}
                          {sellingChange && (
                            <div className="flex items-center gap-1">
                              {sellingChange.direction === "up" && <TrendingUp className="w-3 h-3 text-green-600" />}
                              {sellingChange.direction === "down" && (
                                <TrendingDown className="w-3 h-3 text-destructive" />
                              )}
                              {sellingChange.direction === "same" && (
                                <Minus className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">{sellingChange.percentage}%</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {price.wholesale_price ? formatCurrency(price.wholesale_price) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={margin > 30 ? "success" : margin > 15 ? "default" : "warning"}>
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
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryDialog;
