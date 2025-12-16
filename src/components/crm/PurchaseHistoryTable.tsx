import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { format } from "date-fns";

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  transaction_items?: any[];
}

interface PurchaseHistoryTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const PurchaseHistoryTable = ({ transactions, isLoading }: PurchaseHistoryTableProps) => {
  const { formatCurrency } = useSystemSettings();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading purchase history...
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No purchase history found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Transaction ID</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Payment Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {transaction.id.slice(0, 8)}...
            </TableCell>
            <TableCell>{transaction.transaction_items?.length || 0} items</TableCell>
            <TableCell className="capitalize">
              {transaction.payment_method || "—"}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(transaction.total_amount)}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  transaction.status === "completed"
                    ? "default"
                    : transaction.status === "refunded"
                    ? "destructive"
                    : "secondary"
                }
                className="capitalize"
              >
                {transaction.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default PurchaseHistoryTable;
