// src/pos/POSHome.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { ShoppingCart, Loader2, X, Receipt as ReceiptIcon, PauseCircle, Play } from "lucide-react";
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
import { POSSessionControl } from "@/components/POSSessionControl"; // <-- NEW IMPORT

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
  size?: string; // Added for apparel context
  color?: string; // Added for apparel context
};

type CartItem = Product & {
  cartQuantity: number;
  itemDiscountType?: "fixed" | "percent";
  itemDiscountValue?: number;
};

const POSHome = () => {
  const queryClient = useQueryClient();
  const { sessionId, cashierId, isSessionOpen, saveHold, resumeHold, removeHold } = usePOS();

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
        .select("id, name, quantity, sku, price_levels(selling_price, is_current), size, color") // Updated select to include size and color
        .eq("price_levels.is_current", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((i: any) => ({
        ...i,
        price: i.price_levels?.[0]?.selling_price || 0,
        size: i.size,
        color: i.color,
      }));
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
      // Insert into transactions table (NOTE: This structure should be improved in the "Data Robustness" section)
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

  // Removed quickOpenSession function

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">POS</h1>
            {/* NEW: Use the formal session control component */}
            <POSSessionControl />
          </div>
        </div>

        {/* Action buttons consolidated for quick access */}
        <div className="flex gap-2 items-center">
          <Button onClick={() => window.location.assign("/pos/receipts")} variant="outline">
            Receipts
          </Button>
          <Button onClick={() => window.location.assign("/pos/refunds")} variant="destructive">
            Refunds
          </Button>
        </div>
      </header>

      {/* MODIFIED: Layout changed to a 3/2 split (5 columns total) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* LEFT SIDE: Product Input & Cart (3 columns) */}
        <div className="md:col-span-3 space-y-4">
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

          {/* Cart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Cart ({cart.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-muted-foreground text-center p-4">Cart is empty. Scan or search a product.</div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const productData = products.find((p) => p.id === item.id);
                    const maxQty = productData?.quantity ?? item.cartQuantity;

                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/40 rounded">
                        <div className="min-w-0 pr-2 flex-1">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                            {item.size && <span> • Size: {item.size}</span>}
                            {item.color && <span> • Color: {item.color}</span>}
                          </div>
                          {item.itemDiscountValue ? (
                            <div className="text-xs text-red-500">
                              Discount: {item.itemDiscountValue}
                              {item.itemDiscountType === "percent" ? "%" : " Fixed"}
                            </div>
                          ) : null}
                        </div>

                        {/* MODIFIED: Quantity Control with +/- Buttons (Faster UX) */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                              onClick={() => updateCartQty(item.id, item.cartQuantity - 1)}
                              disabled={item.cartQuantity <= 1}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.cartQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const finalVal = Math.min(val, maxQty);
                                updateCartQty(item.id, finalVal);
                              }}
                              className="w-12 h-8 text-center border-y-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-1"
                              min="1"
                              max={maxQty}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                if (item.cartQuantity < maxQty) {
                                  updateCartQty(item.id, item.cartQuantity + 1);
                                } else {
                                  toast.error("Reached maximum available stock.");
                                }
                              }}
                              disabled={item.cartQuantity >= maxQty}
                            >
                              +
                            </Button>
                          </div>

                          <div className="flex flex-col items-end w-20">
                            <div className="font-semibold">${(item.price * item.cartQuantity).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">${item.price.toFixed(2)} ea</div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button onClick={createHold} disabled={!cart.length}>
                  Hold (F2)
                </Button>
                <Button variant="outline" onClick={() => setCart([])} disabled={!cart.length}>
                  Clear Cart (Esc)
                </Button>
              </div>

              {/* Hold List Logic */}
              {Object.keys((window as any).posHolds || {}).length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Holds</h4>
                  {holdsList.map((id) => (
                    <Button
                      key={id}
                      variant="outline"
                      size="sm"
                      className="mt-2 mr-2"
                      onClick={() => resumeHoldById(id)}
                    >
                      <Play className="h-3 w-3 mr-1" /> Resume {id}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE: Summary & Payment (2 columns) */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Global Discount</div>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={globalDiscountType}
                      onChange={(e) => setGlobalDiscountType(e.target.value as any)}
                      className="rounded border px-2 py-1"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percent">%</option>
                    </select>

                    <Input
                      type="number"
                      className="w-28 h-8"
                      value={globalDiscountValue}
                      onChange={(e) => setGlobalDiscountValue(parseFloat(e.target.value || "0"))}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-red-500">Item discounts: -${itemDiscountTotal.toFixed(2)}</div>
                  <div className="text-red-500">Global: -${globalDiscountAmount.toFixed(2)}</div>
                </div>
              </div>

              <hr />
              <div className="flex justify-between text-xl font-bold">
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!cart.length || !isSessionOpen}
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <ReceiptIcon className="h-5 w-5 mr-2" /> Pay (${total.toFixed(2)})
                </Button>
              </div>

              {/* POS Actions moved to right column */}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => window.location.assign("/pos/closing")}>
                  Closing Cash
                </Button>
                <Button variant="outline" onClick={() => window.location.assign("/pos/receipts")}>
                  View Receipts
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
