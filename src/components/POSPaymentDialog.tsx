// src/components/POSPaymentDialog.tsx

import { useState, useMemo } from "react";
import { CreditCard, Banknote, Receipt, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Payment = {
  method: "cash" | "card";
  amount: number;
};

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  // MODIFIED: onPaymentComplete now accepts an array of payments
  onPaymentComplete: (payments: Payment[]) => void;
}

export const POSPaymentDialog = ({ open, onOpenChange, totalAmount, onPaymentComplete }: POSPaymentDialogProps) => {
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<"cash" | "card">("cash");
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- CALCULATIONS ---
  const paidTotal = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);

  const remainingAmount = useMemo(() => Math.max(0, totalAmount - paidTotal), [totalAmount, paidTotal]);

  const isComplete = paidTotal >= totalAmount;
  const changeDue = Math.max(0, paidTotal - totalAmount);

  // Amount to auto-fill for current payment
  const amountToTender = parseFloat(currentPaymentAmount) || remainingAmount;
  // --------------------

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state on close
      setPayments([]);
      setCurrentPaymentAmount("");
      setCurrentPaymentMethod("cash");
      setIsProcessing(false);
    }
    onOpenChange(isOpen);
  };

  const handleAddPayment = () => {
    const amount = amountToTender;

    if (amount <= 0) {
      return toast.error("Payment amount must be greater than zero.");
    }

    // Determine the actual amount to record:
    // If it's a cash payment that overpays, record the tendered amount.
    // If it's a card/split payment, only record the amount needed to complete the total.
    const amountTendered = currentPaymentMethod === "cash" ? amount : Math.min(amount, remainingAmount);

    const amountToRecord =
      paidTotal + amountTendered > totalAmount && currentPaymentMethod === "card"
        ? remainingAmount // Card only charges up to the remaining amount
        : amountTendered; // Cash is flexible (for change)

    // Validation
    if (paidTotal >= totalAmount) {
      return toast.error("Sale is already complete.");
    }

    setPayments((prev) => [...prev, { method: currentPaymentMethod, amount: amountToRecord }]);
    setCurrentPaymentAmount(""); // Clear input after adding
  };

  const handleCompleteSale = async () => {
    if (!isComplete) {
      return toast.error("Total amount not fully paid.");
    }

    setIsProcessing(true);

    // Simulate processing delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Pass the full payment array to POSHome for transaction record
    onPaymentComplete(payments);

    // Note: State reset is handled by handleOpenChange when POSHome closes the dialog
  };

  // Utility for displaying payments
  const PaymentIcon = ({ method }: { method: "cash" | "card" }) => {
    return method === "cash" ? (
      <Banknote className="h-4 w-4 text-green-600" />
    ) : (
      <CreditCard className="h-4 w-4 text-blue-600" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Total Due: <span className="text-xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* LEFT COLUMN: Payment Entry */}
          <div className="space-y-4">
            <Label>Payment Method</Label>
            <RadioGroup
              defaultValue="cash"
              value={currentPaymentMethod}
              onValueChange={(value: "cash" | "card") => {
                setCurrentPaymentMethod(value);
                setCurrentPaymentAmount(""); // Clear amount when method changes
              }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="cash" id="cash" className="sr-only" />
                <Label
                  htmlFor="cash"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground data-[state=checked]:border-primary"
                >
                  <Banknote className="mb-3 h-6 w-6" />
                  Cash
                </Label>
              </div>
              <div>
                <RadioGroupItem value="card" id="card" className="sr-only" />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground data-[state=checked]:border-primary"
                >
                  <CreditCard className="mb-3 h-6 w-6" />
                  Card
                </Label>
              </div>
            </RadioGroup>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount ({currentPaymentMethod === "cash" ? "Tendered" : "Paid"})</Label>
              <Input
                id="payment-amount"
                type="number"
                value={currentPaymentAmount}
                onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                placeholder={remainingAmount.toFixed(2)}
                disabled={isComplete}
                className="text-lg"
              />
            </div>

            {/* Payment Button */}
            <Button
              onClick={handleAddPayment}
              disabled={isComplete || isProcessing || amountToTender <= 0}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Payment
            </Button>

            {currentPaymentMethod === "card" && !isComplete && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                Process card payment on terminal after clicking 'Add Payment'.
              </p>
            )}
          </div>

          {/* RIGHT COLUMN: Summary & Payments List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Payments Applied</h3>
            {payments.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center p-4 border rounded">No payments yet.</div>
            ) : (
              <div className="space-y-2">
                {payments.map((p, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded bg-muted">
                    <div className="flex items-center gap-2">
                      <PaymentIcon method={p.method} />
                      <span className="capitalize">{p.method}</span>
                    </div>
                    <span className="font-semibold">${p.amount.toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-lg font-bold">Paid:</span>
                <span className="text-lg font-bold text-green-600">${paidTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lg font-bold">Remaining:</span>
                <span className={`text-lg font-bold ${remainingAmount > 0 ? "text-red-600" : "text-primary"}`}>
                  ${remainingAmount.toFixed(2)}
                </span>
              </div>
              {isComplete && (
                <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                  <span>Change Due:</span>
                  <span className="text-primary">${changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCompleteSale} disabled={isProcessing || !isComplete} className="min-w-[150px]">
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <Receipt className="mr-2 h-4 w-4" />
                Complete Sale
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
