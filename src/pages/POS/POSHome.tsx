import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, List, Loader2, ArrowRight, X } from "lucide-react";

// --- Simplified UI Components (Replaced shadcn/ui imports) ---

const Button = ({ children, onClick, disabled, className = "", size = "md" }) => {
  const baseStyle = "rounded-lg font-semibold transition-all duration-300 active:scale-[0.98]";
  const sizeClasses = size === "lg" ? "py-4 text-lg" : "py-2 text-sm";
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

const Input = ({ placeholder, value, onChange, className = "", type = "text", min = 0 }) => (
  <input
    type={type}
    min={min}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
  />
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`p-4 border-b border-gray-100 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }) => (
  <h2 className={`text-xl font-bold text-gray-800 ${className}`}>{children}</h2>
);

const CardContent = ({ children, className = "" }) => <div className={`p-4 ${className}`}>{children}</div>;

const Table = ({ children }) => (
  <div className="w-full overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">{children}</table>
  </div>
);
const TableHeader = ({ children, className = "" }) => <thead className={`bg-gray-50 ${className}`}>{children}</thead>;
const TableHead = ({ children, className = "" }) => (
  <th
    scope="col"
    className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);
const TableBody = ({ children }) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;
const TableRow = ({ children, onClick, className = "" }) => (
  <tr
    onClick={onClick}
    className={`hover:bg-indigo-50 transition duration-150 ${onClick ? "cursor-pointer" : ""} ${className}`}
  >
    {children}
  </tr>
);
const TableCell = ({ children, className = "", colSpan = 1 }) => (
  <td colSpan={colSpan} className={`px-4 py-2 whitespace-nowrap text-sm text-gray-900 ${className}`}>
    {children}
  </td>
);

const Separator = ({ className = "" }) => <div className={`h-px w-full bg-gray-200 ${className}`} />;

const Badge = ({ children, variant = "default", className = "" }) => {
  let style = "px-2.5 py-0.5 rounded-full text-xs font-medium";
  if (variant === "default") style += " bg-indigo-100 text-indigo-800";
  if (variant === "secondary") style += " bg-gray-200 text-gray-800";
  if (variant === "destructive") style += " bg-red-100 text-red-800";
  if (variant === "success") style += " bg-green-100 text-green-800";

  return <span className={`${style} ${className}`}>{children}</span>;
};

// --- Mock Supabase Data Layer ---
// In a real app, this data would come from Supabase via API calls.
const MOCK_PRODUCTS: Product[] = [
  { id: "prod_1", name: "Premium Coffee Beans (1lb)", price: 15.99, stock: 45, category: "Coffee" },
  { id: "prod_2", name: "Espresso Maker (Manual)", price: 89.99, stock: 12, category: "Equipment" },
  { id: "prod_3", name: "Matcha Latte Powder (500g)", price: 29.5, stock: 20, category: "Beverages" },
  { id: "prod_4", name: "Croissant (Butter)", price: 3.5, stock: 100, category: "Pastries" },
  { id: "prod_5", name: "Cold Brew Concentrate (32oz)", price: 12.0, stock: 30, category: "Beverages" },
  { id: "prod_6", name: "Ceramic Mug (Logo)", price: 18.75, stock: 55, category: "Merchandise" },
  { id: "prod_7", name: "Chocolate Chip Cookie", price: 2.75, stock: 60, category: "Pastries" },
  { id: "prod_8", name: "Pour Over Kettle", price: 55.0, stock: 8, category: "Equipment" },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "txn_a1b2c3d4",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    total_amount: 22.99,
    status: "completed",
    items: [
      { id: "prod_1", name: "Coffee Beans", price: 15.99, stock: 45, quantity: 1 },
      { id: "prod_7", name: "Cookie", price: 2.75, stock: 60, quantity: 2 },
    ],
  },
  {
    id: "txn_e5f6g7h8",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    total_amount: 89.99,
    status: "completed",
    items: [{ id: "prod_2", name: "Espresso Maker", price: 89.99, stock: 12, quantity: 1 }],
  },
  {
    id: "txn_i9j0k1l2",
    created_at: new Date(Date.now() - 10800000).toISOString(),
    total_amount: 45.0,
    status: "completed",
    items: [
      { id: "prod_5", name: "Cold Brew", price: 12.0, stock: 30, quantity: 3 },
      { id: "prod_4", name: "Croissant", price: 3.5, stock: 100, quantity: 3 },
    ],
  },
];

let globalProducts = [...MOCK_PRODUCTS];
let globalTransactions = [...MOCK_TRANSACTIONS];

const mockSupabase = {
  // Mock function to simulate data fetching (products)
  fetchProducts: (): Promise<Product[]> =>
    new Promise((resolve) => {
      setTimeout(() => resolve(globalProducts.filter((p) => p.stock > 0)), 500);
    }),

  // Mock function to simulate data fetching (transactions)
  fetchTransactions: (): Promise<Transaction[]> =>
    new Promise((resolve) => {
      setTimeout(() => {
        const sorted = [...globalTransactions].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        resolve(sorted.slice(0, 10));
      }, 500);
    }),

  // Mock function to simulate a new transaction and stock update
  insertTransaction: (newTransaction: Partial<Transaction>): Promise<Transaction> =>
    new Promise((resolve) => {
      setTimeout(() => {
        // 1. Create transaction
        const txn: Transaction = {
          ...newTransaction,
          id: "txn_" + Math.random().toString(36).substring(2, 10),
          created_at: new Date().toISOString(),
          status: "completed",
          items: newTransaction.items || [],
        } as Transaction;

        globalTransactions.unshift(txn);

        // 2. Update global stock for mock
        txn.items.forEach((item) => {
          const productIndex = globalProducts.findIndex((p) => p.id === item.id);
          if (productIndex !== -1) {
            globalProducts[productIndex].stock -= item.quantity;
          }
        });

        resolve(txn);
      }, 700);
    }),
};

// --- Toast Mock (Replaced use-toast) ---
// Since we don't have a component to display toasts, we'll use console.log
const toast = ({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}) => {
  const emoji = variant === "destructive" ? "❌" : "✅";
  console.log(`${emoji} TOAST (${variant.toUpperCase()}): ${title} - ${description}`);
  // In a real app, this would show a notification overlay
};

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
  status: "completed" | "pending" | "cancelled";
  items: CartItem[]; // Stored as JSON
}

// --- Main POS Component ---

const POS = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- Initial Data Fetch (Replaces React Query) ---
  useEffect(() => {
    // Fetch Products
    setIsLoadingProducts(true);
    mockSupabase
      .fetchProducts()
      .then((data) => {
        setProducts(data);
        setIsLoadingProducts(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoadingProducts(false);
      });

    // Fetch Transactions
    setIsLoadingTransactions(true);
    mockSupabase
      .fetchTransactions()
      .then((data) => {
        setRecentTransactions(data);
        setIsLoadingTransactions(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoadingTransactions(false);
      });

    // Set up a simple interval to mock real-time updates for transactions
    const intervalId = setInterval(() => {
      mockSupabase.fetchTransactions().then(setRecentTransactions);
    }, 5000);

    return () => clearInterval(intervalId); // Cleanup interval
  }, []);

  // --- Derived Data: Categories & Filtered Items ---
  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(uniqueCategories)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.stock > 0) // Only show in-stock products
      .filter((p) => selectedCategory === "All" || p.category === selectedCategory)
      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm, selectedCategory]);

  // --- Cart Logic ---

  const addToCart = useCallback(
    (product: Product) => {
      const currentStock = products.find((p) => p.id === product.id)?.stock || 0;

      setCart((prevCart) => {
        const existingItem = prevCart.find((item) => item.id === product.id);

        if (existingItem) {
          if (existingItem.quantity + 1 > currentStock) {
            toast({
              title: "Stock Limit",
              description: `Only ${currentStock} of ${product.name} are available.`,
              variant: "destructive",
            });
            return prevCart;
          }
          return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        }
        return [...prevCart, { ...product, quantity: 1 }];
      });
    },
    [products],
  );

  const updateCartQuantity = (id: string, newQuantity: number) => {
    setCart((prevCart) => {
      const itemToUpdate = prevCart.find((item) => item.id === id);
      if (!itemToUpdate) return prevCart;

      const currentStock = products.find((p) => p.id === id)?.stock || 0;

      if (newQuantity > currentStock) {
        toast({
          title: "Stock Limit",
          description: `Only ${currentStock} of ${itemToUpdate.name} are available.`,
          variant: "destructive",
        });
        return prevCart;
      }

      if (newQuantity <= 0) {
        return prevCart.filter((item) => item.id !== id);
      } else {
        return prevCart.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item));
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  // --- Checkout Logic ---

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to the cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    const newTransaction: Partial<Transaction> = {
      total_amount: cartTotal,
      status: "completed",
      items: cart,
    };

    try {
      // Simulate inserting transaction and updating stock
      const resultTxn = await mockSupabase.insertTransaction(newTransaction);

      // Update local product state to reflect stock changes
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const purchasedItem = cart.find((item) => item.id === p.id);
          if (purchasedItem) {
            return { ...p, stock: p.stock - purchasedItem.quantity };
          }
          return p;
        }),
      );

      // Update local transactions list immediately
      setRecentTransactions((prevTxns) => {
        const updatedList = [resultTxn, ...prevTxns].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        return updatedList.slice(0, 10);
      });

      toast({
        title: "Transaction Complete!",
        description: `Sale ID: ${resultTxn.id.substring(4)} | Total: $${cartTotal.toFixed(2)}`,
        variant: "success",
      });

      setCart([]);
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: "Could not complete the transaction. See console for details.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: Transaction["status"]) => {
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

  // --- Render ---

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:max-h-screen overflow-hidden p-4 space-y-4 lg:space-y-0 lg:space-x-4 bg-gray-50">
      {/* Product Search & List (Left Pane) */}
      <Card className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl font-extrabold text-indigo-600 mb-2 sm:mb-0">Products</CardTitle>
            <div className="flex overflow-x-auto space-x-2">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          {isLoadingProducts ? (
            <div className="flex justify-center items-center h-full min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-shadow duration-200 transform hover:scale-[1.02] ${product.stock === 0 ? "opacity-50" : "hover:shadow-indigo-300/50"}`}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3 text-center">
                    <h3 className="font-semibold truncate text-gray-800">{product.name}</h3>
                    <p className="text-xl font-bold text-indigo-600 mt-1 mb-1">${product.price.toFixed(2)}</p>
                    <Badge
                      variant={product.stock > 10 ? "success" : product.stock > 0 ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {product.stock > 0 ? `In Stock: ${product.stock}` : "Out of Stock"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
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
        <Card className="flex flex-col h-1/2 min-h-[400px]">
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
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="h-8 w-16 text-center p-1"
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">
                        ${(item.price * item.quantity).toFixed(2)}
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
                      <TableCell className="font-medium text-xs max-w-[80px] truncate">{tx.id.substring(4)}</TableCell>
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

export default POS;
