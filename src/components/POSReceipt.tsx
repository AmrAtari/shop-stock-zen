import { useRef, useEffect } from "react";
import { Printer, X, Store, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

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
  autoPrint?: boolean;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  } | null;
  pointsEarned?: number;
  pointsRedeemed?: number;
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
  autoPrint = true,
  customer,
  pointsEarned = 0,
  pointsRedeemed = 0,
}: POSReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { formatCurrency, settings } = useSystemSettings();
  const hasPrinted = useRef(false);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const currencySymbol = getCurrencySymbol(settings?.currency || "USD");
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${transactionId}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Courier New', 'Lucida Console', monospace;
                  max-width: 80mm;
                  margin: 0 auto;
                  padding: 8mm;
                  font-size: 11px;
                  line-height: 1.4;
                  color: #000;
                  background: #fff;
                }
                .receipt-header {
                  text-align: center;
                  margin-bottom: 12px;
                  padding-bottom: 12px;
                  border-bottom: 2px dashed #333;
                }
                .store-name {
                  font-size: 20px;
                  font-weight: bold;
                  margin-bottom: 4px;
                  letter-spacing: 1px;
                }
                .store-tagline {
                  font-size: 9px;
                  color: #666;
                  margin-bottom: 8px;
                }
                .store-info {
                  font-size: 9px;
                  color: #444;
                  line-height: 1.3;
                }
                .receipt-info {
                  margin-bottom: 12px;
                  font-size: 10px;
                  padding-bottom: 8px;
                  border-bottom: 1px dashed #999;
                }
                .receipt-info-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 3px;
                }
                .receipt-info-label {
                  color: #666;
                }
                .receipt-info-value {
                  font-weight: bold;
                }
                .customer-info {
                  background: #f5f5f5;
                  padding: 8px;
                  margin-bottom: 12px;
                  border-radius: 4px;
                  font-size: 10px;
                }
                .customer-info-title {
                  font-weight: bold;
                  margin-bottom: 4px;
                  text-transform: uppercase;
                  font-size: 9px;
                  color: #666;
                }
                .items-header {
                  display: flex;
                  justify-content: space-between;
                  font-weight: bold;
                  padding: 6px 0;
                  border-bottom: 1px solid #333;
                  font-size: 9px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .receipt-items {
                  padding: 8px 0;
                  margin-bottom: 8px;
                  border-bottom: 1px dashed #999;
                }
                .item {
                  margin-bottom: 8px;
                  padding-bottom: 6px;
                }
                .item-name {
                  font-weight: bold;
                  font-size: 11px;
                  margin-bottom: 2px;
                }
                .item-sku {
                  font-size: 8px;
                  color: #888;
                  margin-bottom: 2px;
                }
                .item-details {
                  display: flex;
                  justify-content: space-between;
                  font-size: 10px;
                }
                .item-qty-price {
                  color: #666;
                }
                .item-total {
                  font-weight: bold;
                }
                .receipt-summary {
                  padding: 8px 0;
                  border-bottom: 2px solid #333;
                }
                .summary-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 4px;
                  font-size: 11px;
                }
                .summary-row.subtotal {
                  padding-bottom: 6px;
                  border-bottom: 1px dashed #ccc;
                  margin-bottom: 6px;
                }
                .summary-row.total {
                  font-size: 16px;
                  font-weight: bold;
                  padding-top: 8px;
                  margin-top: 4px;
                  border-top: 2px solid #333;
                }
                .summary-row.payment {
                  color: #444;
                }
                .summary-row.change {
                  font-weight: bold;
                  color: #006600;
                }
                .loyalty-info {
                  background: #fff8e1;
                  padding: 8px;
                  margin: 12px 0;
                  border-radius: 4px;
                  font-size: 10px;
                  text-align: center;
                }
                .loyalty-points {
                  font-weight: bold;
                  color: #f57c00;
                }
                .receipt-footer {
                  text-align: center;
                  margin-top: 16px;
                  padding-top: 12px;
                  border-top: 2px dashed #333;
                  font-size: 10px;
                }
                .thank-you {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 6px;
                }
                .footer-note {
                  font-size: 9px;
                  color: #666;
                  margin-top: 6px;
                }
                .barcode-placeholder {
                  text-align: center;
                  margin: 12px 0;
                  font-family: 'Libre Barcode 39', monospace;
                  font-size: 32px;
                  letter-spacing: 2px;
                }
                @media print {
                  body { margin: 0; padding: 5mm; }
                  .no-print { display: none; }
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
        }, 300);
      }
    }
  };

  // Auto-print when dialog opens
  useEffect(() => {
    if (open && autoPrint && !hasPrinted.current) {
      const timer = setTimeout(() => {
        handlePrint();
        hasPrinted.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!open) {
      hasPrinted.current = false;
    }
  }, [open, autoPrint]);

  const change = amountPaid ? amountPaid - total : 0;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CNY: "¥",
      SAR: "ر.س",
      AED: "د.إ",
      EGP: "ج.م",
      KWD: "د.ك",
    };
    return symbols[currency] || currency + " ";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          className="bg-white p-6 font-mono text-sm border-2 border-dashed rounded-lg"
        >
          {/* Store Header */}
          <div className="receipt-header text-center mb-6 pb-4 border-b-2 border-dashed">
            <div className="flex justify-center mb-2">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h1 className="store-name text-2xl font-bold mb-1 tracking-wide">STOCKFLOW POS</h1>
            <p className="store-tagline text-xs text-muted-foreground">Inventory Management System</p>
            <div className="store-info text-xs text-muted-foreground mt-3 space-y-1">
              <p className="flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                123 Business Street, City
              </p>
              <p className="flex items-center justify-center gap-1">
                <Phone className="h-3 w-3" />
                +1 (555) 123-4567
              </p>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="receipt-info mb-4 text-xs space-y-2 pb-3 border-b border-dashed">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-bold font-mono">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{format(transactionDate, "MMM dd, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{format(transactionDate, "hh:mm:ss a")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="uppercase font-bold">{paymentMethod}</span>
            </div>
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="bg-muted/50 p-3 rounded-lg mb-4 text-xs">
              <div className="font-semibold text-muted-foreground uppercase text-[10px] mb-2">
                Customer Information
              </div>
              <div className="font-medium">{customer.name}</div>
              {customer.phone && (
                <div className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </div>
              )}
            </div>
          )}

          {/* Items Header */}
          <div className="flex justify-between text-xs font-bold uppercase tracking-wide pb-2 border-b border-foreground">
            <span>Item</span>
            <span>Amount</span>
          </div>

          {/* Items List */}
          <div className="receipt-items py-4 mb-4 border-b border-dashed space-y-4">
            {items.map((item, index) => (
              <div key={index} className="item">
                <div className="font-semibold text-foreground">{item.name}</div>
                <div className="text-[10px] text-muted-foreground">SKU: {item.sku}</div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-muted-foreground">
                    {item.cartQuantity} × {formatCurrency(item.price)}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(item.cartQuantity * item.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="receipt-summary space-y-2 pb-4 border-b-2 border-foreground">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {subtotal !== total && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discounts Applied</span>
                <span>-{formatCurrency(subtotal - total)}</span>
              </div>
            )}

            {paymentMethod === "cash" && amountPaid && (
              <>
                <div className="flex justify-between text-sm pt-2 border-t border-dashed">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Change</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-xl font-bold pt-3 mt-2 border-t-2 border-foreground">
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Loyalty Points */}
          {(pointsEarned > 0 || pointsRedeemed > 0) && (
            <div className="bg-amber-50 p-3 rounded-lg my-4 text-center text-xs border border-amber-200">
              <div className="font-bold text-amber-700 mb-1">★ LOYALTY POINTS ★</div>
              {pointsRedeemed > 0 && (
                <div className="text-amber-600">Points Redeemed: -{pointsRedeemed}</div>
              )}
              {pointsEarned > 0 && (
                <div className="text-green-600 font-semibold">Points Earned: +{pointsEarned}</div>
              )}
            </div>
          )}

          {/* Barcode Placeholder */}
          <div className="text-center my-4">
            <div className="font-mono text-2xl tracking-widest">
              ||||| {transactionId.slice(-8)} |||||
            </div>
          </div>

          {/* Footer */}
          <div className="receipt-footer text-center pt-4 border-t-2 border-dashed">
            <p className="text-base font-bold mb-2">Thank you for your business!</p>
            <p className="text-xs text-muted-foreground">Please retain this receipt for your records</p>
            <p className="text-xs text-muted-foreground mt-2">
              Returns accepted within 30 days with receipt
            </p>
            <p className="text-[10px] text-muted-foreground mt-4">
              Powered by StockFlow POS
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
