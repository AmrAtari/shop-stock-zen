import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, DollarSign, FileText, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { cn } from "@/lib/utils"; // <-- FIX: Added missing cn import

// --- Interface Definitions ---
interface BillPayment {
  id: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
}

interface BillLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  accounts: {
    account_code: string;
    account_name: string;
  };
}

interface BillDetailData {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "Awaiting Payment" | "Partially Paid" | "Paid" | "Void";
  suppliers: {
    id: string;
    name: string;
    payment_terms: string;
  };
  bill_line_items: BillLineItem[];
  bill_payments: BillPayment[];
}

const BillDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSystemSettings();
  const baseCurrency = settings?.currency || "USD";

  // --- Data Fetching ---
  const {
    data: bill,
    isLoading,
    error,
  } = useQuery<BillDetailData>({
    queryKey: ["vendor_bill_detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Bill ID is missing.");

      const { data, error } = await supabase
        .from("vendor_bills")
        .select(
          `
          *,
          suppliers (id, name, payment_terms),
          bill_line_items (id, description, quantity, unit_price, line_total, accounts (account_code, account_name)),
          bill_payments (id, payment_date, payment_amount, payment_method)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as BillDetailData;
    },
    enabled: !!id,
  });

  // --- Helpers ---
  // FIX: Replaced 'yellow' with 'warning' to match component variants
  const getStatusVariant = (
    status: BillDetailData["status"],
  ): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" => {
    switch (status) {
      case "Awaiting Payment":
        return "destructive";
      case "Partially Paid":
        return "warning";
      case "Paid":
        return "default";
      case "Void":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isOverdue = bill && bill.status !== "Paid" && new Date(bill.due_date) < new Date();

  // 4. Main Component Rendering
  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (error || !bill) {
    return <div className="text-destructive">Error: {error?.message || "Bill not found."}</div>;
  }

  const subtotal = bill.bill_line_items.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = bill.total_amount - subtotal;

  // --- Placeholder for Payment Modal Logic (to be added later) ---
  const handleRecordPayment = () => {
    // In a real application, this would open a modal for recording a payment
    toast({
      title: "Payment Feature Not Ready",
      description: "This will open a modal to record a bill payment (Step 21).",
      variant: "default",
    });
    // Placeholder: navigate(`/accounting/bills/${id}/pay`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/bills")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bill #{bill.bill_number}</h1>
            <p className="text-lg text-muted-foreground">
              Vendor:
              <Button
                variant="link"
                className="p-0 ml-1 h-auto font-medium"
                onClick={() => navigate(`/accounting/vendors/${bill.suppliers.id}`)}
              >
                {bill.suppliers.name}
              </Button>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {bill.status !== "Paid" && bill.status !== "Void" && (
            <Button onClick={handleRecordPayment} variant="default">
              <DollarSign className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/accounting/bills/${bill.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" /> Edit Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Bill Summary
              <Badge variant={getStatusVariant(bill.status)} className="text-lg px-4 py-1">
                {bill.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bill Date</p>
              <p className="font-medium">{new Date(bill.bill_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <p className="font-medium">{bill.suppliers.payment_terms}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className={cn("font-medium", isOverdue && "text-red-600 font-bold flex items-center gap-1")}>
                {new Date(bill.due_date).toLocaleDateString()} {isOverdue && <Clock className="w-4 h-4" />}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{baseCurrency}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Financials */}
        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Bill Amount:</span>
              <span className="font-semibold">{formatCurrency(bill.total_amount, baseCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(bill.paid_amount, baseCurrency)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
              <span>Balance Due:</span>
              <span className={cn(bill.balance > 0 ? "text-red-600" : "text-green-600")}>
                {formatCurrency(bill.balance, baseCurrency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
          <CardDescription>Allocation of the bill amount across expense accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead>Expense Account</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.bill_line_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price, baseCurrency)}</TableCell>
                  <TableCell>
                    {item.accounts.account_code} - {item.accounts.account_name}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.line_total, baseCurrency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right">Subtotal:</TableCell>
                <TableCell className="text-right">{formatCurrency(subtotal, baseCurrency)}</TableCell>
              </TableRow>
              <TableRow className="font-bold">
                <TableCell colSpan={3}></TableCell>
                <TableCell className="text-right">Tax:</TableCell>
                <TableCell className="text-right">{formatCurrency(taxAmount, baseCurrency)}</TableCell>
              </TableRow>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3}></TableCell>
                <TableCell className="text-right">Total Bill:</TableCell>
                <TableCell className="text-right">{formatCurrency(bill.total_amount, baseCurrency)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {bill.bill_payments.length === 0 ? (
            <p className="text-muted-foreground italic">No payments have been recorded for this bill.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.bill_payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="flex items-center gap-2 font-medium">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.payment_method || "Bank Transfer"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.payment_amount, baseCurrency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillDetail;
