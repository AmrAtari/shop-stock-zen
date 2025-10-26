import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { usePriceHistory } from "@/hooks/usePriceHistory"; // <-- Import the fixed hook
import { toast } from "sonner";

// NOTE: Define the structure that the hook returns
interface PriceHistoryEntry {
  id: string;
  item_id: string;
  old_price: number;
  new_price: number;
  change_date: string;
  source: string | null;
}

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

const PriceHistoryDialog = ({ open, onOpenChange, itemId, itemName }: PriceHistoryDialogProps) => {
  // Use the fixed TanStack Query hook
  const { data: priceHistory, isLoading, isError, error } = usePriceHistory(itemId, open);

  // Show an error toast if loading fails
  if (isError) {
    toast.error(`Failed to load history: ${error?.message || "Check database connection."}`);
  }

  const getPriceChange = (current: number, previous: number | null) => {
    if (previous === null || previous === 0) return null;
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
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            Loading price history...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-red-600">
            <p className="font-semibold">Error loading history:</p>
            <p className="text-sm">{error?.message}</p>
          </div>
        ) : (priceHistory?.length ?? 0) === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
            <XCircle className="w-6 h-6 mb-2" />
            No price history available
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Old Price</TableHead>
                  <TableHead className="text-right">New Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistory!.map((price, index) => {
                  // Calculate change relative to the *next* chronological entry (the previous effective price)
                  const previousPrice = priceHistory![index + 1];

                  const priceChange = getPriceChange(
                    price.new_price,
                    previousPrice?.new_price || price.old_price || null, // Use previous entry's new_price or current entry's old_price as comparison base
                  );

                  return (
                    <TableRow key={price.id}>
                      <TableCell>{format(new Date(price.change_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{price.source || "Manual"}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(price.old_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(price.new_price)}</TableCell>
                      <TableCell className="text-right">
                        {priceChange && priceChange.direction !== "same" ? (
                          <div className="flex items-center justify-end gap-1">
                            {priceChange.direction === "up" ? (
                              <TrendingUp className="w-3 h-3 text-green-600" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-destructive" />
                            )}
                            <span
                              className={`text-xs ${priceChange.direction === "up" ? "text-green-600" : "text-destructive"}`}
                            >
                              {priceChange.percentage}%
                            </span>
                          </div>
                        ) : (
                          <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                        )}
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
