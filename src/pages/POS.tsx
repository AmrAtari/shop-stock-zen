import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, ShoppingCart, RotateCcw, CheckCircle, XCircle, MapPin, Plus, Minus, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Item {
  id: string;
  name: string;
  quantity: number;
  sku: string;
  category: string;
  location?: string;
}

interface CartItem extends Item {
  cartQuantity: number;
  price: number;
}

interface Store {
  id: string;
  name: string;
  location: string;
}

interface Transfer {
  id: string;
  transfer_number: string;
  from_store_id: string;
  to_store_id: string;
  status: string;
  total_items: number;
  created_at: string;
  reason?: string;
}

const POS = () => {
  const { isAdmin } = useIsAdmin();
  const [activeTab, setActiveTab] = useState("sale");
  
  // Sale state
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Refund state
  const [refundSKU, setRefundSKU] = useState("");
  const [refundQuantity, setRefundQuantity] = useState(1);
  
  // Store search state
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [storeItems, setStoreItems] = useState<Item[]>([]);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  
  // Manager transfer state
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchStores();
    if (isAdmin) {
      fetchPendingTransfers();
    }
  }, [isAdmin]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("name");
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch items: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from("stores").select("*");
      if (error) throw error;
      setStores(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch stores: " + err.message);
    }
  };

  const fetchPendingTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from("transfers")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPendingTransfers(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch transfers: " + err.message);
    }
  };

  const searchStoreItems = async (storeId: string, query: string) => {
    if (!storeId) return;
    try {
      let queryBuilder = supabase
        .from("items")
        .select("*")
        .eq("location", stores.find(s => s.id === storeId)?.name || "");
      
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
      }
      
      const { data, error } = await queryBuilder;
      if (error) throw error;
      setStoreItems(data || []);
    } catch (err: any) {
      toast.error("Failed to search items: " + err.message);
    }
  };

  const addToCart = (item: Item) => {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
      setCart(cart.map(i => 
        i.id === item.id 
          ? { ...i, cartQuantity: i.cartQuantity + 1 } 
          : i
      ));
    } else {
      // Get price from price_levels table or default
      setCart([...cart, { ...item, cartQuantity: 1, price: 0 }]);
    }
  };

  const updateCartQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.cartQuantity + change;
        return { ...item, cartQuantity: Math.max(0, Math.min(newQty, item.quantity)) };
      }
      return item;
    }).filter(item => item.cartQuantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const item of cart) {
        // Record sale
        const { error: saleError } = await supabase.from("sales").insert({
          item_id: item.id,
          quantity: item.cartQuantity,
          price: item.price,
          user_id: user?.id,
          sku: item.sku,
        });
        if (saleError) throw saleError;

        // Update inventory
        const { error: updateError } = await supabase
          .from("items")
          .update({ quantity: item.quantity - item.cartQuantity })
          .eq("id", item.id);
        if (updateError) throw updateError;
      }

      toast.success("Sale completed successfully!");
      setCart([]);
      fetchItems();
    } catch (err: any) {
      toast.error("Failed to complete sale: " + err.message);
    }
  };

  const processRefund = async () => {
    if (!refundSKU) {
      toast.error("Please enter SKU");
      return;
    }

    try {
      const { data: item, error: itemError } = await supabase
        .from("items")
        .select("*")
        .eq("sku", refundSKU)
        .single();
      
      if (itemError) throw new Error("Item not found");

      // Update inventory
      const { error: updateError } = await supabase
        .from("items")
        .update({ quantity: (item.quantity || 0) + refundQuantity })
        .eq("id", item.id);
      
      if (updateError) throw updateError;

      toast.success("Refund processed successfully!");
      setRefundSKU("");
      setRefundQuantity(1);
      fetchItems();
    } catch (err: any) {
      toast.error("Failed to process refund: " + err.message);
    }
  };

  const handleTransferAction = async (transferId: string, action: "approve" | "reject") => {
    try {
      const { error } = await supabase
        .from("transfers")
        .update({ 
          status: action === "approve" ? "approved" : "rejected",
          approved_at: new Date().toISOString(),
        })
        .eq("id", transferId);
      
      if (error) throw error;
      
      toast.success(`Transfer ${action}d successfully!`);
      fetchPendingTransfers();
      setShowTransferDialog(false);
    } catch (err: any) {
      toast.error(`Failed to ${action} transfer: ` + err.message);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Point of Sale System</h1>
        <p className="text-muted-foreground">Professional retail management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sale">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Sale
          </TabsTrigger>
          <TabsTrigger value="refund">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refund
          </TabsTrigger>
          <TabsTrigger value="stores">
            <MapPin className="w-4 h-4 mr-2" />
            Store Search
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="manager">
              <CheckCircle className="w-4 h-4 mr-2" />
              Manager
            </TabsTrigger>
          )}
        </TabsList>

        {/* Sale Tab */}
        <TabsContent value="sale" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Available Items</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {filteredItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.sku}</p>
                          </div>
                          <Badge variant={item.quantity > 10 ? "default" : "destructive"}>
                            {item.quantity} in stock
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cart */}
            <Card>
              <CardHeader>
                <CardTitle>Cart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateCartQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.cartQuantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateCartQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                  )}
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={completeSale}
                    disabled={cart.length === 0}
                  >
                    Complete Sale
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Refund Tab */}
        <TabsContent value="refund">
          <Card>
            <CardHeader>
              <CardTitle>Process Refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item SKU</label>
                <Input
                  placeholder="Enter SKU..."
                  value={refundSKU}
                  onChange={(e) => setRefundSKU(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={refundQuantity}
                  onChange={(e) => setRefundQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <Button onClick={processRefund} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Process Refund
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Search Tab */}
        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>Search Items at Other Stores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Select Store</label>
                  <Select value={selectedStore} onValueChange={(value) => {
                    setSelectedStore(value);
                    searchStoreItems(value, storeSearchQuery);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose store..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name} - {store.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Search Items</label>
                  <Input
                    placeholder="Search..."
                    value={storeSearchQuery}
                    onChange={(e) => {
                      setStoreSearchQuery(e.target.value);
                      if (selectedStore) {
                        searchStoreItems(selectedStore, e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Select a store to view items
                      </TableCell>
                    </TableRow>
                  ) : (
                    storeItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <Badge variant={item.quantity > 0 ? "default" : "destructive"}>
                            {item.quantity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manager Tab */}
        {isAdmin && (
          <TabsContent value="manager">
            <Card>
              <CardHeader>
                <CardTitle>Pending Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransfers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No pending transfers
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingTransfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell>{transfer.transfer_number}</TableCell>
                          <TableCell>Store {transfer.from_store_id.slice(0, 8)}</TableCell>
                          <TableCell>Store {transfer.to_store_id.slice(0, 8)}</TableCell>
                          <TableCell>{transfer.total_items}</TableCell>
                          <TableCell>{new Date(transfer.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleTransferAction(transfer.id, "approve")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleTransferAction(transfer.id, "reject")}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default POS;
