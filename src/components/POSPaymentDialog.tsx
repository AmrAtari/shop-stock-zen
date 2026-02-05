import { useState, useMemo, useCallback } from "react";
import { CreditCard, Banknote, Receipt, Star, Gift, Wallet } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { POSCustomer } from "@/pages/POS/POSContext";

// Extended Payment type with loyalty, gift card, store credit
export type PaymentMethod = "cash" | "card" | "loyalty" | "gift_card" | "store_credit";

export type Payment = {
  method: PaymentMethod;
  amount: number;
  reference?: string; // For gift card number, etc.
};

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onPaymentComplete: (payments: Payment[], changeDue: number) => void;
  // Loyalty props
  customer?: POSCustomer | null;
  loyaltySettings?: {
    pointsPerDollar: number;
    pointValueInCents: number;
    minRedeemPoints: number;
  };
  onLoyaltyPointsUsed?: (points: number) => void;
}

export const POSPaymentDialog = ({ 
  open, 
  onOpenChange, 
  totalAmount, 
  onPaymentComplete,
  customer,
  loyaltySettings,
  onLoyaltyPointsUsed,
}: POSPaymentDialogProps) => {
  const { formatCurrency } = useSystemSettings();
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>("cash");
  const [currentAmount, setCurrentAmount] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [giftCardNumber, setGiftCardNumber] = useState("");
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);

  // Customer loyalty data
  const availableLoyaltyPoints = customer?.loyalty_points || 0;
  const pointValueInCents = loyaltySettings?.pointValueInCents || 1;
  const minRedeemPoints = loyaltySettings?.minRedeemPoints || 100;
  
  // Calculate max loyalty redemption value
  const maxLoyaltyValue = useMemo(() => {
    return (availableLoyaltyPoints * pointValueInCents) / 100;
  }, [availableLoyaltyPoints, pointValueInCents]);

  // Customer store credit
  const availableStoreCredit = customer?.outstanding_balance 
    ? Math.max(0, -customer.outstanding_balance) // Negative balance = credit
    : 0;

  // --- Calculations ---
  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const remainingDue = useMemo(() => Math.max(0, totalAmount - totalPaid), [totalAmount, totalPaid]);
  
  // Cash change calculation
  const change = useMemo(() => {
    const currentInput = parseFloat(currentAmount) || 0;
    if (remainingDue > 0) return 0;
    if (currentMethod === "cash" && currentInput > remainingDue) {
      return currentInput - remainingDue;
    }
    return 0;
  }, [remainingDue, currentMethod, currentAmount]);

  // Calculate loyalty points value for current input
  const loyaltyValueFromPoints = useMemo(() => {
    return (loyaltyPointsToUse * pointValueInCents) / 100;
  }, [loyaltyPointsToUse, pointValueInCents]);

  // Loyalty points already used in payments
  const loyaltyPointsAlreadyUsed = useMemo(() => {
    return payments
      .filter(p => p.method === "loyalty")
      .reduce((sum, p) => sum + Math.floor((p.amount * 100) / pointValueInCents), 0);
  }, [payments, pointValueInCents]);

  const handleAddPayment = useCallback(() => {
    if (isProcessing) return;

    let paymentAmount = 0;
    let reference: string | undefined;

    if (currentMethod === "loyalty") {
      if (loyaltyPointsToUse < minRedeemPoints) {
        return; // Not enough points
      }
      paymentAmount = Math.min(loyaltyValueFromPoints, remainingDue);
      reference = `${Math.ceil((paymentAmount * 100) / pointValueInCents)} points`;
    } else if (currentMethod === "gift_card") {
      const amount = parseFloat(currentAmount) || 0;
      if (amount <= 0 || !giftCardNumber.trim()) return;
      paymentAmount = Math.min(amount, remainingDue);
      reference = giftCardNumber.trim();
    } else if (currentMethod === "store_credit") {
      const amount = parseFloat(currentAmount) || Math.min(availableStoreCredit, remainingDue);
      if (amount <= 0) return;
      paymentAmount = Math.min(amount, availableStoreCredit, remainingDue);
    } else {
      const amount = parseFloat(currentAmount) || 0;
      if (amount <= 0) return;

      if (amount >= remainingDue) {
        paymentAmount = remainingDue + (currentMethod === "cash" ? Math.max(0, amount - remainingDue) : 0);
      } else {
        paymentAmount = amount;
      }
    }

    if (paymentAmount <= 0) return;

    setPayments((p) => [...p, { method: currentMethod, amount: paymentAmount, reference }]);
    setCurrentAmount("");
    setGiftCardNumber("");
    setLoyaltyPointsToUse(0);
  }, [currentAmount, currentMethod, remainingDue, isProcessing, giftCardNumber, loyaltyPointsToUse, loyaltyValueFromPoints, minRedeemPoints, pointValueInCents, availableStoreCredit]);

  const removePayment = (index: number) => {
    setPayments((p) => p.filter((_, i) => i !== index));
  };

  const handlePayment = async () => {
    if (isProcessing || remainingDue > 0) return;

    setIsProcessing(true);

    let finalPayments = [...payments];
    let finalChangeDue = 0;

    // Handle case where payment is entered but not added
    if (finalPayments.length === 0 && (parseFloat(currentAmount) || 0) > 0) {
      const amount = parseFloat(currentAmount) || 0;
      const paid = currentMethod === "cash" ? amount : Math.min(amount, totalAmount);
      finalPayments = [{ method: currentMethod, amount: paid }];
      finalChangeDue = currentMethod === "cash" ? Math.max(0, amount - totalAmount) : 0;
    }

    // Calculate loyalty points used
    const totalLoyaltyPointsUsed = finalPayments
      .filter(p => p.method === "loyalty")
      .reduce((sum, p) => sum + Math.ceil((p.amount * 100) / pointValueInCents), 0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (totalLoyaltyPointsUsed > 0 && onLoyaltyPointsUsed) {
        onLoyaltyPointsUsed(totalLoyaltyPointsUsed);
      }
      
      onPaymentComplete(finalPayments, finalChangeDue);
      handleClose();
    } catch (e) {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentMethod("cash");
    setCurrentAmount("");
    setPayments([]);
    setIsProcessing(false);
    setGiftCardNumber("");
    setLoyaltyPointsToUse(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (remainingDue <= 0) {
        handlePayment();
      } else {
        handleAddPayment();
      }
    }
  };

  // Quick amount buttons for cash
  const quickAmounts = [10, 20, 50, 100];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Transaction</DialogTitle>
          <DialogDescription>
            Total Due: <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
            {customer && (
              <span className="ml-2 text-xs text-muted-foreground">
                Customer: {customer.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between font-bold text-xl text-green-600">
            <span>Remaining Due:</span>
            <span>{formatCurrency(remainingDue)}</span>
          </div>

          {/* Payment Method Selection */}
          <RadioGroup
            value={currentMethod}
            onValueChange={(value: PaymentMethod) => {
              setCurrentMethod(value);
              setCurrentAmount("");
            }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="cash" id="cash-method" />
              <Label htmlFor="cash-method" className="flex items-center gap-2 cursor-pointer flex-1">
                <Banknote className="h-4 w-4 text-green-600" /> Cash
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="card" id="card-method" />
              <Label htmlFor="card-method" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-4 w-4 text-blue-600" /> Card
              </Label>
            </div>
            {customer && availableLoyaltyPoints >= minRedeemPoints && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer border-yellow-500/30 bg-yellow-500/5">
                <RadioGroupItem value="loyalty" id="loyalty-method" />
                <Label htmlFor="loyalty-method" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Star className="h-4 w-4 text-yellow-500" /> 
                  <span>Loyalty Points</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {availableLoyaltyPoints - loyaltyPointsAlreadyUsed} pts
                  </Badge>
                </Label>
              </div>
            )}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="gift_card" id="gift-card-method" />
              <Label htmlFor="gift-card-method" className="flex items-center gap-2 cursor-pointer flex-1">
                <Gift className="h-4 w-4 text-purple-600" /> Gift Card
              </Label>
            </div>
            {customer && availableStoreCredit > 0 && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer border-emerald-500/30 bg-emerald-500/5 col-span-2">
                <RadioGroupItem value="store_credit" id="store-credit-method" />
                <Label htmlFor="store-credit-method" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet className="h-4 w-4 text-emerald-600" /> 
                  <span>Store Credit</span>
                  <Badge variant="secondary" className="ml-auto">
                    {formatCurrency(availableStoreCredit)} available
                  </Badge>
                </Label>
              </div>
            )}
          </RadioGroup>

          {/* Payment Input Area */}
          {remainingDue > 0 && (
            <div className="space-y-3">
              {/* Cash Payment */}
              {currentMethod === "cash" && (
                <>
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
                      Add
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentAmount(amount.toString())}
                        className="flex-1"
                      >
                        ${amount}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentAmount(remainingDue.toFixed(2))}
                      className="flex-1"
                    >
                      Exact
                    </Button>
                  </div>
                </>
              )}

              {/* Card Payment */}
              {currentMethod === "card" && (
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
                  <Button className="self-end" onClick={handleAddPayment} disabled={parseFloat(currentAmount || remainingDue.toString()) <= 0}>
                    Add
                  </Button>
                </div>
              )}

              {/* Loyalty Points Payment */}
              {currentMethod === "loyalty" && customer && (
                <div className="space-y-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Available Points:</span>
                    <span className="font-semibold">{availableLoyaltyPoints - loyaltyPointsAlreadyUsed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Point Value:</span>
                    <span>{pointValueInCents}¢ per point</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="loyaltyPoints">Points to Redeem</Label>
                      <Input
                        id="loyaltyPoints"
                        type="number"
                        value={loyaltyPointsToUse}
                        onChange={(e) => {
                          const pts = Math.min(
                            Math.max(0, parseInt(e.target.value) || 0),
                            availableLoyaltyPoints - loyaltyPointsAlreadyUsed
                          );
                          setLoyaltyPointsToUse(pts);
                        }}
                        min={minRedeemPoints}
                        max={availableLoyaltyPoints - loyaltyPointsAlreadyUsed}
                        autoFocus
                      />
                    </div>
                    <Button 
                      className="self-end" 
                      onClick={handleAddPayment} 
                      disabled={loyaltyPointsToUse < minRedeemPoints}
                    >
                      Apply
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const pts = Math.min(
                          Math.ceil((remainingDue * 100) / pointValueInCents),
                          availableLoyaltyPoints - loyaltyPointsAlreadyUsed
                        );
                        setLoyaltyPointsToUse(pts);
                      }}
                      className="flex-1"
                    >
                      Cover Remaining
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLoyaltyPointsToUse(availableLoyaltyPoints - loyaltyPointsAlreadyUsed)}
                      className="flex-1"
                    >
                      Use All
                    </Button>
                  </div>
                  {loyaltyPointsToUse > 0 && (
                    <div className="text-center font-semibold text-green-600">
                      = {formatCurrency(loyaltyValueFromPoints)} discount
                    </div>
                  )}
                </div>
              )}

              {/* Gift Card Payment */}
              {currentMethod === "gift_card" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="giftCardNumber">Gift Card Number</Label>
                    <Input
                      id="giftCardNumber"
                      placeholder="Enter or scan gift card"
                      value={giftCardNumber}
                      onChange={(e) => setGiftCardNumber(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="giftCardAmount">Amount to Redeem</Label>
                      <Input
                        id="giftCardAmount"
                        type="number"
                        placeholder={remainingDue.toFixed(2)}
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(e.target.value)}
                        onKeyDown={handleKeyDown}
                        step="0.01"
                      />
                    </div>
                    <Button 
                      className="self-end" 
                      onClick={handleAddPayment} 
                      disabled={!giftCardNumber.trim() || parseFloat(currentAmount) <= 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              {/* Store Credit Payment */}
              {currentMethod === "store_credit" && customer && (
                <div className="space-y-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Available Credit:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(availableStoreCredit)}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="storeCreditAmount">Amount to Use</Label>
                      <Input
                        id="storeCreditAmount"
                        type="number"
                        placeholder={Math.min(availableStoreCredit, remainingDue).toFixed(2)}
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(e.target.value)}
                        onKeyDown={handleKeyDown}
                        step="0.01"
                        max={Math.min(availableStoreCredit, remainingDue)}
                        autoFocus
                      />
                    </div>
                    <Button 
                      className="self-end" 
                      onClick={handleAddPayment} 
                      disabled={parseFloat(currentAmount) <= 0}
                    >
                      Apply
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentAmount(Math.min(availableStoreCredit, remainingDue).toFixed(2))}
                    className="w-full"
                  >
                    Use Maximum ({formatCurrency(Math.min(availableStoreCredit, remainingDue))})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment List */}
          {payments.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <div className="font-semibold text-sm mb-2">Payments Applied:</div>
              {payments.map((p, index) => (
                <div key={index} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                  <span className="flex items-center gap-2">
                    {p.method === "cash" && <Banknote className="h-3 w-3 text-green-600" />}
                    {p.method === "card" && <CreditCard className="h-3 w-3 text-blue-600" />}
                    {p.method === "loyalty" && <Star className="h-3 w-3 text-yellow-500" />}
                    {p.method === "gift_card" && <Gift className="h-3 w-3 text-purple-600" />}
                    {p.method === "store_credit" && <Wallet className="h-3 w-3 text-emerald-600" />}
                    <span className="capitalize">{p.method.replace("_", " ")}</span>
                    {p.reference && <span className="text-xs text-muted-foreground">({p.reference})</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removePayment(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Final Summary */}
          {remainingDue <= 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex justify-between font-medium">
                <span>Total Paid:</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-lg font-bold pt-2 mt-2 border-t border-green-200 dark:border-green-800">
                  <span>Change Due:</span>
                  <span className="text-primary">{formatCurrency(change)}</span>
                </div>
              )}
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
