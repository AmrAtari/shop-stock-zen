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

// --- GLOBAL CONSTANTS & TYPES ---
const TAX_RATE = 0.08; // 8% sales tax

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
  size?: string; // Expecting readable name
  color?: string; // Expecting readable name
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
  const { sessionId, cashierId, openSession, isSessionOpen, saveHold, resumeHold, removeHold, holds } = usePOS();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [globalDiscountType, setGlobalDiscountType] = useState<"fixed" | "percent">("fixed");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async (): Promise<Product[]> => {
      // FIX: Removing the .order() clause from the initial fetch to resolve the 400 Bad Request error.
      // Ordering will now be done in JavaScript (Step 5).

      // 1. Fetch all items (including foreign keys)
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("id, name, quantity, sku, size_id, color_id"); // .order("name") removed

      if (itemsError) throw itemsError;

      // 2. Fetch all current price levels
      const { data: pricesData = [], error: pricesError } = await supabase
        .from("price_levels")
        .select("item_id, selling_price")
        .eq("is_current", true);

      if (pricesError) console.error("Could not fetch price levels:", pricesError);
      const priceMap = new Map(pricesData?.map((p: any) => [p.item_id, p.selling_price]) || []);

      // 3. Fetch all sizes (to map IDs to names)
      const { data: sizesData = [] } = await supabase.from("sizes").select("id, name");
      const sizeMap = new Map(sizesData.map((s: any) => [s.id, s.name]));

      // 4. Fetch all colors (to map IDs to names)
      const { data: colorsData = [] } = await supabase.from("colors").select("id, name");
      const colorMap = new Map(colorsData.map((c: any) => [c.id, c.name]));

      // 5. Combine, map, AND NOW ORDER in JavaScript
      const combinedProducts = (itemsData || []).map((item: any) => ({
        ...item,
        size: item.size_id ? sizeMap.get(item.size_id) : undefined,
        color: item.color_id ? colorMap.get(item.color_id) : undefined,
        price: priceMap.get(item.id) || 0,
      }));

      // Sort the products here, in the application code
      return combinedProducts.sort((a, b) => a.name.localeCompare(b.name));
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
    if (!cart.length) return toast.error("Cart empty, cannot create a hold.");
    const id = `H-${Date.now()}`;
    saveHold(id, cart);
    setCart([]);
    toast.success(`Cart saved as hold: ${id}`);
  };

  const resumeHoldById = (id: string) => {
    const held = resumeHold(id);
    if (held) {
      setCart(held);
      removeHold(id);
      toast.success(`Resumed hold: ${id}`);
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
    // Calculate global discount based on the subtotal *after* item discounts
    const discountBase = subtotal - itemDiscountTotal;
    if (globalDiscountType === "fixed") return globalDiscountValue;
    return (discountBase * globalDiscountValue) / 100;
  }, [subtotal, itemDiscountTotal, globalDiscountType, globalDiscountValue]);

  // Total after all discounts, but BEFORE tax
  const preTaxTotal = useMemo(
    () => Math.max(0, subtotal - itemDiscountTotal - globalDiscountAmount),
    [subtotal, itemDiscountTotal, globalDiscountAmount],
  );

  // Calculate Tax
  const taxAmount = useMemo(() => preTaxTotal * TAX_RATE, [preTaxTotal]);

  // Final Total (Pre-Tax + Tax)
  const total = useMemo(() => preTaxTotal + taxAmount, [preTaxTotal, taxAmount]);

  // Checkout flow
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
        // Continue to insert line items even if summary fails (may indicate missing table)
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
        // Continue to insert line items even if payments fails
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

      if (lineItemError) throw lineItemError; // Line items are critical

      // 4. Update Stock
      for (const item of cart) {
        // Fetch current stock to prevent race conditions on quantity
        const { data: currentItem, error: fetchErr } = await supabase
          .from("items")
          .select("quantity")
          .eq("id", item.id)
          .single();

        if (fetchErr || !currentItem) continue; // Skip stock update on failure

        const { error: updateErr } = await supabase
          .from("items")
          .update({ quantity: Math.max(0, currentItem.quantity - item.cartQuantity) })
          .eq("id", item.id);
        if (updateErr) console.error("Stock update failed for item", item.id, updateErr);
      }

      // 5. Save transaction to sales for historical record (optional, based on schema)
      const { error: saleError } = await supabase.from("sales").insert(
        cart.map((item) => ({
          item_id: item.id,
          sku: item.sku,
          quantity: item.cartQuantity,
          price: item.price,
          user_id: cashierId,
        })),
      );

      if (saleError) console.error("Sales table insert failed", saleError);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") createHold();
      if (e.ctrlKey && e.key === "p") setShowPaymentDialog(true);
      if (e.key === "Escape") setCart([]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createHold, setShowPaymentDialog]);

  // session helper quick open
  const quickOpenSession = async () => {
    const cashier = prompt("Enter cashier id/email:");
    const startCashStr = prompt("Start cash amount:", "0");
    const startCash = parseFloat(startCashStr || "0");
    if (!cashier) return toast.error("Cashier required");
    await openSession(cashier, startCash);
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
            <Button onClick={() => toast.success(`Session active: ${sessionId}`)} variant="outline">
              Session Active: {sessionId}
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
                  <p className="mt-2 text-muted-foreground">Loading Products...</p>
                </div>
              ) : (
                <POSBarcodeInput products={products as any} onProductSelect={(p) => handleProductSelect(p)} />
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cart ({cart.reduce((sum, item) => sum + item.cartQuantity, 0)} items)</CardTitle>
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
          {Object.keys(holds).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PauseCircle className="w-5 h-5" />
                  Held Carts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.keys(holds).map((holdId) => (
                    <div key={holdId} className="flex justify-between items-center p-2 border rounded">
                      <div className="font-medium">
                        {holdId} ({holds[holdId].length} items)
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => resumeHoldById(holdId)}>
                          <Play className="h-4 w-4 mr-1" /> Resume
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeHold(holdId)}>
                          <X className="h-4 w-4" />
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
                  <div>Global: -${globalDiscountAmount.toFixed(2)}</div>
                  <div className="font-medium mt-1">Total (Pre-Tax): ${preTaxTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Tax Line */}
              <div className="flex justify-between font-medium">
                <span>Tax ({TAX_RATE * 100}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              <hr />
              <div className="flex justify-between text-xl font-bold">
                <span>GRAND TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button disabled={!cart.length || !isSessionOpen} onClick={() => setShowPaymentDialog(true)}>
                  Pay (Ctrl + P)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.assign("/pos/closing")}
                  disabled={!isSessionOpen}
                >
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

      {lastTransaction && (
        <POSReceipt
          open={lastTransaction.open || false}
          onOpenChange={() => setLastTransaction(null)}
          items={lastTransaction.items}
          total={lastTransaction.total}
          payments={lastTransaction.payments} // Passing full payments array for split tender support in receipt
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
