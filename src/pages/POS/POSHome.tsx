import { useState, useMemo, useCallback } from "react";
import { ShoppingCart, List, Loader2, X, Receipt as ReceiptIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POSBarcodeInput } from "@/components/POSBarcodeInput";
import { POSPaymentDialog } from "@/components/POSPaymentDialog";
import { POSReceipt } from "@/components/POSReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Database Types ---

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  min_stock: number;
  category: string;
  sku: string;
  size?: string;
  color?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
}

// --- Main POS Component ---

const POSHome = () => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{
    items: CartItem[];
    total: number;
    paymentMethod: "cash" | "card";
    amountPaid?: number;
    date: Date;
    id: string;
  } | null>(null);

  // Fetch products from database using React Query
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async (): Promise<Product[]> => {
      try {
        const { data, error } = await supabase
          .from("items")
          .select("*, price_levels!inner(selling_price, is_current)")
          .eq("price_levels.is_current", true)
          .order("name");

        if (error) {
          console.error("Error loading products:", error);
          toast.error("Failed to load products");
          return [];
        }

        // Map price from price_levels
        return (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price_levels?.[0]?.selling_price || 0,
          quantity: item.quantity,
          min_stock: item.min_stock,
          category: item.category,
          sku: item.sku,
          size: item.size,
          color: item.color,
        }));
      } catch (error) {
        console.error("Error in products query:", error);
        return [];
      }
    },
  });


  // --- Cart Logic ---

  const handleProductSelect = useCallback((product: Product) => {
    if (product.quantity === 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.cartQuantity + 1 > product.quantity) {
          toast.error(`Only ${product.quantity} of ${product.name} available`);
          return prevCart;
        }
        toast.success(`Added ${product.name} to cart`);
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      
      toast.success(`Added ${product.name} to cart`);
      return [...prevCart, { ...product, cartQuantity: 1 }];
    });
  }, []);

  const updateCartQuantity = (id: string, newQuantity: number) => {
    setCart((prevCart) => {
      const itemToUpdate = prevCart.find((item) => item.id === id);
      if (!itemToUpdate) return prevCart;

      const currentStock = products.find((p) => p.id === id)?.quantity || 0;

      if (newQuantity > currentStock) {
        toast.error(`Only ${currentStock} of ${itemToUpdate.name} are available.`);
        return prevCart;
      }

      if (newQuantity <= 0) {
        return prevCart.filter((item) => item.id !== id);
      } else {
        return prevCart.map((item) => (item.id === id ? { ...item, cartQuantity: newQuantity } : item));
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price || 0) * item.cartQuantity, 0), [cart]);

  // --- Checkout Logic ---

  const handlePaymentComplete = async (
    paymentMethod: "cash" | "card",
    amountPaid?: number
  ) => {
    try {
      const transactionId = `TXN-${Date.now()}`;
      
      // Insert sales records
      for (const item of cart) {
        const { error: saleError } = await supabase.from("sales").insert({
          item_id: item.id,
          sku: item.sku,
          quantity: item.cartQuantity,
          price: item.price,
        });

        if (saleError) throw saleError;

        // Update inventory quantity
        const currentProduct = products.find((p) => p.id === item.id);
        if (currentProduct) {
          const newQuantity = currentProduct.quantity - item.cartQuantity;
          const { error: updateError } = await supabase
            .from("items")
            .update({ quantity: Math.max(0, newQuantity) })
            .eq("id", item.id);

          if (updateError) throw updateError;
        }
      }

      // Store transaction for receipt
      setLastTransaction({
        items: [...cart],
        total: cartTotal,
        paymentMethod,
        amountPaid,
        date: new Date(),
        id: transactionId,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });

      toast.success(`Sale completed! Total: $${cartTotal.toFixed(2)}`);

      // Clear cart and show receipt
      setCart([]);
      setShowPaymentDialog(false);
      setShowReceipt(true);
    } catch (error: any) {
      toast.error("Checkout failed: " + error.message);
    }
  };


  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Point of Sale
        </h1>
        <p className="text-muted-foreground mt-1">
          Scan items or search products to add to cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Barcode Scanner & Product Search */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <POSBarcodeInput
                  products={products}
                  onProductSelect={handleProductSelect}
                />
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Cart Items</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {cart.length} item{cart.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.sku} • ${item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={item.cartQuantity}
                          onChange={(e) =>
                            updateCartQuantity(item.id, parseInt(e.target.value) || 0)
                          }
                          className="h-9 w-16 text-center"
                        />
                        <span className="font-bold min-w-[70px] text-right">
                          ${(item.price * item.cartQuantity).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          className="h-9 w-9 text-destructive hover:text-destructive"
                        >
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

        {/* Right Column: Cart Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items in cart</p>
                  <p className="text-sm mt-1">Scan or search to add items</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Items:</span>
                      <span className="font-medium">{cart.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Quantity:</span>
                      <span className="font-medium">
                        {cart.reduce((sum, item) => sum + item.cartQuantity, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-3xl font-bold">${cartTotal.toFixed(2)}</span>
                    </div>

                    <Button
                      onClick={() => setShowPaymentDialog(true)}
                      size="lg"
                      className="w-full h-12 text-lg"
                    >
                      <ReceiptIcon className="mr-2 h-5 w-5" />
                      Proceed to Payment
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {lastTransaction && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono">{lastTransaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold">${lastTransaction.total.toFixed(2)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReceipt(true)}
                    className="w-full mt-2"
                  >
                    <ReceiptIcon className="mr-2 h-4 w-4" />
                    View Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <POSPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={cartTotal}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Receipt Dialog */}
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
