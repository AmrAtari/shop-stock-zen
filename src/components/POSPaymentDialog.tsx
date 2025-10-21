import { useState } from "react";
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

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onPaymentComplete: (paymentMethod: "cash" | "card", amountPaid?: number) => void;
}

export const POSPaymentDialog = ({
  open,
  onOpenChange,
  totalAmount,
  onPaymentComplete,
}: POSPaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const paidAmount = parseFloat(amountPaid) || 0;
  const change = paidAmount - totalAmount;

  const handlePayment = async () => {
    if (paymentMethod === "cash" && paidAmount < totalAmount) {
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onPaymentComplete(paymentMethod, paymentMethod === "cash" ? paidAmount : undefined);
    
    // Reset state
    setPaymentMethod("cash");
    setAmountPaid("");
    setIsProcessing(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isProcessing) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setPaymentMethod("cash");
        setAmountPaid("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Process Payment</DialogTitle>
          <DialogDescription>
            Total Amount: <span className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-base font-medium mb-3 block">Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as "cash" | "card")}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="cash"
                className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="cash" id="cash" className="sr-only" />
                <Banknote className="h-8 w-8 mb-2" />
                <span className="font-medium">Cash</span>
              </Label>

              <Label
                htmlFor="card"
                className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="card" id="card" className="sr-only" />
                <CreditCard className="h-8 w-8 mb-2" />
                <span className="font-medium">Card</span>
              </Label>
            </RadioGroup>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount-paid" className="text-base">
                  Amount Paid
                </Label>
                <Input
                  id="amount-paid"
                  type="number"
                  step="0.01"
                  min={totalAmount}
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="mt-2 h-12 text-lg"
                  autoFocus
                />
              </div>

              {paidAmount >= totalAmount && change >= 0 && (
                <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium">${paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Change:</span>
                    <span className="text-primary">${change.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Process card payment on terminal
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={
              isProcessing ||
              (paymentMethod === "cash" && paidAmount < totalAmount)
            }
            className="min-w-[120px]"
          >
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
