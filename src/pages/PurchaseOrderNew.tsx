import { useState, useMemo, Dispatch, SetStateAction, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
import { cn } from "@/lib/utils"; 
import { Separator } from "@/components/ui/separator";

// Custom Components & Hooks
// FIX 2: Correctly import the component and the exported type
import { POItemSelector, POItemSelection } from "@/components/POItemSelector"; 
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, useStores } from "@/hooks/usePurchaseOrders"; 
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys"; // Assuming correct queryKeys definition
import { toast } from "sonner";

// FIX 6, 7, 8: Define the missing utility function
const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

// Placeholder interfaces for assumed components (to resolve prop errors)
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

// --- TYPE AND SCHEMA DEFINITIONS ---

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

// --- MAIN COMPONENT ---

const PurchaseOrderNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for line items selected
  const [poItems, setPoItems] = useState<POItemSelection[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Data fetching hooks
  const { data: suppliers, isLoading: isLoadingSuppliers } = useSuppliers();
  const { data: stores, isLoading: isLoadingStores } = useStores();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
        orderDate: new Date(),
        taxRate: 5, 
    },
  });

  const { taxRate } = watch();

  // --- CALCULATE TOTALS ---
  const { subtotal, taxAmount, grandTotal } = useMemo(() => {
    const subtotal = poItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
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
      // 1. Generate PO Number via RPC 
      // NOTE: Assuming generate_po_number RPC exists as per original analysis
      const { data: poNumberData, error: poNumberError } = await supabase.rpc('generate_po_number');

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
        status: 'draft', 
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_cost: grandTotal,
        shipping_charges: 0, 
        currency: 'USD',
      };

      const { data: insertedPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert(poRecord)
        .select('id')
        .maybeSingle();

      if (poError || !insertedPO) throw poError || new Error("Failed to create Purchase Order.");
      
      const po_id = insertedPO.id;

      // 3. Insert PO Items
      const poItemsToInsert = poItems.map(item => ({
        po_id,
        variant_id: item.variant_id,
        sku: item.sku,
        // Using item.name here is critical for line item clarity
        product_name: item.name, 
        quantity_ordered: item.quantity,
        unit_cost: item.unit_cost,
        line_total: item.quantity * item.unit_cost,
        received_quantity: 0,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(`Purchase Order ${po_number} created successfully.`);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); // Using a simpler key invalidation
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
        {/* PO Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>1. Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Supplier Select */}
            <div className="space-y-2">
              <Label htmlFor="supplierId" className={errors.supplierId ? "text-red-600" : ""}>Supplier</Label>
              <Select onValueChange={(value) => setValue('supplierId', value)} disabled={isLoadingSuppliers}>
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
              <Label htmlFor="destinationStoreId" className={errors.destinationStoreId ? "text-red-600" : ""}>Destination Store</Label>
              <Select onValueChange={(value) => setValue('destinationStoreId', value)} disabled={isLoadingStores}>
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
              <Label htmlFor="orderDate" className={errors.orderDate ? "text-red-600" : ""}>Order Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch('orderDate') && "text-muted-foreground",
                      { "border-red-500": errors.orderDate }
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('orderDate') ? format(watch('orderDate')!, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch('orderDate')}
                    onSelect={(date) => setValue('orderDate', date!)}
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
                    className={cn("w-full justify-start text-left font-normal", !watch('expectedArrivalDate') && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('expectedArrivalDate') ? format(watch('expectedArrivalDate')!, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch('expectedArrivalDate')}
                    onSelect={(date) => setValue('expectedArrivalDate', date || undefined)}
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
                {/* FIX 3: Component now correctly receives currentItems */}
                <POItemSelector 
                    currentItems={poItems}
                    onUpdateItems={setPoItems} 
                />
              </TabsContent>

              {/* Other Tabs */}
              <TabsContent value="import" className="mt-4">
                {/* FIX 4: Placeholder component with correct prop type */}
                <POItemImport onUpdateItems={setPoItems} />
              </TabsContent>
              <TabsContent value="barcode" className="mt-4">
                {/* FIX 5: Placeholder component with correct prop type */}
                <POBarcodeScanner onUpdateItems={setPoItems} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Totals and Summary Card */}
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
                        {/* FIX 6 */}
                        <span className="font-medium">{formatCurrency(subtotal)}</span> 
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Tax Rate</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                {...register('taxRate', { valueAsNumber: true })} 
                                className="w-20 text-right"
                            />
                            <span>%</span>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax Amount ({taxRate}%):</span>
                        {/* FIX 7 */}
                        <span className="font-medium">{formatCurrency(taxAmount)}</span> 
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-xl font-bold pt-1">
                        <span>Grand Total:</span>
                        {/* FIX 8 */}
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