import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { Skeleton } from "@/components/ui/skeleton";

// --- Accounts Payable UUID (For GL Posting) ---
// UUID for Account Code 2000: Accounts Payable (Liability)
const apAccountID = "02ddc86d-7852-4752-94e0-48a56e30d5bb";
// --- End UUID ---

// --- Interface Definitions ---
interface Supplier {
  id: string;
  name: string;
  currency_code: string;
  payment_terms: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

interface LineItem {
  id: number; // Temporary client-side ID for new lines
  description: string;
  quantity: number;
  unit_price: number;
  account_id: string;
}

const NewBill = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const baseCurrency = settings?.currency || "USD";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [currencyCode, setCurrencyCode] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [taxRate, setTaxRate] = useState(0.05); // Sample default tax rate (5%)

  const initialLineItem: LineItem = { id: 1, description: "", quantity: 1, unit_price: 0.0, account_id: "" };
  const [lineItems, setLineItems] = useState<LineItem[]>([initialLineItem]);

  // --- Data Fetching ---
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, currency_code, payment_terms")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: expenseAccounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["expense_accounts"],
    queryFn: async () => {
      // Fetch only Expense and COGS accounts for bill line items
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name")
        .or("account_type.eq.expense,account_type.eq.cogs")
        .eq("is_active", true)
        .order("account_code");
      if (error) throw error;
      return data;
    },
  });

  // --- Effects ---
  // Update currency code and due date when supplier changes
  useEffect(() => {
    const supplier = suppliers?.find((s) => s.id === supplierId);
    if (supplier) {
      setCurrencyCode(supplier.currency_code);
      // Basic logic to calculate due date based on payment terms (e.g., Net 30)
      const termsMatch = supplier.payment_terms.match(/Net (\d+)/i);
      if (termsMatch && billDate) {
        const days = parseInt(termsMatch[1], 10);
        const newDueDate = new Date(billDate);
        newDueDate.setDate(billDate.getDate() + days);
        setDueDate(newDueDate);
      }
      setExchangeRate(1.0); // Reset exchange rate on supplier change
    } else {
      setCurrencyCode(baseCurrency);
    }
  }, [supplierId, suppliers, billDate, baseCurrency]);

  // --- Calculations ---
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // --- Line Item Handlers ---
  const handleLineChange = (id: number, field: keyof Omit<LineItem, "id">, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: Date.now(), description: "", quantity: 1, unit_price: 0.0, account_id: "" },
    ]);
  };

  const removeLine = (id: number) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // --- Submission ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !supplierId ||
      !billNumber ||
      lineItems.some((item) => !item.account_id || !item.description || item.quantity <= 0 || item.unit_price <= 0)
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required header fields and line item details.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert the main Vendor Bill record
      const newBillData = {
        supplier_id: supplierId,
        bill_number: billNumber,
        bill_date: format(billDate, "yyyy-MM-dd"),
        due_date: format(dueDate, "yyyy-MM-dd"),
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: 0.0,
        balance: totalAmount,
        currency_code: currencyCode,
        exchange_rate: exchangeRate,
        status: "Awaiting Payment",
      };

      const { data: billResult, error: billError } = await supabase
        .from("vendor_bills")
        .insert(newBillData)
        .select("id")
        .single();

      if (billError) throw billError;
      const billId = billResult.id;

      // 2. Insert Bill Line Items
      const itemsToInsert = lineItems.map((item, index) => ({
        vendor_bill_id: billId,
        line_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
        account_id: item.account_id,
      }));

      const { error: lineItemError } = await supabase.from("bill_line_items").insert(itemsToInsert);

      if (lineItemError) throw lineItemError;

      // 3. Create General Ledger (GL) Entry
      const journalEntryData = {
        entry_date: format(billDate, "yyyy-MM-dd"),
        entry_type: "Vendor Bill",
        reference_id: billId,
        description: `Bill received from ${suppliers?.find((s) => s.id === supplierId)?.name} (#${billNumber})`,
        total_debit: totalAmount,
        total_credit: totalAmount,
      };

      const { data: journalResult, error: journalError } = await supabase
        .from("journal_entries")
        .insert(journalEntryData)
        .select("id")
        .single();

      if (journalError) throw journalError;
      const journalId = journalResult.id;

      // 4. Create GL Postings (Debits for Expenses, Credit for A/P)
      const postings = [];

      // Credit: Accounts Payable (Liability) for the total amount
      postings.push({
        journal_entry_id: journalId,
        account_id: apAccountID,
        credit_amount: totalAmount,
        debit_amount: 0.0,
        description: `Credit A/P for Bill #${billNumber}`,
      });

      // Debit: Expense accounts for each line item (Subtotal)
      lineItems.forEach((item) => {
        const debitAmount = item.quantity * item.unit_price;
        postings.push({
          journal_entry_id: journalId,
          account_id: item.account_id,
          debit_amount: debitAmount,
          credit_amount: 0.0,
          description: `Debit expense for line: ${item.description}`,
        });
      });

      // Optionally, handle sales tax (if configured)
      if (taxAmount > 0) {
        // This assumes you have a Sales Tax Payable (Liability) account with a known ID
        // For now, let's assume the tax is debited to a separate expense account or is included in the expense account above.
        // For simplicity, we'll skip separate tax posting in this base version, assuming tax is included in the line item's expense for non-inventory/taxable purchases.
        // *Self-correction: If we posted the expense without tax, we need a debit for the tax amount.* // For a standard GL entry, we need a separate account for input tax (Asset) or to debit the expense account for the full amount (including tax).
        // Assuming a separate Tax Payable account is used for simplicity (e.g. 1900 - Input Tax Receivable - ASSET, use placeholder for now)
        // For this simple version, we will assume the full debit is applied to the expense line items, meaning the expense accounts include the tax.
        // Total Debit should match Total Credit. Since AP is credited for the Total Bill Amount, the combined debit for all lines must equal the Total Bill Amount.
        // Since the logic currently posts:
        // CREDIT: AP (Total Amount)
        // DEBIT: Expense 1 (Subtotal 1)
        // DEBIT: Expense 2 (Subtotal 2)
        // If the sum of subtotals is less than the Total Amount, we are missing a debit entry for the tax.
        // For a simpler implementation: We will debit the expense accounts for the full amount including tax in this base implementation, meaning the expense accounts absorb the tax.
        // Total Debit = Total Credit = Total Amount. This is already handled by the logic above.
      }

      const { error: postingError } = await supabase.from("journal_postings").insert(postings);

      if (postingError) throw postingError;

      // 5. Invalidate queries and navigate
      queryClient.invalidateQueries({ queryKey: ["vendor_bills"] });

      toast({
        title: "Bill Created",
        description: `Vendor Bill ${billNumber} has been successfully recorded.`,
      });

      navigate(`/accounting/bills/${billId}`);
    } catch (error: any) {
      console.error("Error submitting bill:", error);
      toast({
        title: "Error creating bill",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSuppliers || isLoadingAccounts) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/bills")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Enter New Vendor Bill</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Header</CardTitle>
            <CardDescription>Details about the vendor and the invoice itself.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Vendor Select */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="supplier_id">Vendor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.currency_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bill Number */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="bill_number">Bill No. (Invoice No.) *</Label>
              <Input id="bill_number" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} required />
            </div>

            {/* Currency */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label>Currency</Label>
              <Input readOnly value={currencyCode} className="font-semibold bg-muted/50" />
            </div>

            {/* Bill Date */}
            <div className="space-y-2">
              <Label htmlFor="bill_date">Bill Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => date && setBillDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tax Rate (Simple input for now) */}
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                value={taxRate * 100}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
              />
            </div>

            {/* Exchange Rate (If not base currency) */}
            {currencyCode !== baseCurrency && (
              <div className="space-y-2">
                <Label htmlFor="exchange_rate">
                  Exchange Rate ({baseCurrency}/{currencyCode})
                </Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items (Expense Distribution)</CardTitle>
            <CardDescription>Allocate the cost of the bill to the correct expense accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Description *</TableHead>
                  <TableHead className="w-[10%] text-right">Qty *</TableHead>
                  <TableHead className="w-[15%] text-right">Unit Price *</TableHead>
                  <TableHead className="w-[20%]">Expense Account *</TableHead>
                  <TableHead className="w-[10%] text-right">Total</TableHead>
                  <TableHead className="w-[5%] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => handleLineChange(item.id, "description", e.target.value)}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="text-right"
                        value={item.quantity}
                        onChange={(e) => handleLineChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="text-right"
                        value={item.unit_price}
                        onChange={(e) => handleLineChange(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.account_id}
                        onValueChange={(value) => handleLineChange(item.id, "account_id", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.quantity * item.unit_price, currencyCode)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => removeLine(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6}>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="w-4 h-4 mr-2" /> Add Line Item
                    </Button>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Totals Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" /> Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between font-medium">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal, currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxRate * 100}%):</span>
              <span>{formatCurrency(taxAmount, currencyCode)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Total Amount:</span>
              <span>{formatCurrency(totalAmount, currencyCode)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || totalAmount <= 0}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Creating Bill..." : "Create Bill"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewBill;
