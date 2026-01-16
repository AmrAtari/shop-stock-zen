// src/pos/POSHome.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { ShoppingCart, Loader2, X, Receipt as ReceiptIcon, PauseCircle, Play, Keyboard, Clock, Package, Users, Star, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POSBarcodeInput } from "@/components/POSBarcodeInput";
import { POSPaymentDialog } from "@/components/POSPaymentDialog";
import { POSReceipt } from "@/components/POSReceipt";
import { POSHoldsSidebar } from "@/components/POSHoldsSidebar";
import { POSCustomerSelector } from "@/components/POS/POSCustomerSelector";
import { POSLoyaltyPanel, calculatePointsEarned, calculateRedemptionValue } from "@/components/POS/POSLoyaltyPanel";
import { POSProductGrid } from "@/components/POS/POSProductGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePOS, CartItem } from "./POSContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
  category?: string;
};

type StoreOption = {
  id: string;
  name: string;
  location: string | null;
};

const POSHome = () => {
  const queryClient = useQueryClient();
  const { 
    sessionId, 
    cashierId, 
    storeId, 
    openSession, 
    isSessionOpen, 
    saveHold, 
    resumeHold, 
    removeHold, 
    holds,
    selectedCustomer,
    setSelectedCustomer,
    loyaltySettings,
  } = usePOS();
  const { formatCurrency } = useSystemSettings();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [globalDiscountType, setGlobalDiscountType] = useState<"fixed" | "percent">("fixed");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);
  const [showHoldsSidebar, setShowHoldsSidebar] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [productViewMode, setProductViewMode] = useState<"scanner" | "grid">("scanner");
  
  // Session dialog state
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionCashierInput, setSessionCashierInput] = useState("");
  const [sessionStartCash, setSessionStartCash] = useState("0");
  const [sessionSelectedStoreId, setSessionSelectedStoreId] = useState("");
  const [sessionStores, setSessionStores] = useState<StoreOption[]>([]);
  const [loadingSessionStores, setLoadingSessionStores] = useState(false);

  // Fetch products with store-specific inventory
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products", storeId],
    queryFn: async (): Promise<Product[]> => {
      if (storeId) {
        // Fetch from store_inventory for store-specific stock
        const { data, error } = await supabase
          .from("store_inventory")
          .select(`
            quantity,
            item:items!inner(
              id,
              name,
              sku,
              price,
              category:categories(name)
            )
          `)
          .eq("store_id", storeId)
          .gt("quantity", 0);
          
        if (error) throw error;
        
        return (data || []).map((si: any) => ({
          id: si.item.id,
          name: si.item.name,
          sku: si.item.sku,
          price: si.item.price || 0,
          quantity: si.quantity,
          category: si.item.category?.name || "Uncategorized",
        }));
      } else {
        // Fallback to all items if no store selected
        const { data, error } = await supabase
          .from("items")
          .select("id, name, quantity, sku, price, category:categories(name)")
          .order("name");
        if (error) throw error;
        return (data || []).map((i: any) => ({ 
          ...i, 
          price: i.price || 0,
          category: i.category?.name || "Uncategorized",
        }));
      }
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
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const id = `H-${Date.now()}`;
    saveHold(id, cart);
    setCart([]);
    toast.success("Transaction held");
  };

  const resumeHoldById = (id: string) => {
    const held = resumeHold(id);
    if (held) {
      setCart(held);
      removeHold(id);
      setShowHoldsSidebar(false);
      toast.success("Transaction resumed");
    } else {
      toast.error("Hold not found");
    }
  };

  const deleteHoldById = (id: string) => {
    removeHold(id);
    toast.success("Hold deleted");
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

  // Loyalty points calculations
  const loyaltyRedemptionValue = useMemo(() => 
    calculateRedemptionValue(pointsToRedeem, loyaltySettings.pointValueInCents),
    [pointsToRedeem, loyaltySettings.pointValueInCents]
  );

  const totalBeforeLoyalty = useMemo(
    () => Math.max(0, subtotal - itemDiscountTotal - globalDiscountAmount),
    [subtotal, itemDiscountTotal, globalDiscountAmount],
  );

  const total = useMemo(
    () => Math.max(0, totalBeforeLoyalty - loyaltyRedemptionValue),
    [totalBeforeLoyalty, loyaltyRedemptionValue],
  );

  const pointsToEarn = useMemo(() => 
    selectedCustomer ? calculatePointsEarned(total, loyaltySettings.pointsPerDollar) : 0,
    [selectedCustomer, total, loyaltySettings.pointsPerDollar]
  );

  // Checkout flow: create transaction, write sales rows, update stock, attach sessionId & cashierId
  const handlePaymentComplete = async (payments: Array<{ method: "cash" | "card"; amount: number }>, changeDue: number) => {
    if (!cart.length) return toast.error("Cart empty");
    if (!sessionId || !cashierId) {
      toast.error("Open a cashier session first");
      return;
    }

    const transactionId = `TXN-${Date.now()}`;
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
          customer_id: selectedCustomer?.id || null,
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
          customer_id: selectedCustomer?.id || null,
        })),
      );

      if (saleError) throw saleError;

      // Update store_inventory - decrement quantities for the active store
      if (storeId) {
        for (const item of cart) {
          const { data: existingStock, error: fetchErr } = await supabase
            .from("store_inventory")
            .select("quantity")
            .eq("item_id", item.id)
            .eq("store_id", storeId)
            .maybeSingle();

          if (fetchErr) {
            console.error("Error fetching store inventory:", fetchErr);
            continue;
          }

          const prevQty = existingStock?.quantity || 0;
          const newQty = prevQty - item.cartQuantity;

          if (existingStock) {
            const { error: updateErr } = await supabase
              .from("store_inventory")
              .update({ quantity: newQty })
              .eq("item_id", item.id)
              .eq("store_id", storeId);

            if (updateErr) {
              console.error("Error updating store inventory:", updateErr);
            }
          }
        }
      }

      // Update customer loyalty points
      if (selectedCustomer) {
        const netPointsChange = pointsToEarn - pointsToRedeem;
        const newLoyaltyPoints = Math.max(0, (selectedCustomer.loyalty_points || 0) + netPointsChange);
        
        const { error: loyaltyError } = await supabase
          .from("customers")
          .update({ loyalty_points: newLoyaltyPoints })
          .eq("id", selectedCustomer.id);
          
        if (loyaltyError) {
          console.error("Error updating loyalty points:", loyaltyError);
        } else {
          toast.success(`Customer earned ${pointsToEarn} points${pointsToRedeem > 0 ? `, redeemed ${pointsToRedeem} points` : ""}`);
        }
      }

      // show receipt
      setLastTransaction({
        transactionId,
        items: cart,
        total,
        paymentMethod: primaryPayment.method,
        amountPaid: totalPaid,
        date: new Date(),
        customer: selectedCustomer,
        pointsEarned: pointsToEarn,
        pointsRedeemed: pointsToRedeem,
      });

      setCart([]);
      setPointsToRedeem(0);
      setSelectedCustomer(null);
      toast.success("Sale completed");
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-customers"] });
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

  // Fetch stores when session dialog opens
  useEffect(() => {
    if (showSessionDialog) {
      setLoadingSessionStores(true);
      supabase
        .from("stores")
        .select("id, name, location")
        .order("name")
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to load stores:", error);
            toast.error("Failed to load stores");
            setSessionStores([]);
          } else {
            setSessionStores(data || []);
          }
          setLoadingSessionStores(false);
        });
    }
  }, [showSessionDialog]);

  // Session dialog submit handler
  const handleSessionDialogSubmit = async () => {
    if (!sessionCashierInput.trim()) {
      return toast.error("Please enter your Cashier ID or name.");
    }
    if (!sessionSelectedStoreId) {
      return toast.error("Please select a store.");
    }
    const startCash = parseFloat(sessionStartCash || "0");
    if (isNaN(startCash) || startCash < 0) {
      return toast.error("Starting cash must be a valid non-negative number.");
    }
    
    try {
      await openSession(sessionCashierInput.trim(), startCash, sessionSelectedStoreId);
      setShowSessionDialog(false);
      setSessionCashierInput("");
      setSessionStartCash("0");
      setSessionSelectedStoreId("");
    } catch (error) {
      // Error is already handled in POSContext
    }
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
                <Button onClick={() => setShowSessionDialog(true)} size="lg" className="font-semibold">
                  Open Session
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-lg border border-green-500/20">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Session Active</span>
                </div>
              )}
              <Button 
                onClick={() => setShowHoldsSidebar(true)} 
                variant="outline" 
                size="lg"
                className="relative"
              >
                <Clock className="h-4 w-4 mr-2" />
                Holds
                {Object.keys(holds).length > 0 && (
                  <Badge className="ml-2 px-2 py-0 h-5 bg-primary">
                    {Object.keys(holds).length}
                  </Badge>
                )}
              </Button>
              <Button onClick={() => window.location.assign("/pos/transfers")} variant="outline" size="lg">
                <Package className="h-4 w-4 mr-2" />
                Transfers
              </Button>
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
            {/* Customer Selection */}
            <Card className="border-2">
              <CardHeader className="bg-muted/50 border-b py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <POSCustomerSelector
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                />
              </CardContent>
            </Card>

            {/* Product Selection Tabs */}
            <Card className="border-2">
              <CardHeader className="bg-muted/50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Products</CardTitle>
                  <Tabs value={productViewMode} onValueChange={(v) => setProductViewMode(v as any)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="scanner" className="text-xs">Scanner</TabsTrigger>
                      <TabsTrigger value="grid" className="text-xs">Browse</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingProducts ? (
                  <div className="py-12 text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading products...</p>
                  </div>
                ) : productViewMode === "scanner" ? (
                  <POSBarcodeInput products={products} onProductSelect={(p) => handleProductSelect(p)} />
                ) : (
                  <POSProductGrid 
                    products={products} 
                    onProductSelect={(p) => handleProductSelect(p)} 
                  />
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
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {cart.map((it) => (
                      <div key={it.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{it.name}</h4>
                          <p className="text-sm text-muted-foreground">SKU: {it.sku}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(it.price)} × {it.cartQuantity}</p>
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
                              {formatCurrency(it.price * it.cartQuantity)}
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
            {/* Loyalty Panel */}
            {selectedCustomer && (
              <POSLoyaltyPanel
                customer={selectedCustomer}
                transactionTotal={totalBeforeLoyalty}
                pointsToEarn={pointsToEarn}
                pointsToRedeem={pointsToRedeem}
                onRedeemPointsChange={setPointsToRedeem}
                loyaltySettings={loyaltySettings}
              />
            )}

            {/* Order Summary */}
            <Card className="border-2">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
                  </div>

                  {(itemDiscountTotal > 0 || globalDiscountAmount > 0) && (
                    <>
                      {itemDiscountTotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Item Discounts</span>
                          <span className="font-semibold text-green-600">-{formatCurrency(itemDiscountTotal)}</span>
                        </div>
                      )}
                      {globalDiscountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Global Discount</span>
                          <span className="font-semibold text-green-600">-{formatCurrency(globalDiscountAmount)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {loyaltyRedemptionValue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        Loyalty Points ({pointsToRedeem} pts)
                      </span>
                      <span className="font-semibold text-green-600">-{formatCurrency(loyaltyRedemptionValue)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
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
              <Card className="border-2 border-green-500/20 bg-green-500/5">
                <CardHeader className="bg-green-500/10 border-b border-green-500/20">
                  <CardTitle className="text-base text-green-600 flex items-center gap-2">
                    <ReceiptIcon className="h-4 w-4" />
                    Last Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-xs text-muted-foreground">Transaction ID</div>
                  <div className="font-mono text-sm font-semibold">{lastTransaction?.transactionId}</div>
                  {lastTransaction?.customer && (
                    <>
                      <div className="text-xs text-muted-foreground mt-2">Customer</div>
                      <div className="text-sm font-medium">{lastTransaction.customer.name}</div>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">Total Amount</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(lastTransaction?.total || 0)}</div>
                  {lastTransaction?.pointsEarned > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      <Star className="h-3 w-3 mr-1 text-yellow-500" />
                      +{lastTransaction.pointsEarned} points earned
                    </Badge>
                  )}
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

      <POSHoldsSidebar
        holds={holds}
        onResumeHold={resumeHoldById}
        onDeleteHold={deleteHoldById}
        isOpen={showHoldsSidebar}
        onClose={() => setShowHoldsSidebar(false)}
      />

      {/* Open Session Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start New POS Session</DialogTitle>
            <DialogDescription>
              Select your store and enter your details to begin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Store Selection - First and Required */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sessionStore" className="text-right font-medium">
                Store <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={sessionSelectedStoreId} 
                onValueChange={setSessionSelectedStoreId} 
                disabled={loadingSessionStores}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={loadingSessionStores ? "Loading stores..." : "Select your store"} />
                </SelectTrigger>
                <SelectContent>
                  {sessionStores.length === 0 && !loadingSessionStores ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No stores available
                    </div>
                  ) : (
                    sessionStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span>{store.name}</span>
                          {store.location && (
                            <span className="text-muted-foreground text-xs">
                              ({store.location})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Cashier ID */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sessionCashier" className="text-right font-medium">
                Cashier ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sessionCashier"
                value={sessionCashierInput}
                onChange={(e) => setSessionCashierInput(e.target.value)}
                className="col-span-3"
                placeholder="Enter your name or ID"
              />
            </div>

            {/* Starting Cash */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sessionCash" className="text-right font-medium">
                Start Cash
              </Label>
              <Input
                id="sessionCash"
                type="number"
                value={sessionStartCash}
                onChange={(e) => setSessionStartCash(e.target.value)}
                className="col-span-3"
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSessionDialogSubmit} 
              disabled={loadingSessionStores || !sessionSelectedStoreId}
              className="w-full sm:w-auto"
            >
              Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSHome;
