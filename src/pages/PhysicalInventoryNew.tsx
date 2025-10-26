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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ArrowLeft, Save, PlayCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/usePhysicalInventorySessions";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@/types/database"; // Assuming this is your full Item type
import { POItemSelector } from "@/components/POItemSelector";
import { POItemImport } from "@/components/POItemImport";
import { POBarcodeScanner } from "@/components/POBarcodeScanner";

// Define a specific type for the fetched inventory items
interface BasicInventoryItem {
  id: string;
  sku: string;
  name: string;
  unit?: string;
  quantity: number;
}

// --- ITEM TYPE DEFINITION ---
interface PIItem {
  item_id: string;
  sku: string;
  itemName: string;
  system_quantity: number;
  counted_quantity: number;
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
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [piItems, setPIItems] = useState<PIItem[]>([]);
  const { data: stores = [] } = useStores();

  const { data: inventory = [] } = useQuery<BasicInventoryItem[]>({
    queryKey: ["allInventoryItems"],
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
      notes: "",
    },
  });

  // --- HANDLER FUNCTIONS FOR ITEMS (Unchanged) ---

  const lookupSkuForBarcode = async (sku: string) => {
    const item = inventory.find((i) => i.sku === sku);
    if (item) {
      return {
        name: item.name,
        price: 0,
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

    const existingSkus = piItems.map((i) => i.sku);
    const uniqueNewItems = newItems.filter((item) => !existingSkus.includes(item.sku));

    setPIItems([...piItems, ...uniqueNewItems]);
    toast.success(`Added ${uniqueNewItems.length} unique items to the count list.`);
  };

  const handleImportItems = (imported: any[]) => {
    const newItems: PIItem[] = imported.map((item) => {
      const inventoryItem = inventory.find((i) => i.sku === item.sku);

      return {
        item_id: inventoryItem?.id || item.sku,
        sku: item.sku,
        itemName: inventoryItem?.name || item.itemName || item.sku,
        system_quantity: inventoryItem?.quantity || 0,
        counted_quantity: 0,
      };
    });

    const existingSkus = piItems.map((i) => i.sku);
    const uniqueNewItems = newItems
      .filter((item) => !existingSkus.includes(item.sku))
      .filter((item) => inventory.some((i) => i.sku === item.sku));

    setPIItems([...piItems, ...uniqueNewItems]);
    toast.success(
      `Imported ${uniqueNewItems.length} unique items. ${newItems.length - uniqueNewItems.length} items were duplicates or not found in inventory.`,
    );
  };

  const handleBarcodeScans = (scannedItems: any[]) => {
    const updatedItems = [...piItems];
    let newCount = 0;

    scannedItems.forEach((newItem) => {
      const inventoryItem = inventory.find((i) => i.sku === newItem.sku);

      const piItem: PIItem = {
        item_id: inventoryItem?.id || newItem.sku,
        sku: newItem.sku,
        itemName: inventoryItem?.name || newItem.sku,
        system_quantity: inventoryItem?.quantity || 0,
        counted_quantity: newItem.quantity || 0,
      };

      const existingIndex = updatedItems.findIndex((i) => i.sku === piItem.sku);
      if (existingIndex > -1) {
        if (piItem.counted_quantity > 0) {
          updatedItems[existingIndex].counted_quantity = piItem.counted_quantity;
        }
      } else {
        updatedItems.push(piItem);
        newCount++;
      }
    });

    setPIItems(updatedItems);
    toast.success(`Scanned and added/updated ${scannedItems.length} items. ${newCount} were unique new additions.`);
  };

  const handleRemoveItem = (sku: string) => {
    setPIItems(piItems.filter((i) => i.sku !== sku));
    toast.info(`${sku} removed from count list.`);
  };

  // --- SUBMIT AND START COUNTING (Moved inside the component) ---
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
          expected_items: piItems.length,
          notes: values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const sessionId = data.id;

      // 3. Create initial physical_inventory_counts records
      const initialCounts = piItems.map((item) => ({
        session_id: sessionId,
        item_id: item.item_id,
        sku: item.sku,
        item_name: item.itemName,
        system_quantity: item.system_quantity,
        counted_quantity: item.counted_quantity,
        status: item.counted_quantity > 0 ? "counted" : "pending",
        variance: item.counted_quantity - item.system_quantity,
        variance_percentage: item.system_quantity
          ? ((item.counted_quantity - item.system_quantity) / item.system_quantity) * 100
          : 0,
      }));

      const { error: countError } = await supabase.from("physical_inventory_counts").upsert(initialCounts);

      if (countError) {
        console.error("Error inserting initial counts:", countError);
      }

      toast.success(
        startCounting ? `Session ${data.session_number} started` : `Session ${data.session_number} saved as draft`,
      );

      if (startCounting) {
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
      {/* ... (Header remains the same) ... */}

      <Form {...form}>
        <form className="space-y-6">
          {/* STEP 1: Session Details */}
          {step === 1 && (
            <>
              {/* ... (Step 1 form fields remain the same) ... */}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
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
                {/* ... (Card Header remains the same) ... */}
                <CardContent>
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                      <TabsTrigger value="import">Excel/Sheet Import</TabsTrigger>
                      <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="mt-4">
                      <POItemSelector items={inventory as Item[]} onSelect={handleAddItemsFromSelector} />
                    </TabsContent>
                    <TabsContent value="import" className="mt-4">
                      <POItemImport onImport={handleImportItems} existingSkus={inventory.map((i) => i.sku)} />
                    </TabsContent>
                    <TabsContent value="barcode" className="mt-4">
                      <POBarcodeScanner onScan={handleBarcodeScans} onLookupSku={lookupSkuForBarcode} />
                    </TabsContent>
                  </Tabs>

                  {/* Summary Table */}
                  {/* ... (Summary Table JSX remains the same) ... */}
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
                    // FIX: Correctly referencing the function
                    onClick={form.handleSubmit((data) => createSessionAndCounts(data, false))}
                    disabled={isSubmitting || piItems.length === 0}
                    className="mr-3"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    // FIX: Correctly referencing the function
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
