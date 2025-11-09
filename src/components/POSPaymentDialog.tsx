import { useState, useMemo, useCallback } from "react";
import { CreditCard, Banknote, Receipt } from "lucide-react";
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

// Re-use the Payment type defined in POSHome.tsx
export type Payment = {
  method: "cash" | "card";
  amount: number;
};

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  // Update to handle an array of payments and the final change due
  onPaymentComplete: (payments: Payment[], changeDue: number) => void;
}

export const POSPaymentDialog = ({ open, onOpenChange, totalAmount, onPaymentComplete }: POSPaymentDialogProps) => {
  const [currentMethod, setCurrentMethod] = useState<"cash" | "card">("cash");
  const [currentAmount, setCurrentAmount] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Calculations ---
  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const remainingDue = useMemo(() => Math.max(0, totalAmount - totalPaid), [totalAmount, totalPaid]);
  // Cash change is only calculated if all due is paid AND a cash payment is involved
  const cashPayment = payments.find((p) => p.method === "cash");
  const change = useMemo(() => {
    const currentInput = parseFloat(currentAmount) || 0;
    if (remainingDue > 0) return 0; // Not fully paid yet

    // If we're entering an amount greater than or equal to the remaining due,
    // we calculate the change from the current input amount.
    if (currentMethod === "cash" && currentInput > remainingDue) {
      return currentInput - remainingDue;
    }

    return 0;
  }, [remainingDue, currentMethod, currentAmount]);

  const handleAddPayment = useCallback(() => {
    const amount = parseFloat(currentAmount) || 0;
    if (amount <= 0 || isProcessing) return;

    let paymentAmount = 0;

    if (amount >= remainingDue) {
      // Payment covers the remaining amount, plus change (if cash)
      paymentAmount = remainingDue + change;
    } else {
      // Partial payment
      paymentAmount = amount;
    }

    // Safety check for payment amount being positive
    if (paymentAmount <= 0) return;

    setPayments((p) => [...p, { method: currentMethod, amount: paymentAmount }]);
    setCurrentAmount("");
  }, [currentAmount, currentMethod, remainingDue, change, isProcessing]);

  const handlePayment = async () => {
    if (isProcessing || remainingDue > 0) return;

    setIsProcessing(true);

    // Before completing, ensure any change is accounted for in the final payment array
    // The previous logic in handleAddPayment already ensured the last payment included the change
    // but we need to check if the last payment was cash and adjust if necessary.
    let finalPayments = [...payments];
    let finalChangeDue = change;

    // If the cart is exactly paid and the last payment was cash,
    // but the customer entered a higher amount (change > 0),
    // we need to make sure the cash payment amount reflects the amount received
    // (Total due + change). The handleAddPayment logic already handles this if used.

    // Fallback: If no payments recorded but paid, add the payment now
    if (finalPayments.length === 0 && (parseFloat(currentAmount) || 0) > 0) {
      handleAddPayment(); // Add the payment that caused the change
      // We will execute the main logic on the next render's finalPayments state.
      // For a single step, we re-calculate:
      const amount = parseFloat(currentAmount) || 0;
      const paid = Math.min(amount, totalAmount);
      finalPayments = [{ method: currentMethod, amount: paid }];
      finalChangeDue = Math.max(0, amount - totalAmount);
    }

    // Execute the completion logic
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing delay
      onPaymentComplete(finalPayments, finalChangeDue);
      handleClose();
    } catch (e) {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setCurrentMethod("cash");
    setCurrentAmount("");
    setPayments([]);
    setIsProcessing(false);
  };

  // --- Keyboard Shortcut for Adding Payment (Enter key) ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If remaining due is 0, complete the sale
      if (remainingDue <= 0) {
        handlePayment();
      } else {
        handleAddPayment();
      }
    }
  };

  // If the dialog is not open, don't render the UI logic
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Transaction</DialogTitle>
          <DialogDescription>
            Total Due: <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between font-bold text-xl text-green-600">
            <span>Remaining Due:</span>
            <span>${remainingDue.toFixed(2)}</span>
          </div>

          <RadioGroup
            defaultValue="cash"
            value={currentMethod}
            onValueChange={(value: "cash" | "card") => setCurrentMethod(value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="cash-method" />
              <Label htmlFor="cash-method" className="flex items-center gap-1">
                <Banknote className="h-4 w-4" /> Cash
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="card-method" />
              <Label htmlFor="card-method" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" /> Card
              </Label>
            </div>
          </RadioGroup>

          {/* Payment Input Area */}
          {remainingDue > 0 && currentMethod === "cash" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="amountPaid">Amount Received (Cash)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  placeholder={remainingDue.toFixed(2)}
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  step="0.01"
                  autoFocus
                />
              </div>
              <Button className="self-end" onClick={handleAddPayment} disabled={parseFloat(currentAmount) <= 0}>
                Add Payment
              </Button>
            </div>
          )}

          {remainingDue > 0 && currentMethod === "card" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="cardAmount">Amount to Charge (Card)</Label>
                <Input
                  id="cardAmount"
                  type="number"
                  placeholder={remainingDue.toFixed(2)}
                  value={currentAmount || remainingDue.toFixed(2)}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  step="0.01"
                  autoFocus
                />
              </div>
              <Button className="self-end" onClick={handleAddPayment} disabled={parseFloat(currentAmount) <= 0}>
                Add Payment
              </Button>
            </div>
          )}

          {/* Payment List */}
          {payments.length > 0 && (
            <div className="border rounded p-3 space-y-1">
              <div className="font-semibold mb-1">Payments Applied:</div>
              {payments.map((p, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {p.method === "cash" ? (
                      <Banknote className="inline h-3 w-3 mr-1" />
                    ) : (
                      <CreditCard className="inline h-3 w-3 mr-1" />
                    )}
                    {p.method.charAt(0).toUpperCase() + p.method.slice(1)}
                  </span>
                  <span>${p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Final Summary (After Full Payment) */}
          {remainingDue <= 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between font-medium">
                <span>Total Paid:</span>
                <span className="font-medium">${totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Change Due:</span>
                <span className="text-primary">${change.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing || remainingDue > 0} className="min-w-[120px]">
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
