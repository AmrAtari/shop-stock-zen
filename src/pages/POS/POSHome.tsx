import React, { useState, useMemo, useCallback } from "react";
import { Search, Plus, List, Loader2, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// --- Simplified UI Components ---

const Button = ({ children, onClick, disabled = false, className = "", size = "md" }: any) => {
  const baseStyle = "rounded-lg font-semibold transition-all duration-300 active:scale-[0.98]";
  const sizeClasses = size === "lg" ? "py-4 text-lg" : "py-2 px-3 text-sm";
  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed bg-gray-400"
    : "bg-indigo-600 hover:bg-indigo-700 text-white";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeClasses} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, className = "", type = "text", min = 0, max }: any) => (
  <input
    type={type}
    min={min}
    max={max}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
  />
);

const Card = ({ children, className = "", onClick = undefined }: any) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className} ${onClick ? "cursor-pointer" : ""}`}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }: any) => (
  <div className={`p-4 border-b border-gray-100 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }: any) => (
  <h2 className={`text-xl font-bold text-gray-800 ${className}`}>{children}</h2>
);

const CardContent = ({ children, className = "" }: any) => <div className={`p-4 ${className}`}>{children}</div>;

const Table = ({ children }: any) => (
  <div className="w-full overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">{children}</table>
  </div>
);

const TableHeader = ({ children, className = "" }: any) => (
  <thead className={`bg-gray-50 ${className}`}>{children}</thead>
);

const TableHead = ({ children, className = "" }: any) => (
  <th
    scope="col"
    className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);

const TableBody = ({ children }: any) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;

const TableRow = ({ children, onClick = undefined, className = "" }: any) => (
  <tr
    onClick={onClick}
    className={`hover:bg-indigo-50 transition duration-150 ${onClick ? "cursor-pointer" : ""} ${className}`}
  >
    {children}
  </tr>
);

const TableCell = ({ children, className = "", colSpan = 1 }: any) => (
  <td colSpan={colSpan} className={`px-4 py-2 whitespace-nowrap text-sm text-gray-900 ${className}`}>
    {children}
  </td>
);

const Badge = ({ children, variant = "default", className = "" }: any) => {
  let style = "px-2.5 py-0.5 rounded-full text-xs font-medium";
  if (variant === "default") style += " bg-indigo-100 text-indigo-800";
  if (variant === "secondary") style += " bg-gray-200 text-gray-800";
  if (variant === "destructive") style += " bg-red-100 text-red-800";
  if (variant === "success") style += " bg-green-100 text-green-800";

  return <span className={`${style} ${className}`}>{children}</span>;
};

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

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
  status: "completed" | "pending" | "cancelled";
  items: CartItem[];
}

// --- Main POS Component ---

const POSHome = () => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Fetch products from database using React Query
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async (): Promise<Product[]> => {
      try {
        const { data, error } = await supabase
          .from("items")
          .select("id, name, price, quantity, min_stock, category, sku, size, color")
          .order("name");

        if (error) {
          console.error("Error loading products:", error);
          toast.error("Failed to load products");
          return [];
        }

        // Ensure all products have a price, default to 0 if missing
        return (data || []).map((item) => ({
          ...item,
          price: item.price || 0,
        }));
      } catch (error) {
        console.error("Error in products query:", error);
        return [];
      }
    },
  });

  // Fetch recent transactions from database
  const { data: recentTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["pos-transactions"],
    queryFn: async (): Promise<Transaction[]> => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error loading transactions:", error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error("Error in transactions query:", error);
        return [];
      }
    },
  });

  // --- Derived Data: Categories & Filtered Items ---
  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(uniqueCategories)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.quantity > 0) // Only show in-stock products
      .filter((p) => selectedCategory === "All" || p.category === selectedCategory)
      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm, selectedCategory]);

  // --- Cart Logic ---

  const addToCart = useCallback((product: Product) => {
    const currentStock = product.quantity;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.cartQuantity + 1 > currentStock) {
          toast.error(`Only ${currentStock} of ${product.name} are available.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item,
        );
      }
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to the cart before checking out.");
      return;
    }

    try {
      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          total_amount: cartTotal,
          status: "completed",
          items: cart,
        })
        .select()
        .single();

      if (transactionError) {
        console.error("Transaction error:", transactionError);
        throw transactionError;
      }

      // Update inventory quantities
      const updatePromises = cart.map(async (item) => {
        const currentProduct = products.find((p) => p.id === item.id);
        if (currentProduct) {
          const newQuantity = currentProduct.quantity - item.cartQuantity;

          const { error: updateError } = await supabase
            .from("items")
            .update({ quantity: Math.max(0, newQuantity) })
            .eq("id", item.id);

          if (updateError) {
            console.error(`Error updating inventory for item ${item.id}:`, updateError);
            throw updateError;
          }
        }
      });

      await Promise.all(updatePromises);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-transactions"] });

      toast.success(
        `Transaction Complete! Sale ID: ${transaction.id.substring(0, 8)} | Total: $${cartTotal.toFixed(2)}`,
      );

      setCart([]);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Checkout failed: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= minStock) return { label: "Low Stock", variant: "default" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  // --- Render ---

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:max-h-screen overflow-hidden p-4 space-y-4 lg:space-y-0 lg:space-x-4 bg-gray-50 font-sans">
      {/* Product Search & List (Left Pane) */}
      <Card className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl font-extrabold text-indigo-600 mb-2 sm:mb-0">Products</CardTitle>
            <div className="flex overflow-x-auto space-x-2 pb-1">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search product name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          {isLoadingProducts ? (
            <div className="flex justify-center items-center h-full min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.quantity, product.min_stock);
                return (
                  <Card
                    key={product.id}
                    className={`transition-shadow duration-200 transform hover:scale-[1.02] ${product.quantity === 0 ? "opacity-50" : "hover:shadow-lg hover:shadow-indigo-300/50 cursor-pointer"}`}
                    onClick={() => product.quantity > 0 && addToCart(product)}
                  >
                    <CardContent className="p-3 text-center">
                      <h3 className="font-semibold truncate text-gray-800">{product.name}</h3>
                      <p className="text-xl font-bold text-indigo-600 mt-1 mb-1">${(product.price || 0).toFixed(2)}</p>
                      <Badge variant={status.variant} className="text-[10px]">
                        {status.label}
                      </Badge>
                      {product.size && <p className="text-xs text-gray-600 mt-1">Size: {product.size}</p>}
                      {product.color && <p className="text-xs text-gray-600">Color: {product.color}</p>}
                      <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-12">
                  No in-stock products found matching your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cart and Recent Transactions (Right Column) */}
      <div className="flex flex-col space-y-4 w-full lg:w-96 min-w-[350px]">
        {/* Current Sale Card */}
        <Card className="flex flex-col lg:h-1/2 min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold text-indigo-600">Current Sale</CardTitle>
            <List className="h-6 w-6 text-indigo-400" />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-16 text-center">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      Start a sale by adding products.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm max-w-[120px] truncate">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={item.cartQuantity}
                          onChange={(e: any) => updateCartQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="h-8 w-16 text-center p-1"
                          placeholder="Qty"
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">
                        ${((item.price || 0) * item.cartQuantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          className="h-6 w-6 p-0 bg-transparent text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          <div className="p-4 border-t sticky bottom-0 bg-white">
            <div className="flex justify-between items-center text-2xl font-extrabold mb-3">
              <span className="text-gray-700">Total:</span>
              <span className="text-indigo-600">${cartTotal.toFixed(2)}</span>
            </div>
            <Button
              size="lg"
              className="w-full text-lg py-6 shadow-lg shadow-indigo-500/50"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Process Payment
            </Button>
          </div>
        </Card>

        {/* Recent Transactions Card */}
        <Card className="flex flex-col flex-1">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {isLoadingTransactions ? (
              <div className="flex justify-center items-center h-full min-h-[100px]">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-xs max-w-[80px] truncate">
                        {tx.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right font-semibold">${tx.total_amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {recentTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        No recent sales data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSHome;
