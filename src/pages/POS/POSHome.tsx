const POSHome = () => <div>Main POS Sales Screen</div>; export default POSHome;
import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, DollarSign, RefreshCw, X, Search, CreditCard, Mail, Printer, Zap, Settings, ArrowLeft, TrendingDown, Clock, CornerUpLeft, Loader2 } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, serverTimestamp, setLogLevel } from 'firebase/firestore';

// Global variables provided by the environment
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Utility function (simulates generating a unique ID)
const generateTransactionId = () => 'T' + Math.floor(1000 + Math.random() * 9000);

// Placeholder for Categories (will be derived from fetched products)
const MOCK_CATEGORIES = ['All'];

// --- Component: POSButton ---
const POSButton = ({ icon: Icon, label, onClick, color = 'bg-indigo-600', hover = 'hover:bg-indigo-700', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center p-3 sm:p-4 text-white text-xs font-semibold rounded-lg shadow-md transition duration-150 ${color} ${hover} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} active:scale-[0.98]`}
  >
    <Icon className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
    <span>{label}</span>
  </button>
);

// --- Component: LoadingOverlay ---
const LoadingOverlay = ({ text }) => (
  <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center">
    <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center space-x-3">
      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      <p className="text-gray-700 font-semibold">{text}</p>
    </div>
  </div>
);

// --- Component: PaymentModal ---
const PaymentModal = ({ cart, total, onComplete, onClose }) => {
  const [paymentType, setPaymentType] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(total); // Default to total
  
  const totalAmount = parseFloat(total.toFixed(2));
  const tenderedAmount = parseFloat(amountPaid) || 0;
  const changeDue = (tenderedAmount - totalAmount).toFixed(2);
  const isPayButtonDisabled = paymentType === 'Cash' ? tenderedAmount < totalAmount : false;

  const handlePay = () => {
    onComplete({ paymentType, amount: tenderedAmount, change: changeDue });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transition-transform transform scale-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 flex justify-between items-center">
          Checkout <span className="text-indigo-600">${totalAmount.toFixed(2)}</span>
        </h2>

        {/* Payment Type Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <POSButton
            icon={DollarSign}
            label="Cash"
            onClick={() => setPaymentType('Cash')}
            color={paymentType === 'Cash' ? 'bg-green-600' : 'bg-gray-400'}
            hover={paymentType === 'Cash' ? 'hover:bg-green-700' : 'hover:bg-gray-500'}
          />
          <POSButton
            icon={CreditCard}
            label="Card"
            onClick={() => setPaymentType('Card')}
            color={paymentType === 'Card' ? 'bg-green-600' : 'bg-gray-400'}
            hover={paymentType === 'Card' ? 'hover:bg-green-700' : 'hover:bg-gray-500'}
          />
        </div>

        {/* Cash Tendered Input */}
        {paymentType === 'Cash' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cash Tendered ($)</label>
            <input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={totalAmount.toFixed(2)}
              className="w-full p-3 border border-gray-300 rounded-lg text-2xl font-mono focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between">
              <span className="text-lg font-medium text-gray-700">Change Due:</span>
              <span className={`text-2xl font-bold ${parseFloat(changeDue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${changeDue}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <POSButton
            icon={X}
            label="Cancel"
            onClick={onClose}
            color="bg-red-500"
            hover="hover:bg-red-600"
          />
          <POSButton
            icon={DollarSign}
            label={`Pay - $${totalAmount.toFixed(2)}`}
            onClick={handlePay}
            disabled={isPayButtonDisabled}
            color="bg-indigo-600"
            hover="hover:bg-indigo-700"
          />
        </div>
      </div>
    </div>
  );
};

// --- Component: ReceiptModal ---
const ReceiptModal = ({ transaction, onClose }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handlePrint = () => {
    setMessage("Simulating print...");
    setTimeout(() => {
      setMessage("Receipt sent to printer!");
    }, 1500);
  };

  const handleEmail = () => {
    if (!email || !email.includes('@')) {
      setMessage("Please enter a valid email.");
      return;
    }
    setMessage("Simulating email send...");
    setTimeout(() => {
      setMessage(`Receipt emailed to ${email}!`);
      setEmail('');
    }, 1500);
  };

  const transactionDate = transaction.date?.toDate ? transaction.date.toDate().toLocaleString() : new Date().toLocaleString();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transition-transform transform scale-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Transaction Complete</h2>

        {/* Receipt Display Area */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 font-mono text-sm overflow-y-auto max-h-64">
          <p className="text-center font-bold text-lg mb-2">The Coffee POS</p>
          <p className="text-center text-xs">Transaction ID: {transaction.id}</p>
          <p className="text-center text-xs mb-3">{transactionDate}</p>
          <hr className="border-t border-dashed border-gray-400 mb-2" />
          {transaction.items.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span>{item.qty} x {item.name.substring(0, 20)}...</span>
              <span>${(item.qty * item.price).toFixed(2)}</span>
            </div>
          ))}
          <hr className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between font-bold text-base">
            <span>TOTAL:</span>
            <span>${transaction.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Paid by:</span>
            <span>{transaction.paymentType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Change:</span>
            <span>${transaction.change}</span>
          </div>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Receipt</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
            <POSButton icon={Mail} label="Send" onClick={handleEmail} color="bg-blue-500" hover="hover:bg-blue-600" />
          </div>
        </div>

        <p className={`text-center text-sm mb-4 ${message.includes('valid') || message.includes('emailed') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <POSButton
            icon={Printer}
            label="Print Receipt"
            onClick={handlePrint}
            color="bg-gray-500"
            hover="hover:bg-gray-600"
          />
          <POSButton
            icon={Zap}
            label="New Sale (Done)"
            onClick={onClose}
            color="bg-indigo-600"
            hover="hover:bg-indigo-700"
          />
        </div>
      </div>
    </div>
  );
};

// --- Component: RefundModal ---
const RefundModal = ({ transactions, onProcessRefund, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [returnItems, setReturnItems] = useState({});

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    return transactions.filter(t => 
      t.id.includes(searchTerm.toUpperCase()) || 
      (t.userId || '').includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to 10 results for performance
  }, [searchTerm, transactions]);

  const handleSelectTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    // Initialize return quantities
    const initialReturns = transaction.items.reduce((acc, item) => ({
      ...acc,
      [item.name]: 0
    }), {});
    setReturnItems(initialReturns);
  };

  const handleQtyChange = (itemName, currentQty, originalQty) => {
    const newQty = parseInt(currentQty, 10);
    if (newQty < 0 || newQty > originalQty || isNaN(newQty)) return;
    setReturnItems(prev => ({ ...prev, [itemName]: newQty }));
  };

  const totalRefundAmount = useMemo(() => {
    if (!selectedTransaction) return 0;
    return selectedTransaction.items.reduce((sum, item) => {
      const returnQty = returnItems[item.name] || 0;
      return sum + (returnQty * item.price);
    }, 0);
  }, [selectedTransaction, returnItems]);

  const handleRefund = () => {
    if (totalRefundAmount > 0) {
      onProcessRefund({
        transactionId: selectedTransaction.id,
        items: selectedTransaction.items.map(item => ({
          ...item,
          qty: returnItems[item.name] || 0
        })).filter(item => item.qty > 0),
        amount: totalRefundAmount
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl transition-transform transform scale-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 flex justify-between items-center">
          Process Refund
          <POSButton icon={X} label="Close" onClick={onClose} color="bg-red-500" hover="hover:bg-red-600" />
        </h2>

        {!selectedTransaction ? (
          <>
            {/* Transaction Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Transaction ID (e.g., T9876) or User ID (e.g., d54...) "
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Transaction List */}
            <div className="max-h-80 overflow-y-auto border rounded-lg">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleSelectTransaction(t)}
                    className="flex justify-between items-center p-4 border-b last:border-b-0 cursor-pointer hover:bg-indigo-50 transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">ID: {t.id} - ${t.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">User: {t.userId} | {t.date?.toDate ? t.date.toDate().toLocaleString() : 'N/A'}</p>
                    </div>
                    <CornerUpLeft className="w-5 h-5 text-indigo-500" />
                  </div>
                ))
              ) : (
                <p className="text-center p-4 text-gray-500">No recent transactions found matching "{searchTerm}".</p>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Refunding Transaction: {selectedTransaction.id}</h3>
            
            {/* Item Selection for Refund */}
            <div className="space-y-3 max-h-64 overflow-y-auto mb-6 p-2 border rounded-lg">
              <div className="grid grid-cols-4 font-bold text-sm text-gray-600 border-b pb-1">
                <span className="col-span-2">Item</span>
                <span>Original Qty</span>
                <span>Return Qty</span>
              </div>
              {selectedTransaction.items.map((item, index) => (
                <div key={index} className="grid grid-cols-4 items-center border-b last:border-b-0 py-2">
                  <span className="col-span-2 text-sm">{item.name}</span>
                  <span className="text-sm">{item.qty}</span>
                  <input
                    type="number"
                    value={returnItems[item.name]}
                    min="0"
                    max={item.qty}
                    onChange={(e) => handleQtyChange(item.name, e.target.value, item.qty)}
                    className="w-full p-1 border border-gray-300 rounded-md text-center text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Refund Summary */}
            <div className="p-4 bg-red-50 rounded-lg mb-6 flex justify-between items-center">
              <span className="text-xl font-medium text-red-700">Total Refund Amount:</span>
              <span className="text-3xl font-bold text-red-700">${totalRefundAmount.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <POSButton
                icon={ArrowLeft}
                label="Back to Search"
                onClick={() => setSelectedTransaction(null)}
                color="bg-gray-500"
                hover="hover:bg-gray-600"
              />
              <POSButton
                icon={TrendingDown}
                label={`Process Refund ($${totalRefundAmount.toFixed(2)})`}
                onClick={handleRefund}
                disabled={totalRefundAmount === 0}
                color="bg-red-600"
                hover="hover:bg-red-700"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// --- Main Component: POSHome ---
const POSHome = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState(null);

  // --- 1. FIREBASE INITIALIZATION AND AUTHENTICATION ---
  useEffect(() => {
    try {
      setLogLevel('debug');
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const userAuth = getAuth(app);
      
      setDb(firestore);
      setAuth(userAuth);

      onAuthStateChanged(userAuth, async (user) => {
        if (!user) {
          if (initialAuthToken) {
            await signInWithCustomToken(userAuth, initialAuthToken);
          } else {
            const anonymousUser = await signInAnonymously(userAuth);
            setUserId(anonymousUser.user.uid);
          }
        } else {
          setUserId(user.uid);
        }
      });
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      setError("Failed to initialize the application.");
      setIsLoading(false);
    }
  }, []);

  // --- 2. FIRESTORE DATA LISTENERS (PRODUCTS & TRANSACTIONS) ---
  useEffect(() => {
    if (!db || !userId) return;

    // --- Products Listener ---
    // Public data path: /artifacts/{appId}/public/data/products
    const productsPath = `artifacts/${appId}/public/data/products`;
    const productsCollectionRef = collection(db, productsPath);

    const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));
      setProducts(fetchedProducts);
      setIsLoading(false);
    }, (e) => {
      console.error("Error fetching products:", e);
      setError("Failed to fetch product data.");
      setIsLoading(false);
    });

    // --- Transactions Listener ---
    // Public data path: /artifacts/{appId}/public/data/transactions
    const transactionsPath = `artifacts/${appId}/public/data/transactions`;
    const transactionsCollectionRef = collection(db, transactionsPath);

    const unsubscribeTransactions = onSnapshot(transactionsCollectionRef, (snapshot) => {
      const fetchedTransactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));
      setTransactions(fetchedTransactions);
    }, (e) => {
      console.error("Error fetching transactions:", e);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
    };
  }, [db, userId]);


  // --- Cart Calculations ---
  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]
  );
  const taxRate = 0.08; // 8% sales tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // --- Derived Data: Categories & Filtered Products ---
  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, selectedCategory, products]);


  // --- Cart Handlers (Stock availability check uses real-time product data) ---
  const handleAddToCart = (product) => {
    // Find the latest stock value from the real-time products state
    const currentProductData = products.find(p => p.id === product.id);
    const currentStock = currentProductData?.stock || 0;

    if (currentStock <= 0) {
      console.warn(`Error: ${product.name} is out of stock!`);
      // Use console.warn instead of alert per instructions, though a simple modal would be better.
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.qty + 1 > currentStock) {
             console.warn(`Cannot add more. Only ${currentStock} available.`);
             return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1, stock: currentStock }]; // Store current stock for checks
    });
  };

  const handleUpdateCartQty = (id, newQty) => {
    setCart(prevCart => {
      const itemToUpdate = prevCart.find(item => item.id === id);
      if (!itemToUpdate) return prevCart;

      // Use the stock value stored in the cart item (updated upon add/refresh)
      if (newQty > itemToUpdate.stock) {
        console.warn(`Cannot add more. Only ${itemToUpdate.stock} available.`);
        return prevCart;
      }
      if (newQty <= 0) {
        return prevCart.filter(item => item.id !== id);
      }
      return prevCart.map(item => 
        item.id === id ? { ...item, qty: newQty } : item
      );
    });
  };

  const handleRemoveFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // --- Checkout Handlers ---
  const handleCheckout = () => {
    if (cart.length === 0) {
        console.warn("The cart is empty. Cannot checkout.");
        return;
    }
    if (!db || !userId) {
        console.error("Database connection not ready. Please wait.");
        return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async ({ paymentType, amount, change }) => {
    setShowPaymentModal(false);

    const transactionId = generateTransactionId();

    const newTransactionData = {
      id: transactionId,
      items: cart.map(item => ({
        // Simplify cart items for storage
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
      })),
      total: parseFloat(total.toFixed(2)),
      paymentType: paymentType,
      amountPaid: amount,
      change: change,
      status: 'Completed',
      date: serverTimestamp(), // Use Firestore server timestamp
      userId: userId,
    };
    
    try {
      // 1. Save Transaction to Firestore
      const transactionsPath = `artifacts/${appId}/public/data/transactions`;
      await addDoc(collection(db, transactionsPath), newTransactionData);

      // 2. SIMULATE: Update Stock (This is a simplified place where stock update logic would go)
      // For a real app, you would use updateDoc on each product to decrement stock.
      console.log("SIMULATED: Stock update logic would be executed here.");
      
      setCompletedTransaction({ ...newTransactionData, date: { toDate: () => new Date() }, id: transactionId });
      setShowReceiptModal(true);
    } catch (e) {
      console.error("Error completing transaction:", e);
      setError("Failed to save transaction. Check console for details.");
    }
  };

  const handleReceiptModalClose = () => {
    setCompletedTransaction(null);
    setShowReceiptModal(false);
    handleClearCart(); // Start new sale
  };
  
  // --- Refund Handler ---
  const handleProcessRefund = ({ transactionId, items, amount }) => {
    const refundItemsList = items.map(i => `${i.qty} x ${i.name}`).join(', ');
    
    // In a real app, this would involve creating a new 'Refund' transaction in Firestore
    // and updating the stock of the returned items.
    console.log(`Refund Processed!\nTransaction: ${transactionId}\nItems Returned: ${refundItemsList}\nAmount: $${amount.toFixed(2)}\n(Inventory update and Refund record creation simulated.)`);
  };


  // --- Render Sections ---

  if (isLoading) {
    return <LoadingOverlay text="Connecting to POS database..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 p-8">
        <div className="text-center bg-white p-6 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error Connecting</h1>
            <p className="text-gray-700">{error}</p>
            <p className="text-xs mt-4 text-gray-500">User ID: {userId || 'Authenticating...'}</p>
        </div>
      </div>
    );
  }

  const ProductList = () => (
    <div className="flex-1 flex flex-col p-4 bg-white rounded-xl shadow-lg h-full overflow-hidden">
      <div className="mb-4 flex gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {/* Quick Actions */}
        <POSButton icon={Settings} label="POS Config" onClick={() => console.log("Navigate to /pos/settings")} color="bg-gray-500" hover="hover:bg-gray-600" />
        <POSButton icon={Clock} label="Txn History" onClick={() => console.log("Navigate to /pos/transactions")} color="bg-gray-500" hover="hover:bg-gray-600" />
        <POSButton icon={CornerUpLeft} label="Refund" onClick={() => setShowRefundModal(true)} color="bg-red-500" hover="hover:bg-red-600" />

      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 mb-4 border-b">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition duration-150 ${
              selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            onClick={() => handleAddToCart(product)}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition transform hover:scale-[1.02] active:scale-[0.98] ${
              product.stock > 0 ? 'bg-gray-100 hover:bg-indigo-50' : 'bg-red-100 opacity-60 cursor-not-allowed'
            }`}
          >
            <h3 className="font-semibold text-gray-800 line-clamp-2 min-h-[48px]">{product.name}</h3>
            <p className="text-2xl font-bold text-indigo-600 my-1">${product.price.toFixed(2)}</p>
            <div className={`text-sm font-medium ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-500' : 'text-red-600'}`}>
              Stock: {product.stock > 0 ? `${product.stock} available` : 'OUT OF STOCK'}
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && <p className="col-span-5 text-center text-gray-500 mt-10">No products found in this category.</p>}
      </div>
    </div>
  );

  const CartSummary = () => (
    <div className="w-full lg:w-96 flex flex-col p-4 bg-gray-50 rounded-xl shadow-lg border border-gray-200 h-full overflow-hidden">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <ShoppingCart className="w-6 h-6 mr-2 text-indigo-600" /> Order Cart
      </h2>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {cart.length === 0 ? (
          <div className="text-center p-10 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2" />
            <p>Cart is Empty. Add products to start a sale.</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border">
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-500">@ ${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Quantity Controls */}
                <input
                  type="number"
                  value={item.qty}
                  min="1"
                  max={item.stock}
                  onChange={(e) => handleUpdateCartQty(item.id, parseInt(e.target.value, 10))}
                  className="w-12 p-1 border rounded-md text-center text-sm"
                />
                <span className="font-bold text-gray-800 w-16 text-right">${(item.price * item.qty).toFixed(2)}</span>
                <button 
                  onClick={() => handleRemoveFromCart(item.id)}
                  className="p-1 text-red-500 hover:text-red-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals Summary */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax (8%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-800 font-bold text-2xl pt-2 border-t">
          <span>Total:</span>
          <span className="text-indigo-600">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <POSButton
        icon={DollarSign}
        label={`Checkout ($${total.toFixed(2)})`}
        onClick={handleCheckout}
        disabled={cart.length === 0}
        color="bg-green-600"
        hover="hover:bg-green-700"
        className="w-full mt-4 h-16 text-lg"
      />
      <POSButton
        icon={RefreshCw}
        label="Clear Sale"
        onClick={handleClearCart}
        disabled={cart.length === 0}
        color="bg-red-400"
        hover="hover:bg-red-500"
        className="w-full mt-2 h-10 text-base"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-indigo-700 text-white p-4 shadow-xl flex justify-between items-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Professional Retail POS Terminal</h1>
        <div className="text-xs p-1 bg-indigo-500 rounded-lg">
            User ID: **{userId || 'Loading...'}**
        </div>
      </header>
      
      <main className="flex flex-1 flex-col lg:flex-row p-4 space-y-4 lg:space-y-0 lg:space-x-4 overflow-hidden">
        {ProductList()}
        {CartSummary()}
      </main>

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal 
          cart={cart}
          total={parseFloat(total.toFixed(2))}
          onComplete={handlePaymentComplete}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
      {showReceiptModal && completedTransaction && (
        <ReceiptModal 
          transaction={completedTransaction}
          onClose={handleReceiptModalClose}
        />
      )}
      {showRefundModal && (
        <RefundModal 
          transactions={transactions}
          onProcessRefund={handleProcessRefund}
          onClose={() => setShowRefundModal(false)}
        />
      )}
    </div>
  );
};

export default POSHome;
