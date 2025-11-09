// src/pos/POSReceipt.tsx
import { useRef } from "react";
import { Printer, X, Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const POSReceipts = () => {
  interface CartItem {
    id: string;
    name: string;
    sku: string;
    cartQuantity: number;
    price: number;
  }

  // NEW: Payment Type
  type Payment = {
    method: "cash" | "card";
    amount: number;
  };

  interface POSReceiptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: CartItem[];
    total: number;
    taxAmount: number; // <-- NEW PROP
    payments: Payment[]; // <-- NEW PROP: Payments Array
    amountPaid: number; // The total amount tendered across all payments
    transactionDate: Date;
    transactionId: string;
  }

  export const POSReceipt = ({
    open,
    onOpenChange,
    items,
    total,
    taxAmount,
    payments,
    amountPaid,
    transactionDate,
    transactionId,
  }: POSReceiptProps) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    const subtotalBeforeTax = total - taxAmount;
    const change = amountPaid - total;
    const hasCashPayment = payments.some((p) => p.method === "cash");
    const paymentMethodLabel = payments.length > 1 ? "Split Tender" : payments[0]?.method.toUpperCase() || "N/A";

    const PaymentIcon = ({ method }: { method: "cash" | "card" }) => {
      return method === "cash" ? (
        <Banknote className="h-4 w-4 text-green-600" />
      ) : (
        <CreditCard className="h-4 w-4 text-blue-600" />
      );
    };

    // Simplified Print handler for brevity
    const handlePrint = () => {
      if (receiptRef.current) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${transactionId}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  max-width: 80mm;
                  margin: 0 auto;
                  padding: 10mm;
                }
                .receipt-header, .receipt-footer, .receipt-total {
                  margin-bottom: 10px;
                  text-align: center;
                }
                .item-row, .payment-row {
                  display: flex;
                  justify-content: space-between;
                  font-size: 10px;
                }
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  font-weight: bold;
                  font-size: 14px;
                  border-top: 1px dashed #000;
                  padding-top: 5px;
                  margin-top: 5px;
                }
                @media print {
                    .no-print { display: none; }
                }
              </style>
            </head>
            <body>
                <div class="receipt-header">
                    <h2>YOUR STORE NAME</h2>
                    <p>Transaction: ${transactionId}</p>
                    <p>Date: ${format(transactionDate, "yyyy-MM-dd HH:mm")}</p>
                    <p>Payment: ${paymentMethodLabel}</p>
                </div>
                <div class="receipt-items">
                    <div class="item-row" style="border-bottom: 1px dashed #000;">
                        <span>QTY ITEM / PRICE</span>
                        <span>AMOUNT</span>
                    </div>
                    ${items
                      .map(
                        (item) => `
                        <div class="item-row">
                            <span>${item.cartQuantity} x ${item.name.substring(0, 20)}</span>
                            <span>$${(item.cartQuantity * item.price).toFixed(2)}</span>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                
                <div class="receipt-total" style="margin-top: 10px;">
                    <div class="total-row" style="font-weight: normal; border-top: 0;">
                        <span>Subtotal:</span>
                        <span>$${subtotalBeforeTax.toFixed(2)}</span>
                    </div>
                    <div class="total-row" style="font-weight: normal; border-top: 0;">
                        <span>Tax:</span>
                        <span>$${taxAmount.toFixed(2)}</span>
                    </div>
                    
                    <div class="total-row">
                        <span>TOTAL:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                    
                    <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; text-align: left;">
                        <p style="margin: 0; font-size: 10px; font-weight: bold;">Payments:</p>
                        ${payments
                          .map(
                            (p) => `
                            <div class="payment-row">
                                <span>${p.method.toUpperCase()}</span>
                                <span>$${p.amount.toFixed(2)}</span>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>

                    ${
                      hasCashPayment
                        ? `
                        <div class="total-row" style="font-weight: normal; border-top: 0;">
                            <span>Tendered:</span>
                            <span>$${amountPaid.toFixed(2)}</span>
                        </div>
                        <div class="total-row" style="font-size: 16px;">
                            <span>Change:</span>
                            <span>$${change.toFixed(2)}</span>
                        </div>
                    `
                        : ""
                    }
                </div>
                <div class="receipt-footer">
                    <p>Thank you for your business!</p>
                </div>
                <script>window.print();</script>
            </body>
          </html>
        `);
          printWindow.document.close();
        }
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Receipt: {transactionId}</DialogTitle>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Receipt Content for Screen */}
          <div ref={receiptRef} className="p-2 space-y-4 font-mono text-sm">
            <div className="receipt-header text-center">
              <h2 className="text-xl font-bold mb-1">YOUR STORE NAME</h2>
              <p className="text-xs">Transaction: {transactionId}</p>
              <p className="text-xs">Date: {format(transactionDate, "yyyy-MM-dd HH:mm:ss")}</p>
            </div>

            <div className="receipt-items border-t border-b py-2 space-y-1">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <span className="font-medium truncate">
                      {item.name} ({item.sku})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.cartQuantity} @ ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <span className="font-bold min-w-[70px] text-right">
                    ${(item.cartQuantity * item.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="receipt-total space-y-2">
              <div className="flex justify-between text-base">
                <span>Subtotal:</span>
                <span>${subtotalBeforeTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-base">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-xl border-t-2 pt-3 mt-3">
                <span>TOTAL:</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* Payments List */}
              <div className="pt-2 border-t">
                <h4 className="font-bold text-sm mb-1">Payments:</h4>
                {payments.map((p, index) => (
                  <div key={index} className="flex justify-between text-base">
                    <span className="flex items-center gap-1">
                      <PaymentIcon method={p.method} />
                      {p.method === "cash" ? "Cash" : "Card"}
                    </span>
                    <span>${p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {hasCashPayment && (
                <>
                  <div className="flex justify-between">
                    <span>Amount Tendered:</span>
                    <span>${amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Change:</span>
                    <span>${change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="receipt-footer text-center mt-6 pt-4 border-t-2 border-dashed text-xs">
              <p className="mb-1">Thank you for your business!</p>
              <p>Method: {paymentMethodLabel}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
};
export default POSReceipts;
