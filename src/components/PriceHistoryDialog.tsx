import { usePriceHistory } from "@/hooks/usePriceHistory"; // <--- Import the new hook
import { Loader2, DollarSign, Calendar, TrendingUp } from "lucide-react"; // <--- Needed icons

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

const PriceHistoryDialog: React.FC<PriceHistoryDialogProps> = ({ open, onOpenChange, itemId, itemName }) => {
  // 1. Use the new hook to fetch data
  const { data: historyData, isLoading, isError } = usePriceHistory(itemId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Price History for {itemName}</DialogTitle>
          <DialogDescription>Records of all price changes for this item.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {/* 2. Display Loading/Error State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
              <p className="mt-2 text-muted-foreground">Loading price history...</p>
            </div>
          )}

          {isError && (
            <div className="text-center py-8 text-red-600">
              <AlertTriangle className="w-6 h-6 mx-auto" />
              <p className="mt-2">Failed to load history. Check the database table 'price_history'.</p>
            </div>
          )}

          {/* 3. Display Data Table */}
          {!isLoading && !isError && historyData && historyData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Old Price</TableHead>
                  <TableHead className="text-right">New Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {entry.change_date}
                    </TableCell>
                    <TableCell>{entry.source}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      {entry.old_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      {entry.new_price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            // 4. No Data State
            !isLoading &&
            !isError && (
              <div className="text-center py-8">
                <History className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No price history found for this item.</p>
              </div>
            )
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
