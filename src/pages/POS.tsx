import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

import {
  ShoppingCart,
  Trash2,
  Search,
  RefreshCw,
  ArrowLeftRight,
  CheckCircle,
  Printer,
  CreditCard,
  Banknote,
  Receipt,
  XCircle,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import ReceiptPrint from "./Receipt";

interface Item {
  id: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
}

interface CartItem extends Item {
  quantity: number;
}

interface SaleRecord {
  id: string;
  total: number;
  method: string;
  items: CartItem[];
  created_at: string;
}

const POS = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "Credit" | "">("");
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("id, name, price, stock, sku")
      .ilike("name", `%${search}%`)
      .limit(20);
    if (error) toast.error("Failed to fetch items");
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [search]);

  const addToCart = (item: Item) => {
    const exists = cart.find((c) => c.id === item.id);
    if (exists) {
      if (exists.quantity >= item.stock) {
        toast.warning("Not enough stock available");
        return;
      }
      setCart(cart.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => setCart(cart.filter((c) => c.id !== id));

  const updateQuantity = (id: number, qty: number) => {
    setCart(cart.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, qty) } : c)));
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const checkout = async () => {
    if (!paymentMethod) {
      toast.warning("Please select a payment method");
      return;
    }
    if (cart.length === 0) {
      toast.warning("Cart is empty");
      return;
    }

    setLoading(true);
    const saleRecord: SaleRecord = {
      id: `INV-${Date.now()}`,
      total,
      method: paymentMethod,
      items: cart,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("sales").insert(saleRecord);
      if (error) throw error;

      toast.success(`Sale completed with ${paymentMethod}`);
      setLastSale(saleRecord);
      setCart([]);
      setShowCheckout(false);
      setPaymentMethod("");
      fetchItems();
    } catch (err: any) {
      toast.error("Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (item: CartItem) => {
    toast.info(`Refund processed for ${item.name}`);
  };

  const handleStockTransfer = async () => {
    toast.info("Transfer request sent to warehouse");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-primary" />
          Professional POS
        </h1>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Switch Platform
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        {/* Left Section - Search & Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Search or scan products to sell</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search by name or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button onClick={fetchItems}>
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={fetchItems}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
              {loading ? (
                <p>Loading...</p>
              ) : items.length === 0 ? (
                <p>No items found</p>
              ) : (
                items.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3 cursor-pointer hover:bg-muted transition"
                    onClick={() => addToCart(item)}
                  >
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.sku} | Stock: {item.stock}
                    </p>
                    <p className="font-bold mt-1">${item.price.toFixed(2)}</p>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Section - Cart */}
        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
            <CardDescription>Review and checkout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items added</p>
              ) : (
                cart.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${c.price.toFixed(2)} ×{" "}
                        <Input
                          type="number"
                          value={c.quantity}
                          onChange={(e) => updateQuantity(c.id, parseInt(e.target.value))}
                          className="w-14 inline-block mx-1"
                        />{" "}
                        = ${(c.price * c.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleRefund(c)}>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t mt-3 pt-3 space-y-2">
              <p className="font-bold text-lg text-right">Total: ${total.toFixed(2)}</p>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "Cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("Cash")}
                >
                  <Banknote className="w-4 h-4 mr-1" /> Cash
                </Button>
                <Button
                  variant={paymentMethod === "Card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("Card")}
                >
                  <CreditCard className="w-4 h-4 mr-1" /> Card
                </Button>
                <Button
                  variant={paymentMethod === "Credit" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("Credit")}
                >
                  <Receipt className="w-4 h-4 mr-1" /> Credit
                </Button>
              </div>

              <Button className="w-full mt-3" onClick={() => setShowCheckout(true)} disabled={cart.length === 0}>
                Checkout
              </Button>

              <Button variant="outline" className="w-full mt-2" onClick={handleStockTransfer}>
                <Send className="w-4 h-4 mr-1" /> Request Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Confirm Sale</CardTitle>
              <CardDescription>
                Payment: {paymentMethod} | Total: ${total.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button className="flex-1" onClick={checkout} disabled={loading}>
                <CheckCircle className="w-4 h-4 mr-1" /> Confirm
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {lastSale && (
        <div className="fixed bottom-4 right-4 bg-card p-3 rounded-xl shadow-xl border">
          <p className="font-bold">Invoice #{lastSale.id}</p>
          <QRCode value={lastSale.id} size={80} />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLastSale(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
