import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { POItemSelector } from "@/components/POItemSelector";
import { POItemImport } from "@/components/POItemImport";
import { POBarcodeScanner } from "@/components/POBarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, useStores } from "@/hooks/usePurchaseOrders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Trash2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Item, Supplier } from "@/types/database";

const poSchema = z.object({
  supplier: z.string().min(1, "Supplier is required"),
  store: z.string().optional(),
  orderDate: z.date(),
  expectedDelivery: z.date().optional(),
  buyerCompanyName: z.string().optional(),
  buyerAddress: z.string().optional(),
  buyerContact: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  paymentTerms: z.string().default("Net 30"),
  currency: z.enum(["USD", "AED"]).default("USD"),
  shippingMethod: z.string().optional(),
  fobTerms: z.string().optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  shippingCharges: z.number().min(0).default(0),
  specialInstructions: z.string().optional(),
});

type POFormData = z.infer<typeof poSchema>;

interface POItem {
  sku: string;
  itemName: string;
  itemDescription?: string;
  color?: string;
  size?: string;
  modelNumber?: string;
  unit: string;
  quantity: number;
  costPrice: number;
}

const PurchaseOrderNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useSuppliers();
  const { data: stores = [] } = useStores();
  const { data: inventory = [] } = useQuery<Item[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const [step, setStep] = useState(1);
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [sameBillingAddress, setSameBillingAddress] = useState(false);
  const [sameShippingAddress, setSameShippingAddress] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      orderDate: new Date(),
      paymentTerms: "Net 30",
      currency: "USD",
      taxPercent: 0,
      shippingCharges: 0,
    },
  });

  const watchSupplier = watch("supplier");
  const watchBuyerAddress = watch("buyerAddress");
  const watchCurrency = watch("currency");
  const watchTaxPercent = watch("taxPercent");
  const watchShippingCharges = watch("shippingCharges");

  useEffect(() => {
    if (watchSupplier) {
      const supplier = suppliers.find((s) => s.id === watchSupplier);
      setSelectedSupplier(supplier || null);
    }
  }, [watchSupplier, suppliers]);

  useEffect(() => {
    if (sameBillingAddress && watchBuyerAddress) {
      setValue("billingAddress", watchBuyerAddress);
    }
  }, [sameBillingAddress, watchBuyerAddress, setValue]);

  useEffect(() => {
    if (sameShippingAddress && watchBuyerAddress) {
      setValue("shippingAddress", watchBuyerAddress);
    }
  }, [sameShippingAddress, watchBuyerAddress, setValue]);

  // NEW: Function to update inventory when PO is completed
  const updateInventoryFromPO = async (poId: string, items: POItem[]) => {
    try {
      // Update inventory for each item in the PO
      for (const item of items) {
        // First, get current quantity
        const { data: currentItem, error: fetchError } = await supabase
          .from("items")
          .select("quantity")
          .eq("sku", item.sku)
          .single();

        if (fetchError) {
          console.error("Failed to fetch current item:", fetchError);
          throw new Error(`Failed to fetch item ${item.sku}`);
        }

        // Update inventory quantity
        const { error: updateError } = await supabase
          .from("items")
          .update({
            quantity: (currentItem.quantity || 0) + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("sku", item.sku);

        if (updateError) {
          console.error("Failed to update inventory for item:", item.sku, updateError);
          throw new Error(`Failed to update inventory for ${item.sku}`);
        }

        // Create inventory transaction record
        const { error: transactionError } = await supabase.from("inventory_transactions").insert({
          sku: item.sku,
          quantity_change: item.quantity,
          reason: "purchase_order_received",
          reference_id: poId,
          created_at: new Date().toISOString(),
        });

        if (transactionError) {
          console.error("Failed to create transaction record:", transactionError);
          // Don't throw here as the main update succeeded
        }
      }

      toast.success(`Inventory updated for ${items.length} items`);
    } catch (error: any) {
      console.error("Inventory update error:", error);
      throw error;
    }
  };

  const handleAddItemsFromSelector = (items: Array<{ item: Item; quantity: number; price: number }>) => {
    const newItems: POItem[] = items.map(({ item, quantity, price }) => ({
      sku: item.sku,
      itemName: item.name,
      itemDescription: item.description || undefined,
      color: item.color || undefined,
      size: item.size || undefined,
      modelNumber: item.item_number || undefined,
      unit: item.unit,
      quantity,
      costPrice: price,
    }));
    setPOItems([...poItems, ...newItems]);
    toast.success(`Added ${newItems.length} items`);
  };

  const handleImportItems = (items: any[]) => {
    const newItems: POItem[] = items.map((item) => ({
      sku: item.sku,
      itemName: item.itemName || item.sku,
      itemDescription: item.description,
      color: item.color,
      size: item.size,
      modelNumber: item.modelNumber,
      unit: item.unit || "pcs",
      quantity: item.quantity,
      costPrice: item.costPrice,
    }));
    setPOItems([...poItems, ...newItems]);
  };

  const handleBarcodeScans = (scannedItems: any[]) => {
    const newItems: POItem[] = scannedItems.map((item) => ({
      sku: item.sku,
      itemName: item.name || item.sku,
      unit: "pcs",
      quantity: item.quantity,
      costPrice: item.price,
    }));
    setPOItems([...poItems, ...newItems]);
  };

  const lookupSkuForBarcode = async (sku: string) => {
    const item = inventory.find((i) => i.sku === sku);
    if (item) {
      return { name: item.name, price: 0 };
    }
    return null;
  };

  const handleRemoveItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    setPOItems(updated);
  };

  const subtotal = poItems.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const taxAmount = subtotal * (watchTaxPercent / 100);
  const grandTotal = subtotal + taxAmount + (watchShippingCharges || 0);

  const onSubmit = async (data: POFormData) => {
    if (poItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setIsSaving(true);

    try {
      const supplierData = suppliers.find((s) => s.id === data.supplier);
      if (!supplierData) throw new Error("Supplier not found");

      // Generate PO number using database function
      const { data: poNumber, error: poNumberError } = await supabase.rpc("generate_po_number", {
        supplier_name: supplierData.name,
      });

      if (poNumberError) throw poNumberError;

      // Get current user for authorized_by
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create purchase order
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: poNumber,
          supplier: supplierData.name,
          store_id: data.store || null,
          order_date: data.orderDate.toISOString(),
          expected_delivery: data.expectedDelivery?.toISOString(),
          buyer_company_name: data.buyerCompanyName,
          buyer_address: data.buyerAddress,
          buyer_contact: data.buyerContact,
          billing_address: data.billingAddress,
          shipping_address: data.shippingAddress,
          supplier_contact_person: selectedSupplier?.contact_person,
          payment_terms: data.paymentTerms,
          currency: data.currency,
          shipping_method: data.shippingMethod,
          fob_terms: data.fobTerms,
          special_instructions: data.specialInstructions,
          subtotal,
          tax_amount: taxAmount,
          tax_rate: data.taxPercent,
          shipping_charges: data.shippingCharges,
          total_cost: grandTotal,
          total_items: poItems.reduce((sum, item) => sum + item.quantity, 0),
          status: "completed", // NEW: Set as completed to trigger inventory update
          authorized_by: user?.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create PO items
      const poItemsData = poItems.map((item) => ({
        po_id: poData.id,
        sku: item.sku,
        item_name: item.itemName,
        item_description: item.itemDescription,
        color: item.color,
        size: item.size,
        model_number: item.modelNumber,
        unit: item.unit,
        quantity: item.quantity,
        cost_price: item.costPrice,
      }));

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(poItemsData);

      if (itemsError) throw itemsError;

      // NEW: Update inventory quantities
      await updateInventoryFromPO(poData.id, poItems);

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });

      toast.success(`Purchase Order ${poNumber} created successfully and inventory updated`);
      navigate("/purchase-orders");
    } catch (error: any) {
      console.error("PO creation error:", error);
      toast.error(error.message || "Failed to create purchase order");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Purchase Order</h1>
          <p className="text-muted-foreground mt-1">Create a new purchase order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Info & Dates */}
        <Card>
          <CardHeader>
            <CardTitle>1. Identification & Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input value="Auto-generated on save" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">Store (Optional)</Label>
                <Select value={watch("store")} onValueChange={(value) => setValue("store", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch("orderDate") ? format(watch("orderDate"), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watch("orderDate")}
                      onSelect={(date) => date && setValue("orderDate", date)}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch("expectedDelivery") ? format(watch("expectedDelivery"), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watch("expectedDelivery")}
                      onSelect={(date) => setValue("expectedDelivery", date)}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Buyer & Supplier Details */}
        <Card>
          <CardHeader>
            <CardTitle>2. Buyer & Supplier Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Buyer Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="buyerCompanyName">Company Name</Label>
                  <Input {...register("buyerCompanyName")} placeholder="Your company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerAddress">Address</Label>
                  <Textarea {...register("buyerAddress")} placeholder="Company address" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerContact">Contact</Label>
                  <Input {...register("buyerContact")} placeholder="Phone / Email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingAddress">Billing Address</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={sameBillingAddress}
                      onCheckedChange={(checked) => setSameBillingAddress(checked as boolean)}
                    />
                    <span className="text-sm">Same as buyer address</span>
                  </div>
                  <Textarea
                    {...register("billingAddress")}
                    placeholder="Billing address"
                    rows={3}
                    disabled={sameBillingAddress}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingAddress">Shipping Address</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={sameShippingAddress}
                      onCheckedChange={(checked) => setSameShippingAddress(checked as boolean)}
                    />
                    <span className="text-sm">Same as buyer address</span>
                  </div>
                  <Textarea
                    {...register("shippingAddress")}
                    placeholder="Shipping address"
                    rows={3}
                    disabled={sameShippingAddress}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Supplier Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={watchSupplier} onValueChange={(value) => setValue("supplier", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supplier && <p className="text-sm text-destructive">{errors.supplier.message}</p>}
                </div>
                {selectedSupplier && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm">
                      <strong>Address:</strong> {selectedSupplier.address || "N/A"}
                    </p>
                    <p className="text-sm">
                      <strong>Contact Person:</strong> {selectedSupplier.contact_person || "N/A"}
                    </p>
                    <p className="text-sm">
                      <strong>Phone:</strong> {selectedSupplier.phone || "N/A"}
                    </p>
                    <p className="text-sm">
                      <strong>Email:</strong> {selectedSupplier.email || "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Items */}
        <Card>
          <CardHeader>
            <CardTitle>3. Add Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                <TabsTrigger value="import">Excel Import</TabsTrigger>
                <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
              </TabsList>
              <TabsContent value="manual">
                <POItemSelector items={inventory} onSelect={handleAddItemsFromSelector} />
              </TabsContent>
              <TabsContent value="import">
                <POItemImport onImport={handleImportItems} existingSkus={inventory.map((i) => i.sku)} />
              </TabsContent>
              <TabsContent value="barcode">
                <POBarcodeScanner onScan={handleBarcodeScans} onLookupSku={lookupSkuForBarcode} />
              </TabsContent>
            </Tabs>

            {poItems.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Order Items ({poItems.length})</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>
                            <Input
                              value={item.color || ""}
                              onChange={(e) => handleItemChange(index, "color", e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.size || ""}
                              onChange={(e) => handleItemChange(index, "size", e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.costPrice}
                              onChange={(e) => handleItemChange(index, "costPrice", parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>{(item.quantity * item.costPrice).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>4. Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select value={watch("paymentTerms")} onValueChange={(value) => setValue("paymentTerms", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                    <SelectItem value="2% 10 Net 30">2% 10 Net 30</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={watchCurrency} onValueChange={(value) => setValue("currency", value as "USD" | "AED")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxPercent">Tax %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  {...register("taxPercent", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCharges">Shipping Charges</Label>
                <Input type="number" min="0" step="0.01" {...register("shippingCharges", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">
                  {watchCurrency} {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({watchTaxPercent}%):</span>
                <span className="font-semibold">
                  {watchCurrency} {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-semibold">
                  {watchCurrency} {(watchShippingCharges || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Grand Total:</span>
                <span>
                  {watchCurrency} {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Logistics & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>5. Logistics & Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingMethod">Shipping Method (Optional)</Label>
                <Input {...register("shippingMethod")} placeholder="e.g., UPS Ground, Air Freight" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fobTerms">FOB Terms (Optional)</Label>
                <Input {...register("fobTerms")} placeholder="e.g., FOB Destination" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions / Notes (Optional)</Label>
              <Textarea
                {...register("specialInstructions")}
                placeholder="Any special requirements or notes..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/purchase-orders")} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || poItems.length === 0}>
            {isSaving ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderNew;
