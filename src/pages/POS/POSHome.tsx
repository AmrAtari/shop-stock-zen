// src/pos/POSHome.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { ShoppingCart, Loader2, X, Receipt as ReceiptIcon, PauseCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POSBarcodeInput } from "@/components/POSBarcodeInput";
import { POSPaymentDialog } from "@/components/POSPaymentDialog";
import { POSReceipt } from "@/components/POSReceipt";
import { POSSessionControl } from "@/src/POS/POSSessionControl"; // <-- NEW IMPORT
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
        .select("id, name, quantity, sku, price_levels(selling_price, is_current)")
        .eq("price_levels.is_current", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((i: any) => ({ ...i, price: i.price_levels?.[0]?.selling_price || 0 }));
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
  const handlePaymentComplete = async (method: "cash" | "card", amountPaid?: number) => {
    if (!cart.length) return toast.error("Cart empty");
    if (!sessionId || !cashierId) {
      toast.error("Open a cashier session first");
      return;
    }

    const transactionId = `TXN-${Date.now()}`;
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
          payment_method: method,
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

      // Update stock for each item
      for (const item of cart) {
        const { error: updateErr } = await supabase
          .from("items")
          .update({ quantity: Math.max(0, item.quantity - item.cartQuantity) })
          .eq("id", item.id);
        if (updateErr) throw updateErr;
      }

      // show receipt
      setLastTransaction({
        transactionId,
        items: cart,
        total,
        paymentMethod: method,
        amountPaid,
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
  <header className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <ShoppingCart className="h-8 w-8" />
      <div>
        <h1 className="text-2xl font-bold">POS</h1>
        {/* This is now handled by the component */}
        <POSSessionControl />
      </div>
    </div>
  </header>;
  // session helper quick open
  //const quickOpenSession = async () => {
  //  const cashier = prompt("Enter cashier id/email:");
  //  const startCashStr = prompt("Start cash amount:", "0");
  //  const startCash = parseFloat(startCashStr || "0");
  //  if (!cashier) return toast.error("Cashier required");
  //await openSession(cashier, startCash);
  // };

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
                <POSBarcodeInput products={products} onProductSelect={(p) => handleProductSelect(p)} />
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

                {Object.keys((window as any).posHolds || {}).length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Holds</h4>
                    {/* Render holds from localStorage */}
                  </div>
                )}
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
                  <div>Item discounts: ${itemDiscountTotal.toFixed(2)}</div>
                  <div>Global: ${globalDiscountAmount.toFixed(2)}</div>
                </div>
              </div>

              <hr />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button disabled={!cart.length} onClick={() => setShowPaymentDialog(true)}>
                  Pay
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
                  <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
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
