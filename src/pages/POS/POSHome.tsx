import { useState, useMemo, useCallback, useEffect } from "react";
import { ShoppingCart, Loader2, X, Receipt as ReceiptIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POSBarcodeInput } from "@/components/POSBarcodeInput";
import { POSPaymentDialog } from "@/components/POSPaymentDialog";
import { POSReceipt } from "@/components/POSReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  min_stock: number;
  category: string;
  sku: string;
  image?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
}

const POSHome = () => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // Load products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, quantity, category, sku, min_stock, image, price_levels(selling_price, is_current)")
        .eq("price_levels.is_current", true);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        price: item.price_levels?.[0]?.selling_price || 0,
      }));
    },
  });

  // --- Cart Logic ---
  const handleProductSelect = useCallback((product: Product) => {
    if (product.quantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= product.quantity) {
          toast.error(`Max stock reached for ${product.name}`);
          return prev;
        }
        return prev.map((i) => (i.id === product.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i));
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  }, []);

  const updateCartQuantity = (id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, cartQuantity: Math.max(1, qty) } : item))
        .filter((item) => item.cartQuantity > 0),
    );
  };

  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.id !== id));

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Clear all items from cart?")) setCart([]);
  };

  // --- Totals ---
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0), [cart]);
  const tax = useMemo(() => (subtotal * taxRate) / 100, [subtotal, taxRate]);
  const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);

  // --- Payment Handler ---
  const handlePaymentComplete = async (method: "cash" | "card", amountPaid?: number) => {
    const txnId = `TXN-${Date.now()}`;

    try {
      for (const item of cart) {
        const { error } = await supabase.from("sales").insert({
          item_id: item.id,
          sku: item.sku,
          quantity: item.cartQuantity,
          price: item.price,
        });
        if (error) throw error;

        await supabase
          .from("items")
          .update({ quantity: item.quantity - item.cartQuantity })
          .eq("id", item.id);
      }

      setLastTransaction({
        id: txnId,
        items: [...cart],
        total,
        amountPaid,
        paymentMethod: method,
        date: new Date(),
      });

      toast.success("Payment successful!");
      setCart([]);
      setDiscount(0);
      setShowPaymentDialog(false);
      setShowReceipt(true);
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    } catch (err: any) {
      toast.error("Checkout failed: " + err.message);
    }
  };

  // --- Shortcuts ---
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentDialog(true);
      }
      if (e.key === "Escape") clearCart();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [cart]);

  // --- UI ---
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          POS System
        </h1>
        {cart.length > 0 && (
          <Button variant="destructive" onClick={clearCart}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear Cart
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Search */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan or Search Product</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <POSBarcodeInput products={products} onProductSelect={handleProductSelect} />
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} × {item.cartQuantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={item.cartQuantity}
                          onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value))}
                          min={1}
                          max={item.quantity}
                          className="w-16 text-center"
                        />
                        <span className="font-bold w-20 text-right">
                          ${(item.price * item.cartQuantity).toFixed(2)}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.id)}>
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

        {/* Right: Summary & Payment */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount:</span>
                <Input
                  type="number"
                  className="w-24 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Tax ({taxRate}%):</span>
                <Input
                  type="number"
                  className="w-24 text-right"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <Button
                disabled={cart.length === 0}
                className="w-full h-12 text-lg mt-4"
                onClick={() => setShowPaymentDialog(true)}
              >
                <ReceiptIcon className="h-5 w-5 mr-2" />
                Pay & Complete Sale
              </Button>
            </CardContent>
          </Card>

          {lastTransaction && (
            <Card>
              <CardHeader>
                <CardTitle>Last Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <p>ID: {lastTransaction.id}</p>
                <p>Total: ${lastTransaction.total.toFixed(2)}</p>
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setShowReceipt(true)}>
                  <ReceiptIcon className="h-4 w-4 mr-2" /> View Receipt
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment & Receipt */}
      <POSPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={total}
        onPaymentComplete={handlePaymentComplete}
      />

      {lastTransaction && (
        <POSReceipt
          open={showReceipt}
          onOpenChange={setShowReceipt}
          items={lastTransaction.items}
          total={lastTransaction.total}
          paymentMethod={lastTransaction.paymentMethod}
          amountPaid={lastTransaction.amountPaid}
          transactionDate={lastTransaction.date}
          transactionId={lastTransaction.id}
        />
      )}
    </div>
  );
};

export default POSHome;
