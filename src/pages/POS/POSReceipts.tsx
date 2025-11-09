import { useRef } from "react";
import { Printer, X, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

// Re-use the CartItem type
interface CartItem {
  id: string;
  name: string;
  sku: string;
  cartQuantity: number;
  price: number;
}

// Re-use the Payment type
export type Payment = {
  method: "cash" | "card";
  amount: number;
};

interface POSReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  total: number;
  payments: Payment[]; // Use the array of payments
  changeDue: number; // New prop for final change amount
  transactionDate: Date;
  transactionId: string;
}

export const POSReceipt = ({
  open,
  onOpenChange,
  items,
  subtotal,
  discountTotal,
  taxAmount,
  total,
  payments,
  changeDue,
  transactionDate,
  transactionId,
}: POSReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

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
                  font-size: 10px;
                  color: black;
                }
                .receipt-header {
                  text-align: center;
                  border-bottom: 2px dashed black;
                  padding-bottom: 5px;
                  margin-bottom: 10px;
                }
                .receipt-items div {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 2px;
                }
                .receipt-totals div, .receipt-payments div {
                    display: flex;
                    justify-content: space-between;
                }
                .receipt-footer {
                  border-top: 2px dashed black;
                  margin-top: 10px;
                  padding-top: 5px;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="receipt-header">
                  <h3>Your Store Name</h3>
                  <p>123 Main St, Anytown USA</p>
                  <p>TXN ID: ${transactionId}</p>
                  <p>${format(transactionDate, "MMM dd, yyyy HH:mm")}</p>
                </div>
                
                <div class="receipt-items">
                  ${items
                    .map(
                      (item) => `
                    <div>
                      <span>${item.cartQuantity} x ${item.name}</span>
                      <span>$${(item.cartQuantity * item.price).toFixed(2)}</span>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
                
                <div class="receipt-totals" style="border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; font-size: 11px;">
                  <div><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
                  <div><span>Discount:</span><span>-$${discountTotal.toFixed(2)}</span></div>
                  <div><span>Tax:</span><span>$${taxAmount.toFixed(2)}</span></div>
                  <div style="font-weight: bold; font-size: 14px;"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>
                </div>
                
                <div class="receipt-payments" style="border-top: 1px dashed black; margin-top: 10px; padding-top: 5px; font-size: 11px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Payment Breakdown:</div>
                    ${payments
                      .map(
                        (p) => `
                        <div>
                            <span>${p.method.charAt(0).toUpperCase() + p.method.slice(1)} Paid:</span>
                            <span>$${p.amount.toFixed(2)}</span>
                        </div>
                    `,
                      )
                      .join("")}
                    ${
                      changeDue > 0
                        ? `
                        <div style="font-weight: bold; border-top: 1px solid black; margin-top: 5px; padding-top: 5px;">
                            <span>Change Due:</span>
                            <span>$${changeDue.toFixed(2)}</span>
                        </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="receipt-footer">
                  <p>Thank you for your business!</p>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex justify-between items-center">
            <span>Transaction Receipt</span>
            <Button variant="ghost" size="icon" onClick={handlePrint}>
              <Printer className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Content Area */}
        <div ref={receiptRef} className="px-6 py-4 space-y-4 font-mono text-sm">
          <div className="receipt-header text-center border-b border-dashed pb-2">
            <h3 className="font-bold text-lg">Your Store Name</h3>
            <p className="text-xs">123 Main St, Anytown USA</p>
            <p className="text-xs mt-1">TXN ID: {transactionId}</p>
            <p className="text-xs">{format(transactionDate, "MMM dd, yyyy HH:mm")}</p>
          </div>

          {/* Line Items */}
          <div className="receipt-items space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <span className="flex-1 pr-2">
                  {item.cartQuantity} x {item.name}
                </span>
                <span className="text-right min-w-[70px]">${(item.cartQuantity * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="receipt-totals space-y-1 border-t border-dashed pt-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span className="text-red-600">-${discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-1">
              <span>TOTAL:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="receipt-payments space-y-1 border-t border-dashed pt-2">
            <div className="font-bold mb-1">Payment Breakdown:</div>
            {payments.map((p, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {p.method === "cash" ? (
                    <Banknote className="inline h-3 w-3 mr-1" />
                  ) : (
                    <CreditCard className="inline h-3 w-3 mr-1" />
                  )}
                  {p.method.charAt(0).toUpperCase() + p.method.slice(1)} Paid
                </span>
                <span>${p.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold border-t pt-1">
              <span>Change Due:</span>
              <span>${changeDue.toFixed(2)}</span>
            </div>
          </div>

          <div className="receipt-footer text-center mt-6 pt-4 border-t border-dashed text-xs">
            <p className="mb-1">Thank you for your business!</p>
            <p>Please keep this receipt for your records</p>
          </div>
        </div>

        <button onClick={() => onOpenChange(false)} className="absolute top-2 right-2 p-1 rounded-full bg-background">
          <X className="h-5 w-5" />
        </button>
      </DialogContent>
    </Dialog>
  );
};
