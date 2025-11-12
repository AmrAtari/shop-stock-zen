// src/pos/POSHome.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { ShoppingCart, Loader2, X, Receipt as ReceiptIcon, PauseCircle, Play, Keyboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POSBarcodeInput } from "@/components/POSBarcodeInput";
import { POSPaymentDialog } from "@/components/POSPaymentDialog";
import { POSReceipt } from "@/components/POSReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePOS } from "./POSContext";

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
};

type CartItem = Product & {
  cartQuantity: number;
  itemDiscountType?: "fixed" | "percent";
  itemDiscountValue?: number;
};

const POSHome = () => {
  const queryClient = useQueryClient();
  const { sessionId, cashierId, openSession, isSessionOpen, saveHold, resumeHold, removeHold } = usePOS();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [globalDiscountType, setGlobalDiscountType] = useState<"fixed" | "percent">("fixed");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);
  const [holdsList, setHoldsList] = useState<string[]>([]);

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("items")
        // CORRECTED: The failing 'price_levels' join and filter are removed.
        // Now fetching the direct 'price' column available on the 'items' table.
        .select("id, name, quantity, sku, price, size(name), color(name)")
        // Removed: .eq("price_levels.is_current", true)
        .order("name");
      if (error) throw error;
      // CORRECTED: Mapping logic updated to use the direct 'price' property.
      return (data || []).map((i: any) => ({ ...i, price: i.price || 0 }));
    },
  });

  // Add product to cart (respect stock)
  const handleProductSelect = useCallback((product: Product) => {
    if (product.quantity <= 0) {
      toast.error("Out of stock");
      return;
    }
    setCart((prev) => {
      const found = prev.find((p) => p.id === product.id);
      if (found) {
        if (found.cartQuantity + 1 > product.quantity) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((p) => (p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p));
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    // Helpful beep / UI feedback could be added here
  }, []);

  const updateCartQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, cartQuantity: Math.max(0, qty) } : it))
        .filter((it) => it.cartQuantity > 0),
    );
  };

  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.id !== id));

  // Hold / Resume
  const createHold = () => {
    const id = `H-${Date.now()}`;
    saveHold(id, cart);
    setHoldsList((h) => [id, ...h]);
    setCart([]);
  };

  const resumeHoldById = (id: string) => {
    const held = resumeHold(id);
    if (held) {
      setCart(held);
      removeHold(id);
      setHoldsList((h) => h.filter((x) => x !== id));
    } else {
      toast.error("Hold not found");
    }
  };

  // Discounts
  const applyItemDiscount = (id: string, type: "fixed" | "percent", value: number) => {
    setCart((prev) =>
      prev.map((it) => (it.id === id ? { ...it, itemDiscountType: type, itemDiscountValue: value } : it)),
    );
  };

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

  const total = useMemo(
    () => Math.max(0, subtotal - itemDiscountTotal - globalDiscountAmount),
    [subtotal, itemDiscountTotal, globalDiscountAmount],
  );

  // Checkout flow: create transaction, write sales rows, update stock, attach sessionId & cashierId
  const handlePaymentComplete = async (payments: Array<{ method: "cash" | "card"; amount: number }>, changeDue: number) => {
    if (!cart.length) return toast.error("Cart empty");
    if (!sessionId || !cashierId) {
      toast.error("Open a cashier session first");
      return;
    }

    const transactionId = `TXN-${Date.now()}`;
    // Use the payment method with the largest amount as the primary method
    const primaryPayment = payments.reduce((max, p) => p.amount > max.amount ? p : max, payments[0]);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    try {
      // Insert into transactions table
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
          payment_method: primaryPayment.method,
        };
      });

      const { error: transactionError } = await supabase.from("transactions").insert(transactionItems);

      if (transactionError) throw transactionError;

      // Save transaction to sales for historical record
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

      // TODO: Update store_inventory instead of items table
      // POS needs to track which store it's operating from to update the correct store_inventory record
      // For now, skipping inventory updates to prevent double-counting
      console.warn("POS inventory updates disabled - requires store context implementation");

      // show receipt
      setLastTransaction({
        transactionId,
        items: cart,
        total,
        paymentMethod: primaryPayment.method,
        amountPaid: totalPaid,
        date: new Date(),
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") createHold();
      if (e.ctrlKey && e.key === "p") setShowPaymentDialog(true);
      if (e.key === "Escape") setCart([]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, createHold]);

  // session helper quick open
  const quickOpenSession = async () => {
    const cashier = prompt("Enter cashier id/email:");
    const startCashStr = prompt("Start cash amount:", "0");
    const startCash = parseFloat(startCashStr || "0");
    if (!cashier) return toast.error("Cashier required");
    await openSession(cashier, startCash);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Professional Header Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Point of Sale</h1>
                <p className="text-sm text-muted-foreground">Fast checkout & transaction management</p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              {!isSessionOpen ? (
                <Button onClick={quickOpenSession} size="lg" className="font-semibold">
                  Open Session
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-lg border border-success/20">
                  <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Session Active</span>
                </div>
              )}
              <Button onClick={() => window.location.assign("/pos/receipts")} variant="outline" size="lg">
                <ReceiptIcon className="h-4 w-4 mr-2" />
                Receipts
              </Button>
              <Button onClick={() => window.location.assign("/pos/closing")} variant="outline" size="lg">
                Close Session
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Product Selection & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barcode Scanner Section */}
            <Card className="border-2">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="text-lg">Product Scanner</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingProducts ? (
                  <div className="py-12 text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading products...</p>
                  </div>
                ) : (
                  <POSBarcodeInput products={products} onProductSelect={(p) => handleProductSelect(p)} />
                )}
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            {cart.length > 0 ? (
              <Card className="border-2">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Shopping Cart</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                        {cart.length} {cart.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                    {cart.map((it) => (
                      <div key={it.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{it.name}</h4>
                          <p className="text-sm text-muted-foreground">SKU: {it.sku}</p>
                          <p className="text-xs text-muted-foreground mt-1">${it.price.toFixed(2)} × {it.cartQuantity}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => updateCartQty(it.id, it.cartQuantity - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              className="w-16 h-8 text-center font-semibold"
                              value={it.cartQuantity}
                              min={1}
                              max={it.quantity}
                              onChange={(e) => updateCartQty(it.id, parseInt(e.target.value || "0"))}
                            />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => updateCartQty(it.id, it.cartQuantity + 1)}
                              disabled={it.cartQuantity >= it.quantity}
                            >
                              +
                            </Button>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <div className="text-lg font-bold text-foreground">
                              ${(it.price * it.cartQuantity).toFixed(2)}
                            </div>
                          </div>

                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(it.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-3">
                    <Button onClick={createHold} variant="outline" className="flex-1">
                      <PauseCircle className="h-4 w-4 mr-2" />
                      Hold (F2)
                    </Button>
                    <Button variant="outline" onClick={() => setCart([])} className="flex-1">
                      <X className="h-4 w-4 mr-2" />
                      Clear Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-dashed">
                <CardContent className="py-16 text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Cart is Empty</h3>
                  <p className="text-sm text-muted-foreground">Scan or search for products to add them to the cart</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Order Summary & Payment */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-2">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                  </div>

                  {(itemDiscountTotal > 0 || globalDiscountAmount > 0) && (
                    <>
                      {itemDiscountTotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Item Discounts</span>
                          <span className="font-semibold text-success">-${itemDiscountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {globalDiscountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Global Discount</span>
                          <span className="font-semibold text-success">-${globalDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-3 border-t">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Discount Controls */}
                <div className="pt-3 border-t space-y-3">
                  <label className="text-sm font-medium text-foreground">Apply Discount</label>
                  <div className="flex gap-2">
                    <select
                      value={globalDiscountType}
                      onChange={(e) => setGlobalDiscountType(e.target.value as any)}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="fixed">$ Fixed</option>
                      <option value="percent">% Percent</option>
                    </select>

                    <Input
                      type="number"
                      placeholder="0"
                      className="flex-1"
                      value={globalDiscountValue || ""}
                      onChange={(e) => setGlobalDiscountValue(parseFloat(e.target.value || "0"))}
                    />
                  </div>
                </div>

                {/* Payment Button */}
                <div className="pt-4">
                  <Button 
                    disabled={!cart.length || !isSessionOpen} 
                    onClick={() => setShowPaymentDialog(true)}
                    size="lg"
                    className="w-full text-base font-semibold"
                  >
                    {!isSessionOpen ? 'Open Session to Continue' : 'Process Payment'}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => window.location.assign("/pos/refunds")} size="sm">
                    Refunds
                  </Button>
                  <Button variant="outline" onClick={() => window.location.assign("/pos/receipts")} size="sm">
                    <ReceiptIcon className="h-4 w-4 mr-1" />
                    History
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Last Transaction */}
            {lastTransaction && (
              <Card className="border-2 border-success/20 bg-success/5">
                <CardHeader className="bg-success/10 border-b border-success/20">
                  <CardTitle className="text-base text-success flex items-center gap-2">
                    <ReceiptIcon className="h-4 w-4" />
                    Last Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-xs text-muted-foreground">Transaction ID</div>
                  <div className="font-mono text-sm font-semibold">{lastTransaction?.transactionId}</div>
                  <div className="text-xs text-muted-foreground mt-2">Total Amount</div>
                  <div className="text-lg font-bold text-success">${lastTransaction?.total?.toFixed?.(2)}</div>
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => setShowPaymentDialog(true)}>
                    <ReceiptIcon className="h-3 w-3 mr-2" />
                    Reprint Receipt
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Keyboard Shortcuts */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-sm text-primary flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hold Transaction</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">F2</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Process Payment</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">Ctrl + P</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Clear Cart</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">ESC</kbd>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <POSPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={total}
        onPaymentComplete={handlePaymentComplete}
      />

      {lastTransaction && (
        <POSReceipt
          open={true}
          onOpenChange={() => setLastTransaction(null)}
          items={lastTransaction.items}
          total={lastTransaction.total}
          paymentMethod={lastTransaction.paymentMethod}
          amountPaid={lastTransaction.amountPaid}
          transactionDate={lastTransaction.date}
          transactionId={lastTransaction.transactionId}
        />
      )}
    </div>
  );
};

export default POSHome;
