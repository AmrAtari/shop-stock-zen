import { useState, useMemo, Dispatch, SetStateAction, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Added missing table imports
import { cn } from "@/lib/utils";

// Custom Components & Hooks
import { POItemSelector } from "@/components/POItemSelector";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, useStores } from "@/hooks/usePurchaseOrders"; // Assuming this exists
import { toast } from "sonner";

// --- PLACEHOLDER TYPES & HOOKS (Reverted Version) ---

// Define the POItemSelection type to match the state in this file
type POItemSelection = {
  variant_id: string; // The ID of the variant
  sku: string;
  name: string;
  unit_cost: number;
  quantity: number;
};

// Define the Item type to match the data passed to POItemSelector
type Item = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock_on_hand: number;
  cost_price: number;
};

// Simple hook to fetch all items for the selector
const useAllItems = () => {
  return useQuery<Item[]>({
    queryKey: ["all-po-items"],
    queryFn: async () => {
      // Simple fetch to prevent timeouts
      const { data, error } = await supabase
        .from("product_variants")
        .select(`id, sku, name, stock_on_hand, cost_price, products (category)`)
        .order("sku");

      if (error) throw error;

      return (data || []).map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        category: variant.products.category,
        stock_on_hand: variant.stock_on_hand,
        cost_price: variant.cost_price,
      }));
    },
  });
};

// Placeholder interfaces for assumed components
interface POItemImportProps {
  onUpdateItems: (items: POItemSelection[]) => void;
}
const POItemImport: React.FC<POItemImportProps> = ({ onUpdateItems }) => (
  <div className="p-4 border rounded-md">Placeholder for Excel Import functionality.</div>
);

interface POBarcodeScannerProps {
  onUpdateItems: (items: POItemSelection[]) => void;
}
const POBarcodeScanner: React.FC<POBarcodeScannerProps> = ({ onUpdateItems }) => (
  <div className="p-4 border rounded-md">Placeholder for Barcode Scanner functionality.</div>
);

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

// --- SCHEMA & MAIN COMPONENT ---

const poSchema = z.object({
  supplierId: z.string().uuid({ message: "Supplier is required." }),
  destinationStoreId: z.string().uuid({ message: "Destination Store is required." }),
  orderDate: z.date({ required_error: "Order date is required." }),
  expectedArrivalDate: z.date().optional(),
  shippingMethod: z.string().optional(),
  fobTerms: z.string().optional(),
  specialInstructions: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
});

type POFormValues = z.infer<typeof poSchema>;

const PurchaseOrderNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [poItems, setPoItems] = useState<POItemSelection[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: suppliers, isLoading: isLoadingSuppliers } = useSuppliers();
  const { data: stores, isLoading: isLoadingStores } = useStores();
  const { data: allProducts, isLoading: isLoadingProducts } = useAllItems();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      orderDate: new Date(),
      taxRate: 5,
    },
  });

  const { taxRate } = watch();

  // --- HANDLER TO RECEIVE SELECTED ITEMS ---
  const handleSelectItems = (selectedItems: { item: Item; quantity: number; price: number }[]) => {
    // Convert the complex selectedItems array into the simple POItemSelection array
    const newItems: POItemSelection[] = selectedItems.map((s) => ({
      variant_id: s.item.id,
      sku: s.item.sku,
      name: s.item.name,
      unit_cost: s.price, // Use the user-defined price (unit cost)
      quantity: s.quantity,
    }));

    // Simple deduplication logic: replace existing if SKU matches, otherwise append
    setPoItems((prevItems) => {
      const existingMap = new Map(prevItems.map((item) => [item.variant_id, item]));
      newItems.forEach((item) => existingMap.set(item.variant_id, item));
      return Array.from(existingMap.values());
    });
  };

  // --- CALCULATE TOTALS ---
  const { subtotal, taxAmount, grandTotal } = useMemo(() => {
    const subtotal = poItems.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    return { subtotal, taxAmount, grandTotal };
  }, [poItems, taxRate]);

  // --- SUBMISSION LOGIC ---
  const onSubmit = async (data: POFormValues) => {
    if (poItems.length === 0) {
      toast.error("You must add at least one line item to the purchase order.");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Generate PO Number via RPC (Assumed to exist)
      const { data: poNumberData, error: poNumberError } = await supabase.rpc("generate_po_number");

      if (poNumberError) throw poNumberError;
      const po_number = poNumberData;

      // 2. Insert PO record
      const poRecord = {
        po_number,
        supplier_id: data.supplierId,
        destination_store_id: data.destinationStoreId,
        order_date: data.orderDate.toISOString(),
        expected_arrival_date: data.expectedArrivalDate?.toISOString() || null,
        shipping_method: data.shippingMethod,
        fob_terms: data.fobTerms,
        special_instructions: data.specialInstructions,
        status: "draft",
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_cost: grandTotal,
        shipping_charges: 0,
        currency: "USD",
      };

      const { data: insertedPO, error: poError } = await supabase
        .from("purchase_orders")
        .insert(poRecord)
        .select("id")
        .maybeSingle();

      if (poError || !insertedPO) throw poError || new Error("Failed to create Purchase Order.");

      const po_id = insertedPO.id;

      // 3. Insert PO Items
      const poItemsToInsert = poItems.map((item) => ({
        po_id,
        variant_id: item.variant_id,
        sku: item.sku,
        product_name: item.name,
        quantity_ordered: item.quantity,
        unit_cost: item.unit_cost,
        line_total: item.quantity * item.unit_cost,
        received_quantity: 0,
      }));

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(poItemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(`Purchase Order ${po_number} created successfully.`);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      navigate(`/purchase-orders/${po_id}`);
    } catch (error) {
      console.error("PO Creation Error:", error);
      toast.error("Failed to create Purchase Order.", { description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold">Create New Purchase Order</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* PO Information Card (Same as before) */}
        <Card>
          <CardHeader>
            <CardTitle>1. Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Supplier Select */}
            <div className="space-y-2">
              <Label htmlFor="supplierId" className={errors.supplierId ? "text-red-600" : ""}>
                Supplier
              </Label>
              <Select onValueChange={(value) => setValue("supplierId", value)} disabled={isLoadingSuppliers}>
                <SelectTrigger className={cn({ "border-red-500": errors.supplierId })}>
                  <SelectValue placeholder={isLoadingSuppliers ? "Loading Suppliers..." : "Select a supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierId && <p className="text-sm text-red-600">{errors.supplierId.message}</p>}
            </div>

            {/* Destination Store Select */}
            <div className="space-y-2">
              <Label htmlFor="destinationStoreId" className={errors.destinationStoreId ? "text-red-600" : ""}>
                Destination Store
              </Label>
              <Select onValueChange={(value) => setValue("destinationStoreId", value)} disabled={isLoadingStores}>
                <SelectTrigger className={cn({ "border-red-500": errors.destinationStoreId })}>
                  <SelectValue placeholder={isLoadingStores ? "Loading Stores..." : "Select destination store"} />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.destinationStoreId && <p className="text-sm text-red-600">{errors.destinationStoreId.message}</p>}
            </div>

            {/* Order Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="orderDate" className={errors.orderDate ? "text-red-600" : ""}>
                Order Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("orderDate") && "text-muted-foreground",
                      { "border-red-500": errors.orderDate },
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("orderDate") ? format(watch("orderDate")!, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch("orderDate")}
                    onSelect={(date) => setValue("orderDate", date!)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.orderDate && <p className="text-sm text-red-600">{errors.orderDate.message}</p>}
            </div>

            {/* Expected Arrival Date (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="expectedArrivalDate">Expected Arrival Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("expectedArrivalDate") && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("expectedArrivalDate") ? (
                      format(watch("expectedArrivalDate")!, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch("expectedArrivalDate")}
                    onSelect={(date) => setValue("expectedArrivalDate", date || undefined)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Card */}
        <Card>
          <CardHeader>
            <CardTitle>2. Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                <TabsTrigger value="import">Excel Import</TabsTrigger>
                <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
              </TabsList>

              {/* Manual Selection Tab */}
              <TabsContent value="manual" className="mt-4">
                <POItemSelector items={allProducts || []} isLoading={isLoadingProducts} onSelect={handleSelectItems} />
              </TabsContent>

              {/* Other Tabs */}
              <TabsContent value="import" className="mt-4">
                <POItemImport onUpdateItems={setPoItems} />
              </TabsContent>
              <TabsContent value="barcode" className="mt-4">
                <POBarcodeScanner onUpdateItems={setPoItems} />
              </TabsContent>
            </Tabs>

            {/* Display Selected Items */}
            {poItems.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Selected Items ({poItems.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((item) => (
                      <TableRow key={item.variant_id}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_cost * item.quantity)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPoItems(poItems.filter((p) => p.variant_id !== item.variant_id))}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals and Summary Card (Same as before) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shipping & Notes Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>3. Shipping and Notes</CardTitle>
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

          {/* Financial Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>4. Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item Count:</span>
                <span className="font-medium">{poItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Tax Rate</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" {...register("taxRate", { valueAsNumber: true })} className="w-20 text-right" />
                  <span>%</span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Amount ({taxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold pt-1">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

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
