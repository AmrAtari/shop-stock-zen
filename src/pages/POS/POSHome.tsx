// src/pages/POS/POSHome.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { ShoppingCart, Loader2, X, Receipt as ReceiptIcon, PauseCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POSBarcodeInput } from "@/components/POSBarcodeInput";
// Import interfaces/components for Payment and Receipt
import { POSPaymentDialog } from "@/components/POSPaymentDialog";
import { POSReceipt } from "@/components/POSReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePOS } from "./POSContext";

// --- GLOBAL CONSTANTS & TYPES ---
const TAX_RATE = 0.08; // 8% sales tax

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
  size?: string;
  color?: string;
};

type CartItem = Product & {
  cartQuantity: number;
  itemDiscountType?: "fixed" | "percent";
  itemDiscountValue?: number;
};

// New type for Split Tender payments
export type Payment = {
  method: "cash" | "card";
  amount: number;
};

const POSHome = () => {
  const queryClient = useQueryClient();
  const { sessionId, cashierId, openSession, isSessionOpen, saveHold, resumeHold } = usePOS();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [globalDiscountType, setGlobalDiscountType] = useState<"fixed" | "percent">("fixed");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async (): Promise<Product[]> => {
      // FIX: Changed !inner to !left to return ALL items, resolving the "no products" issue.
      // Items without a current price will be returned with a price of 0.
      const { data, error } = await supabase
        .from("items")
        .select("id, name, quantity, sku, size, color, price_levels!left(selling_price)")
        .eq("price_levels.is_current", true)
        .order("name");
      if (error) throw error;

      return (data || []).map((i: any) => {
        // Find the valid selling price, which should be the only one if it exists
        const currentPriceLevel = i.price_levels?.find((p: any) => p.selling_price !== null);

        return {
          ...i,
          // Use the current price, or default to 0 if none found (i.e., item exists but no current price)
          price: currentPriceLevel?.selling_price || 0,
        };
      });
    },
  });

  // --- LOCAL CART/HOLD HANDLERS ---

  // 1. Logic to add a product to the cart (called by POSBarcodeInput)
  const handleProductSelect = useCallback(
    (product: Product) => {
      // Check if product is already in cart
      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        // Increment quantity if it exists
        setCart((c) =>
          c.map((item) => (item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item)),
        );
      } else {
        // Add new item to cart
        setCart((c) => [...c, { ...product, cartQuantity: 1 }]);
      }
    },
    [cart],
  );

  // 2. Logic to update cart item quantity
  const updateCartQty = useCallback((itemId: string, newQty: number) => {
    if (newQty <= 0) {
      // Remove item if quantity is zero or less
      setCart((c) => c.filter((item) => item.id !== itemId));
      return;
    }
    setCart((c) => c.map((item) => (item.id === itemId ? { ...item, cartQuantity: newQty } : item)));
  }, []);

  // 3. Logic to remove item from cart
  const removeFromCart = useCallback((itemId: string) => {
    setCart((c) => c.filter((item) => item.id !== itemId));
  }, []);

  // 4. Logic to create a hold (uses saveHold from usePOS context)
  const createHold = useCallback(() => {
    if (!cart.length) return toast.error("Cart empty, cannot create a hold.");
    const holdId = `HOLD-${Date.now()}`;
    saveHold(holdId, cart);
    setCart([]);
    toast.success(`Cart saved as hold: ${holdId}`);
  }, [cart, saveHold]);

  // --- CALCULATIONS ---

  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.price * it.cartQuantity, 0), [cart]);

  const itemDiscountTotal = useMemo(
    () =>
      cart.reduce((sum, it) => {
        if (!it.itemDiscountValue) return sum;
        if (it.itemDiscountType === "fixed") return sum + it.itemDiscountValue * it.cartQuantity;
        return sum + (it.price * it.cartQuantity * (it.itemDiscountValue || 0)) / 100;
      }, 0),
    [cart],
  );

  const globalDiscountAmount = useMemo(() => {
    if (!globalDiscountValue) return 0;
    if (globalDiscountType === "fixed") return globalDiscountValue;
    return (subtotal * globalDiscountValue) / 100;
  }, [subtotal, globalDiscountType, globalDiscountValue]);

  // Total after all discounts, but BEFORE tax
  const preTaxTotal = useMemo(
    () => Math.max(0, subtotal - itemDiscountTotal - globalDiscountAmount),
    [subtotal, itemDiscountTotal, globalDiscountAmount],
  );

  // Calculate Tax
  const taxAmount = useMemo(() => preTaxTotal * TAX_RATE, [preTaxTotal]);

  // Final Total (Pre-Tax + Tax)
  const total = useMemo(() => preTaxTotal + taxAmount, [preTaxTotal, taxAmount]);

  // --- CHECKOUT FLOW ---

  const handlePaymentComplete = async (payments: Payment[], changeDue: number = 0) => {
    if (!cart.length) return toast.error("Cart empty");
    if (!sessionId || !cashierId) {
      toast.error("Open a cashier session first");
      return;
    }

    const transactionId = `TXN-${Date.now()}`;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    try {
      // 1. Insert Transaction Summary (Header)
      const { error: summaryError } = await supabase.from("transaction_summary").insert({
        id: transactionId,
        session_id: sessionId,
        cashier_id: cashierId,
        subtotal: subtotal,
        discount_total: itemDiscountTotal + globalDiscountAmount,
        tax_total: taxAmount,
        grand_total: total,
        total_paid: totalPaid,
        change_due: changeDue,
      });
      if (summaryError) {
        console.error("Could not insert into transaction_summary:", summaryError);
      }

      // 2. Insert Split Tender Payments
      const paymentRows = payments.map((p) => ({
        transaction_id: transactionId,
        method: p.method,
        amount: p.amount,
        session_id: sessionId,
      }));

      const { error: paymentError } = await supabase.from("transaction_payments").insert(paymentRows);

      if (paymentError) {
        console.error("Could not insert into transaction_payments:", paymentError);
      }

      // 3. Insert Line Items (The user's existing 'transactions' table is used for this)
      const transactionItems = cart.map((item) => {
        const itemDiscountFixed = item.itemDiscountType === "fixed" ? item.itemDiscountValue || 0 : 0;
        const itemDiscountPercent = item.itemDiscountType === "percent" ? item.itemDiscountValue || 0 : 0;

        return {
          transaction_id: transactionId,
          session_id: sessionId,
          cashier_id: cashierId,
          item_id: item.id,
          sku: item.sku,
          quantity: item.cartQuantity,
          price: item.price,
          discount_fixed: itemDiscountFixed,
          discount_percent: itemDiscountPercent,
          amount:
            item.price * item.cartQuantity -
            itemDiscountFixed * item.cartQuantity -
            (item.price * item.cartQuantity * itemDiscountPercent) / 100,
          is_refund: false,
        };
      });

      const { error: lineItemError } = await supabase.from("transactions").insert(transactionItems);

      if (lineItemError) throw lineItemError;

      // 4. Update Stock
      for (const item of cart) {
        const { error: updateErr } = await supabase
          .from("items")
          .update({ quantity: Math.max(0, item.quantity - item.cartQuantity) })
          .eq("id", item.id);
        if (updateErr) throw updateErr;
      }

      // 5. Save transaction to sales for historical record
      const { error: saleError } = await supabase.from("sales").insert(
        cart.map((item) => ({
          item_id: item.id,
          sku: item.sku,
          quantity: item.cartQuantity,
          price: item.price,
          user_id: cashierId,
        })),
      );

      if (saleError) throw saleError;

      // 6. Set Transaction Data for Receipt
      setLastTransaction({
        transactionId,
        items: cart,
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountTotal: itemDiscountTotal + globalDiscountAmount,
        total: total,
        payments: payments, // The full array of payments
        changeDue: changeDue,
        date: new Date(),
        open: true, // Auto-open receipt
      });

      setCart([]);
      toast.success("Sale completed");
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      setShowPaymentDialog(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Checkout failed: " + (err.message || JSON.stringify(err)));
    }
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // F2 to Hold
      if (e.key === "F2") createHold();
      // Shift + P to Pay
      if (e.shiftKey && e.key === "P") setShowPaymentDialog(true);
      // Escape to Clear Cart
      if (e.key === "Escape") setCart([]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createHold]); // createHold is a dependency

  // session helper quick open
  const quickOpenSession = async () => {
    const cashier = prompt("Enter cashier id/email:");
    const startCashStr = prompt("Start cash amount:", "0");
    const startCash = parseFloat(startCashStr || "0");
    if (!cashier) return toast.error("Cashier required");
    await openSession(cashier, startCash);
  };

  // Quick function to resume a hold by ID
  const handleResumeHold = (holdId: string) => {
    const resumedCart = resumeHold(holdId);
    if (resumedCart) {
      setCart(resumedCart);
      toast.success(`Resumed hold: ${holdId}`);
    } else {
      toast.error(`Hold not found: ${holdId}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">POS</h1>
            <p className="text-sm text-muted-foreground">Cashier workflows, refunds, and closing</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {!isSessionOpen ? (
            <Button onClick={quickOpenSession}>Open Session</Button>
          ) : (
            <Button onClick={() => toast.success("Session active")} variant="outline">
              Session Active
            </Button>
          )}
          <Button onClick={() => window.location.assign("/pos/receipts")}>Receipts</Button>
          <Button onClick={() => window.location.assign("/pos/refunds")} variant="ghost">
            Refunds
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left: scanner + product list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add items (scan or search)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin h-6 w-6" />
                </div>
              ) : (
                <POSBarcodeInput products={products} onProductSelect={handleProductSelect} />
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cart ({cart.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.map((it) => (
                    <div key={it.id} className="flex items-center justify-between p-2 bg-muted/40 rounded">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        <div className="text-sm text-muted-foreground">SKU: {it.sku}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-16 text-center"
                          value={it.cartQuantity}
                          min={1}
                          max={it.quantity}
                          onChange={(e) => updateCartQty(it.id, parseInt(e.target.value || "0"))}
                        />

                        <div className="flex flex-col items-end">
                          <div className="font-semibold">${(it.price * it.cartQuantity).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">${it.price.toFixed(2)} each</div>
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(it.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* per-item discount quick controls (small) */}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={createHold}>Hold (F2)</Button>
                  <Button variant="outline" onClick={() => setCart([])}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Holds List Card */}
          {Object.keys(usePOS().holds).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PauseCircle className="w-5 h-5" />
                  Held Carts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.keys(usePOS().holds).map((holdId) => (
                    <div key={holdId} className="flex justify-between items-center p-2 border rounded">
                      <div className="font-medium">
                        {holdId} ({usePOS().holds[holdId].length} items)
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleResumeHold(holdId)}>
                          <Play className="h-4 w-4 mr-1" /> Resume
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* right: summary & payment */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Global Discount</div>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={globalDiscountType}
                      onChange={(e) => setGlobalDiscountType(e.target.value as any)}
                      className="rounded border px-2 py-1"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percent">Percent</option>
                    </select>

                    <Input
                      type="number"
                      className="w-28"
                      value={globalDiscountValue}
                      onChange={(e) => setGlobalDiscountValue(parseFloat(e.target.value || "0"))}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div>Item discounts: -${itemDiscountTotal.toFixed(2)}</div>
                  <div>Global discount: -${globalDiscountAmount.toFixed(2)}</div>
                  <div className="font-medium mt-1">Total (Pre-Tax): ${preTaxTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Display Tax */}
              <div className="flex justify-between font-medium">
                <span>Tax ({TAX_RATE * 100}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              <hr />
              <div className="flex justify-between text-xl font-bold">
                <span>TOTAL DUE</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button disabled={!cart.length} onClick={() => setShowPaymentDialog(true)}>
                  Pay (Shift + P)
                </Button>
                <Button variant="outline" onClick={() => window.location.assign("/pos/closing")}>
                  Close Session
                </Button>
                <Button variant="ghost" onClick={() => window.location.assign("/pos/receipts")}>
                  Receipts
                </Button>
                <Button variant="destructive" onClick={() => window.location.assign("/pos/refunds")}>
                  Refunds
                </Button>
              </div>
            </CardContent>
          </Card>

          {lastTransaction && (
            <Card>
              <CardHeader>
                <CardTitle>Last Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div>ID: {lastTransaction?.transactionId}</div>
                <div>Total: ${lastTransaction?.total?.toFixed?.(2)}</div>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLastTransaction({ ...lastTransaction, open: true })}
                  >
                    Reprint
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <POSPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={total}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* The receipt dialog is opened by setting lastTransaction.open = true inside handlePaymentComplete */}
      {lastTransaction && (
        <POSReceipt
          open={lastTransaction.open || false}
          onOpenChange={() => setLastTransaction(null)}
          items={lastTransaction.items}
          total={lastTransaction.total}
          payments={lastTransaction.payments}
          changeDue={lastTransaction.changeDue}
          taxAmount={lastTransaction.taxAmount}
          subtotal={lastTransaction.subtotal}
          transactionDate={lastTransaction.date}
          transactionId={lastTransaction.transactionId}
        />
      )}
    </div>
  );
};

export default POSHome;
