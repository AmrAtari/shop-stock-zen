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
  store: z.string().min(1, "Store is required"),
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
  specialInstructions: z.string().optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  shippingCharges: z.number().min(0).default(0),
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
  const { data: inventory = [] } = useQuery<Item[], Error>({
    queryKey: queryKeys.inventory.all,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase.from("items").select("*").order("name");
      if (error) throw error;
      return (data as Item[]) || [];
    },
  });

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

      const { data: poNumber, error: poNumberError } = await (supabase.rpc as any)("generate_po_number", {
        supplier_name: supplierData.name,
      });
      if (poNumberError) throw poNumberError;

      const {
        data: { user },
      } = await (supabase.auth.getUser as any)();

      const { data: poData, error: poError } = await (supabase.from as any)("purchase_orders")
        .insert({
          po_number: poNumber,
          supplier: supplierData.name,
          store_id: data.store,
          order_date: data.orderDate.toISOString(),
          expected_delivery: data.expectedDelivery?.toISOString(),
          buyer_company_name: data.buyerCompanyName,
          buyer_address: data.buyerAddress,
          buyer_contact: data.buyerContact,
          billing_address: data.billingAddress,
          shipping_address: data.shippingAddress,
          payment_terms: data.paymentTerms,
          currency: data.currency,
          shipping_method: data.shippingMethod,
          fob_terms: data.fobTerms,
          special_instructions: data.specialInstructions,
          subtotal,
          tax_amount: taxAmount,
          shipping_charges: data.shippingCharges,
          total_cost: grandTotal,
          total_items: poItems.reduce((sum, item) => sum + item.quantity, 0),
          status: "draft",
          authorized_by: user?.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      const poItemsData = poItems.map((item) => ({
        po_id: (poData as any)?.id,
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

      const { error: itemsError } = await (supabase.from as any)("purchase_order_items").insert(poItemsData);
      if (itemsError) throw itemsError;

      for (const item of poItems) {
        const { data: existingRecord } = await (supabase.from as any)("store_quantities")
          .select("*")
          .eq("store_id", data.store)
          .eq("sku", item.sku)
          .maybeSingle();

        const currentQty = (existingRecord as any)?.quantity || 0;
        if (currentQty > 0) {
          await (supabase.from as any)("store_quantities")
            .update({ quantity: currentQty + item.quantity, updated_at: new Date().toISOString() })
            .eq("store_id", data.store)
            .eq("sku", item.sku);
        } else {
          await (supabase.from as any)("store_quantities").insert({
            store_id: data.store,
            sku: item.sku,
            quantity: item.quantity,
            created_at: new Date().toISOString(),
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success(`Purchase Order ${poNumber} created successfully`);
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
                <Label htmlFor="store">Store *</Label>
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
                {errors.store && <p className="text-sm text-destructive">{errors.store.message}</p>}
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
            </div>
          </CardContent>
        </Card>

        {/* Buyer & Supplier Details */}
        <Card>
          <CardHeader>
            <CardTitle>2. Buyer & Supplier Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  <p><strong>Address:</strong> {selectedSupplier.address || "N/A"}</p>
                  <p><strong>Contact:</strong> {selectedSupplier.contact_person || "N/A"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Items */}
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
                <POItemImport onImport={() => {}} existingSkus={inventory.map((i) => i.sku)} />
              </TabsContent>
              <TabsContent value="barcode">
                <POBarcodeScanner onScan={() => {}} onLookupSku={async () => null} />
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
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
