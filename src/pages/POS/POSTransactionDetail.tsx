import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Receipt, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  Banknote,
  Package,
  Printer
} from "lucide-react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

interface TransactionLine {
  id: string;
  item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  price: number;
  amount: number;
  discount_fixed: number;
  discount_percent: number;
  is_refund: boolean;
}

interface TransactionDetail {
  transaction_id: string;
  created_at: string;
  cashier_id: string;
  session_id: string;
  payment_method: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  lines: TransactionLine[];
}

const POSTransactionDetail = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ["pos-transaction-detail", transactionId],
    queryFn: async (): Promise<TransactionDetail | null> => {
      if (!transactionId) return null;

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          transaction_id,
          created_at,
          cashier_id,
          session_id,
          payment_method,
          customer_id,
          item_id,
          sku,
          quantity,
          price,
          amount,
          discount_fixed,
          discount_percent,
          is_refund,
          is_refunded
        `)
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Fetch item names
      const itemIds = [...new Set(data.map(t => t.item_id).filter(Boolean))];
      const { data: items } = await supabase
        .from("items")
        .select("id, name, sku")
        .in("id", itemIds);

      const itemMap = new Map(items?.map(i => [i.id, i]) || []);

      // Fetch customer info if exists
      let customerInfo = { name: null, email: null, phone: null };
      const customerId = data[0]?.customer_id;
      if (customerId) {
        const { data: customer } = await supabase
          .from("customers")
          .select("name, email, phone")
          .eq("id", customerId)
          .single();
        if (customer) {
          customerInfo = customer;
        }
      }

      const lines: TransactionLine[] = data.map(t => ({
        id: t.id,
        item_id: t.item_id,
        item_name: itemMap.get(t.item_id)?.name || "Unknown Item",
        sku: t.sku || itemMap.get(t.item_id)?.sku || "",
        quantity: t.quantity,
        price: t.price,
        amount: t.amount,
        discount_fixed: t.discount_fixed || 0,
        discount_percent: t.discount_percent || 0,
        is_refund: t.is_refund,
      }));

      return {
        transaction_id: data[0].transaction_id,
        created_at: data[0].created_at,
        cashier_id: data[0].cashier_id,
        session_id: data[0].session_id,
        payment_method: data[0].payment_method,
        customer_id: customerId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        lines,
      };
    },
    enabled: !!transactionId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {error ? "Error loading transaction" : "Transaction not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotal = transaction.lines.reduce((sum, line) => sum + line.amount, 0);
  const totalDiscount = transaction.lines.reduce(
    (sum, line) => sum + line.discount_fixed + (line.price * line.quantity * line.discount_percent / 100),
    0
  );
  const totalItems = transaction.lines.reduce((sum, line) => sum + line.quantity, 0);
  const hasRefunds = transaction.lines.some(line => line.is_refund);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              Transaction Details
            </h1>
            <p className="text-muted-foreground font-mono text-sm">{transaction.transaction_id}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint} className="print:hidden">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Transaction Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Transaction Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {new Date(transaction.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">
                {new Date(transaction.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cashier</span>
              <span className="font-medium capitalize">{transaction.cashier_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={hasRefunds ? "destructive" : "default"}>
                {hasRefunds ? "Partial Refund" : "Completed"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transaction.customer_id ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{transaction.customer_name || "Unknown"}</span>
                </div>
                {transaction.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{transaction.customer_email}</span>
                  </div>
                )}
                {transaction.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{transaction.customer_phone}</span>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => navigate(`/crm/customers/${transaction.customer_id}`)}
                >
                  View Customer Profile
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Walk-in Customer</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {transaction.payment_method === "cash" ? (
                <Banknote className="w-4 h-4" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <Badge variant="outline" className="capitalize">
                {transaction.payment_method}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal + totalDiscount, currency)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-{formatCurrency(totalDiscount, currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Line Items
          </CardTitle>
          <CardDescription>
            {totalItems} item{totalItems !== 1 ? "s" : ""} in this transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.lines.map((line) => (
                <TableRow key={line.id} className={line.is_refund ? "bg-destructive/10" : ""}>
                  <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {line.item_name}
                      {line.is_refund && (
                        <Badge variant="destructive" className="text-xs">Refunded</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.price, currency)}</TableCell>
                  <TableCell className="text-right">
                    {line.discount_fixed > 0 || line.discount_percent > 0 ? (
                      <span className="text-success">
                        {line.discount_percent > 0 
                          ? `${line.discount_percent}%` 
                          : formatCurrency(line.discount_fixed, currency)
                        }
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(line.amount, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex gap-4 print:hidden">
        <Button variant="outline" onClick={() => navigate("/reports")}>
          Back to Reports
        </Button>
        <Button variant="outline" onClick={() => navigate("/pos/receipts")}>
          View All Receipts
        </Button>
      </div>
    </div>
  );
};

export default POSTransactionDetail;
