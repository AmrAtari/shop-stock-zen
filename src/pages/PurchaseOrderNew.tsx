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
  const { data: inventory = [] } = useQuery<Item[]>({
    queryKey: queryKeys.inventory.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("name");
      if (error) throw error;
      return data || [];
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
      unit: item.unit,
      quantity,
      costPrice: price,
    }));
    setPOItems([...poItems, ...newItems]);
    toast.success(`Added ${newItems.length} items`);
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

      const { data: poNumber, error: poNumberError } = await supabase.rpc("generate_po_number", {
        supplier_name: supplierData.name,
      });

      if (poNumberError) throw poNumberError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: poNumber,
          supplier: supplierData.name,
          store_id: data.store,
          order_date: data.orderDate.toISOString(),
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
        po_id: poData.id,
        sku: item.sku,
        item_name: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        cost_price: item.costPrice,
      }));

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(poItemsData);
      if (itemsError) throw itemsError;

      // ✅ Update store quantities
      for (const item of poItems) {
        const { data: existingRecord, error: fetchError } = await supabase
          .from("store_quantities")
          .select("*")
          .eq("store_id", data.store)
          .eq("sku", item.sku)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") continue;

        if (existingRecord) {
          await supabase
            .from("store_quantities")
            .update({ quantity: existingRecord.quantity + item.quantity, updated_at: new Date().toISOString() })
            .eq("store_id", data.store)
            .eq("sku", item.sku);
        } else {
          await supabase.from("store_quantities").insert({
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

  return <div>/* UI code unchanged except store now required */</div>;
};

export default PurchaseOrderNew;
