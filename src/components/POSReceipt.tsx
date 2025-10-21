import { useRef } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  cartQuantity: number;
  price: number;
}

interface POSReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  total: number;
  paymentMethod: "cash" | "card";
  amountPaid?: number;
  transactionDate: Date;
  transactionId: string;
}

export const POSReceipt = ({
  open,
  onOpenChange,
  items,
  total,
  paymentMethod,
  amountPaid,
  transactionDate,
  transactionId,
}: POSReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

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
                  font-size: 12px;
                }
                .receipt-header {
                  text-align: center;
                  margin-bottom: 20px;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                }
                .receipt-header h1 {
                  margin: 0 0 5px 0;
                  font-size: 24px;
                }
                .receipt-info {
                  margin-bottom: 15px;
                  font-size: 11px;
                }
                .receipt-items {
                  border-top: 1px dashed #000;
                  border-bottom: 1px dashed #000;
                  padding: 10px 0;
                  margin-bottom: 10px;
                }
                .item {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                }
                .item-name {
                  flex: 1;
                }
                .item-qty {
                  margin: 0 10px;
                }
                .item-price {
                  text-align: right;
                  min-width: 60px;
                }
                .receipt-total {
                  border-top: 2px solid #000;
                  padding-top: 10px;
                  margin-top: 10px;
                }
                .total-line {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 5px;
                }
                .total-line.grand {
                  font-size: 16px;
                  font-weight: bold;
                  margin-top: 10px;
                  padding-top: 10px;
                  border-top: 1px dashed #000;
                }
                .receipt-footer {
                  text-align: center;
                  margin-top: 20px;
                  padding-top: 10px;
                  border-top: 2px dashed #000;
                  font-size: 11px;
                }
                @media print {
                  body { margin: 0; padding: 5mm; }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const change = amountPaid ? amountPaid - total : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" variant="default">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="bg-white p-6 font-mono text-sm border-2 border-dashed"
        >
          <div className="receipt-header text-center mb-6 pb-4 border-b-2 border-dashed">
            <h1 className="text-2xl font-bold mb-2">STOCKFLOW POS</h1>
            <p className="text-xs">Inventory Management System</p>
          </div>

          <div className="receipt-info mb-4 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-bold">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{format(transactionDate, "MMM dd, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{format(transactionDate, "hh:mm a")}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="uppercase font-bold">{paymentMethod}</span>
            </div>
          </div>

          <div className="receipt-items border-t border-b border-dashed py-4 mb-4">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    SKU: {item.sku}
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-muted-foreground">
                    {item.cartQuantity} x ${item.price.toFixed(2)}
                  </span>
                  <span className="font-bold min-w-[70px] text-right">
                    ${(item.cartQuantity * item.price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="receipt-total space-y-2">
            <div className="flex justify-between text-base">
              <span>Subtotal:</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {paymentMethod === "cash" && amountPaid && (
              <>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>${amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Change:</span>
                  <span>${change.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-bold text-xl border-t-2 pt-3 mt-3">
              <span>TOTAL:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="receipt-footer text-center mt-6 pt-4 border-t-2 border-dashed text-xs">
            <p className="mb-1">Thank you for your business!</p>
            <p>Please keep this receipt for your records</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
