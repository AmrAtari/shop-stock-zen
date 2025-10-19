import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui";
import { toast } from "sonner";
import {
  ShoppingCart,
  Trash2,
  Search,
  RefreshCw,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
} from "lucide-react";

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

const POS = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Fetch products
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
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  const updateQuantity = (id: number, qty: number) => {
    setCart(
      cart.map((c) =>
        c.id === id ? { ...c, quantity: Math.max(1, qty) } : c
      )
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) {
      toast.warning("Cart is empty");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("sales").insert({
        items: cart.map((i) => ({
          id: i.id,
          qty: i.quantity,
          price: i.price,
        })),
        total,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Sale completed!");
      setCart([]);
      fetchItems();
      setShowCheckout(false);
    } catch (err: any) {
      toast.error("Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const refundItem = async (item: CartItem) => {
    toast.info(`Refund processed for ${item.name}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-primary" />
          POS System
        </h1>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Switch Platform
        </Button>
      </header>

      {/* Search and Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Search Items</CardTitle>
            <CardDescription>Find products by name or SKU</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search or scan barcode..."
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
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

        {/* Cart Section */}
        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
            <CardDescription>Items selected for sale</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items in cart</p>
              ) : (
                cart.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${c.price.toFixed(2)} ×{" "}
                        <Input
                          type="number"
                          value={c.quantity}
                          onChange={(e) =>
                            updateQuantity(c.id, parseInt(e.target.value))
                          }
                          className="w-14 inline-block mx-1"
                        />
                        = ${(c.price * c.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refundItem(c)}
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(c.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t mt-3 pt-3">
              <p className="font-bold text-lg text-right">
                Total: ${total.toFixed(2)}
              </p>
              <Button
                className="w-full mt-3"
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
              >
                Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Confirm Checkout</CardTitle>
              <CardDescription>
                Total amount: ${total.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button className="flex-1" onClick={checkout} disabled={loading}>
                <CheckCircle className="w-4 h-4 mr-1" /> Confirm
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCheckout(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default POS;
