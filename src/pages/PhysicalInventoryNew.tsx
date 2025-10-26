import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // NEW
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // NEW
import { Trash2, ArrowLeft, Save, PlayCircle, ChevronRight, ChevronLeft } from "lucide-react"; // NEW Icons
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/usePhysicalInventorySessions";
import { useQuery } from "@tanstack/react-query"; // NEW
import { queryKeys } from "@/hooks/queryKeys"; // Assuming you have this
import { Item } from "@/types/database"; // Assuming you have this type
// You need to create these components or adjust imports based on your actual file names
import { POItemSelector } from "@/components/POItemSelector"; // RE-USING PO COMPONENTS
import { POItemImport } from "@/components/POItemImport"; // RE-USING PO COMPONENTS
import { POBarcodeScanner } from "@/components/POBarcodeScanner"; // RE-USING PO COMPONENTS

// --- ITEM TYPE DEFINITION ---
// This defines the structure of an item to be counted in this session
interface PIItem {
  item_id: string; // The primary key for the item in your `items` table
  sku: string;
  itemName: string;
  system_quantity: number; // Quantity currently in the system
  counted_quantity: number; // Will be 0 initially
}

// --- ZOD SCHEMA (UNCHANGED) ---
const piSchema = z.object({
  countDate: z.string().min(1, "Count date is required"),
  storeId: z.string().optional(),
  countType: z.enum(["full", "partial", "cycle"]),
  responsiblePerson: z.string().min(1, "Responsible person is required"),
  department: z.string().optional(),
  purpose: z.string().optional(),
  locationFilter: z.string().optional(),
  expectedItems: z.string().optional(),
  notes: z.string().optional(),
});

type PIFormValues = z.infer<typeof piSchema>;

const PhysicalInventoryNew = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Session Details, 2: Add Items
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [piItems, setPIItems] = useState<PIItem[]>([]); // Items to be counted
  const { data: stores = [] } = useStores();

  // Fetch all inventory items (needed for item selection/lookup)
  const { data: inventory = [] } = useQuery<Item[]>({
    queryKey: ["allInventoryItems"], // Use a specific key, maybe queryKeys.inventory.all
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, sku, name, unit, quantity").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const form = useForm<PIFormValues>({
    resolver: zodResolver(piSchema),
    defaultValues: {
      countDate: new Date().toISOString().split("T")[0],
      countType: "full",
      responsiblePerson: "",
      department: "",
      purpose: "",
      locationFilter: "",
      expectedItems: "",
      notes: "",
    },
  });

  const watchStoreId = form.watch("storeId");

  // --- HANDLER FUNCTIONS FOR ITEMS ---

  // Custom lookup function for Barcode Scanner, retrieves the system quantity
  const lookupSkuForBarcode = async (sku: string) => {
    const item = inventory.find((i) => i.sku === sku);
    if (item) {
      return {
        name: item.name,
        system_quantity: item.quantity || 0,
        item_id: item.id,
      };
    }
    return null;
  };

  const handleAddItemsFromSelector = (selected: Array<{ item: Item; quantity: number }>) => {
    const newItems: PIItem[] = selected.map(({ item }) => ({
      item_id: item.id,
      sku: item.sku,
      itemName: item.name,
      system_quantity: item.quantity || 0,
      counted_quantity: 0,
    }));

    // Filter out duplicates based on sku
    const existingSkus = piItems.map((i) => i.sku);
    const uniqueNewItems = newItems.filter((item) => !existingSkus.includes(item.sku));

    setPIItems([...piItems, ...uniqueNewItems]);
    toast.success(`Added ${uniqueNewItems.length} unique items to the count list.`);
  };

  const handleImportItems = (imported: any[]) => {
    const newItems: PIItem[] = imported.map((item) => {
      // Find the corresponding item in the full inventory to get the system quantity and item_id
      const inventoryItem = inventory.find((i) => i.sku === item.sku);

      return {
        item_id: inventoryItem?.id || item.sku, // Fallback to SKU if ID not found (may need error handling)
        sku: item.sku,
        itemName: inventoryItem?.name || item.itemName || item.sku,
        system_quantity: inventoryItem?.quantity || 0,
        counted_quantity: 0,
      };
    });

    // Filter out duplicates and ensure all items have a corresponding inventory record (optional check)
    const existingSkus = piItems.map((i) => i.sku);
    const uniqueNewItems = newItems
      .filter((item) => !existingSkus.includes(item.sku))
      .filter((item) => inventory.some((i) => i.sku === item.sku)); // Only allow SKUs existing in inventory

    setPIItems([...piItems, ...uniqueNewItems]);
    toast.success(
      `Imported ${uniqueNewItems.length} unique items. ${newItems.length - uniqueNewItems.length} items were duplicates or not found in inventory.`,
    );
  };

  const handleBarcodeScans = (scannedItems: any[]) => {
    const newItems: PIItem[] = scannedItems.map((item) => {
      const inventoryItem = inventory.find((i) => i.sku === item.sku);

      return {
        item_id: inventoryItem?.id || item.sku,
        sku: item.sku,
        itemName: inventoryItem?.name || item.sku,
        system_quantity: inventoryItem?.quantity || 0,
        counted_quantity: item.quantity || 0, // Pre-fill counted quantity if scanned with QTY
      };
    });

    // Filter out duplicates and allow existing items to update counted_quantity if scanned again
    const updatedItems = [...piItems];
    let newCount = 0;

    newItems.forEach((newItem) => {
      const existingIndex = updatedItems.findIndex((i) => i.sku === newItem.sku);
      if (existingIndex > -1) {
        // If item already exists in the list, just update its counted quantity (if scanner provides it)
        if (newItem.counted_quantity > 0) {
          updatedItems[existingIndex].counted_quantity = newItem.counted_quantity;
        }
      } else {
        // Add new unique item
        updatedItems.push(newItem);
        newCount++;
      }
    });

    setPIItems(updatedItems);
    toast.success(`Scanned and added/updated ${newItems.length} items. ${newCount} were unique new additions.`);
  };

  const handleRemoveItem = (sku: string) => {
    setPIItems(piItems.filter((i) => i.sku !== sku));
    toast.info(`${sku} removed from count list.`);
  };

  // --- SUBMIT AND START COUNTING ---

  // Function to create the session and its initial count records
  const createSessionAndCounts = async (values: PIFormValues, startCounting: boolean) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (piItems.length === 0) {
        throw new Error("Cannot start session: The count list is empty. Please add items.");
      }

      // 1. Generate session number
      const { data: sessionNumber, error: funcError } = await supabase.rpc("generate_pi_session_number");
      if (funcError) throw funcError;

      // 2. Create session
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .insert({
          session_number: sessionNumber,
          started_by: user.id,
          status: startCounting ? "in_progress" : "draft",
          store_id: values.storeId || null,
          count_date: values.countDate,
          count_type: values.countType,
          responsible_person: values.responsiblePerson,
          department: values.department || null,
          purpose: values.purpose || null,
          location_filter: values.locationFilter || null,
          expected_items: piItems.length, // Set expected items based on the count list
          notes: values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const sessionId = data.id;

      // 3. Create initial physical_inventory_counts records
      // These records store the *initial* system quantity and the counted quantity (0 or pre-scanned)
      const initialCounts = piItems.map((item) => ({
        session_id: sessionId,
        item_id: item.item_id,
        sku: item.sku,
        item_name: item.itemName,
        system_quantity: item.system_quantity,
        counted_quantity: item.counted_quantity, // Use pre-scanned quantity or 0
        status: item.counted_quantity > 0 ? "counted" : "pending",
        variance: item.counted_quantity - item.system_quantity,
        variance_percentage: item.system_quantity
          ? ((item.counted_quantity - item.system_quantity) / item.system_quantity) * 100
          : 0,
      }));

      // Upsert to handle potential conflicts if an item was somehow added twice (though filtered)
      const { error: countError } = await supabase.from("physical_inventory_counts").upsert(initialCounts);

      if (countError) {
        // Log error but continue as session creation succeeded
        console.error("Error inserting initial counts:", countError);
        // throw countError; // Decide if count insert failure should block session creation
      }

      toast.success(
        startCounting ? `Session ${data.session_number} started` : `Session ${data.session_number} saved as draft`,
      );

      if (startCounting) {
        // Navigate to the detail page for actual counting
        navigate(`/inventory/physical/${sessionId}`);
      } else {
        navigate("/inventory/physical");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER LOGIC ---

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/inventory/physical")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sessions
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Physical Count (Step {step} of 2)</h1>
          <p className="text-muted-foreground mt-1">Create a new physical inventory session</p>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* STEP 1: Session Details */}
          {step === 1 && (
            <>
              {/* Section 1: Session Information */}
              <Card>
                <CardHeader>
                  <CardTitle>1. Session Identification & Details</CardTitle>
                  <CardDescription>Basic information about this physical count session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="countDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Count Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store/Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select store" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stores.map((store) => (
                                <SelectItem key={store.id} value={store.id}>
                                  {store.name}
                                  {store.location && ` - ${store.location}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="countType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Count Type *</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="full" id="full" />
                              <Label htmlFor="full" className="cursor-pointer">
                                Full Count
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="partial" id="partial" />
                              <Label htmlFor="partial" className="cursor-pointer">
                                Partial Count
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cycle" id="cycle" />
                              <Label htmlFor="cycle" className="cursor-pointer">
                                Cycle Count
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>Choose the type of inventory count you want to perform</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Warehouse, Retail" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="locationFilter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specific Location/Zone</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Warehouse A - Zone 3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Purpose & Responsibility */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Count Purpose & Personnel</CardTitle>
                  <CardDescription>Who is conducting the count and why</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select purpose" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Annual Count">Annual Count</SelectItem>
                            <SelectItem value="Monthly Reconciliation">Monthly Reconciliation</SelectItem>
                            <SelectItem value="Variance Investigation">Variance Investigation</SelectItem>
                            <SelectItem value="Pre-Audit">Pre-Audit</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsible Person *</FormLabel>
                        <FormControl>
                          <Input placeholder="Name of person conducting the count" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes/Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Special instructions or notes for this count session..."
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    // Validate step 1 fields before moving to step 2
                    const isValid = await form.trigger(["countDate", "countType", "responsiblePerson"]);
                    if (isValid) {
                      setStep(2);
                    } else {
                      toast.error("Please fill in all required fields for Step 1.");
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Next: Add Items <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 2: Item Selection/Import/Review */}
          {step === 2 && (
            <>
              {/* Section 3: Add Items */}
              <Card>
                <CardHeader>
                  <CardTitle>3. Items to Count ({piItems.length})</CardTitle>
                  <CardDescription>Select the items to include in this physical count session.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                      <TabsTrigger value="import">Excel/Sheet Import</TabsTrigger>
                      <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="mt-4">
                      {/* Using the POItemSelector but adjusting the select logic */}
                      <POItemSelector
                        items={inventory}
                        onSelect={handleAddItemsFromSelector}
                        // The selector component likely takes an `items` prop of type `Item[]`
                        // Ensure your POItemSelector handles the item: Item, quantity: number, price: number payload
                        // For PI, we only need item and potentially a default quantity of 0
                        // You might need a specific PIItemSelector if the component is too coupled to PO price logic
                      />
                    </TabsContent>
                    <TabsContent value="import" className="mt-4">
                      {/* The Import component should output { sku, itemName, quantity } objects */}
                      <POItemImport onImport={handleImportItems} existingSkus={inventory.map((i) => i.sku)} />
                    </TabsContent>
                    <TabsContent value="barcode" className="mt-4">
                      {/* The Barcode Scanner component should output { sku, quantity } objects */}
                      <POBarcodeScanner
                        onScan={handleBarcodeScans}
                        // Custom lookup is needed to get the item ID and system quantity
                        onLookupSku={lookupSkuForBarcode}
                      />
                    </TabsContent>
                  </Tabs>

                  {/* Summary Table */}
                  {piItems.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-4">Count List Summary</h3>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Item Name</TableHead>
                              <TableHead className="text-right">System Qty</TableHead>
                              <TableHead className="text-right">Pre-Scanned Qty</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {piItems.map((item, index) => (
                              <TableRow key={item.sku}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell className="text-right">{item.system_quantity}</TableCell>
                                <TableCell className="text-right font-medium">{item.counted_quantity}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.sku)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Total items in count list: **{piItems.length}**
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons for Step 2 */}
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Step
                </Button>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={form.handleSubmit((data) => createSessionAndCounts(data, false))}
                    disabled={isSubmitting || piItems.length === 0}
                    className="mr-3"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit((data) => createSessionAndCounts(data, true))}
                    disabled={isSubmitting || piItems.length === 0}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Counting
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
};

export default PhysicalInventoryNew;
