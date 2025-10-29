import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Item, PriceLevel } from "@/types/database";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { History } from "lucide-react";
import PriceHistoryDialog from "./PriceHistoryDialog";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { useAttributeTypes } from "@/hooks/useAttributeTypes";

// --- New: Type definitions for the item being edited (Fixes Inventory.tsx error) ---
interface ProductDialogItem {
  id: string; // variant_id
  product_id: string;
  sku: string;
  name: string;
  item_number: string;
  pos_description: string | null;
  description: string | null;
  theme: string | null;
  season: string;
  color: string;
  size: string;
  unit: string;
  // Financial/Price Data - REQUIRED to be present (number | null)
  sellingPrice: number | null;
  cost: number | null;
  tax_rate: number | null;
  wholesale_price: number | null;
  // Foreign Key IDs
  brand_id: string | null;
  category_id: string | null;
  gender_id: string | null;
  origin_id: string | null;
  supplier_id: string | null;
}

// New: Defines the expected structure of lookup data from useAttributeTypes
interface AttributeMap {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  genders: { id: string; name: string }[];
  origins: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  colors: { id: string; name: string }[];
  sizes: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}

// --- Helper Types for Form Data ---
interface ProductFormData {
  name: string;
  item_number: string;
  pos_description: string;
  description: string;
  theme: string;
  wholesale_price: number | null;
  // Foreign Keys for Products table
  brand_id: string;
  category_id: string;
  gender_id: string;
  origin_id: string;
}

interface VariantFormData {
  sku: string;
  season: string;
  color: string;
  size: string;
  // Financial/Price Data on Variant
  selling_price: number | null;
  cost: number | null;
  tax_rate: number | null;
  unit: string;
  // Foreign Key for Supplier
  supplier_id: string;
}

interface PriceData {
  selling_price: number | null;
  cost: number | null;
  tax_rate: number | null;
  wholesale_price: number | null;
}
// --- END Helper Types ---

interface ProductDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ProductDialogItem; // <-- Uses the fixed required interface
  onSave: () => void;
}

// Confirmation Dialog Component (omitted for brevity, assume correct)
interface UpdateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (applyToAll: boolean) => void;
  itemName: string;
  itemNumber?: string;
}

const UpdateConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemNumber,
}: UpdateConfirmationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Update</DialogTitle>
          <DialogDescription>
            Do you want to apply this price change only to **{itemName}** (SKU: {itemNumber}) or to **all variants**
            under this item number?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onConfirm(false)}>
            Only this Variant
          </Button>
          <Button onClick={() => onConfirm(true)}>All Variants (Item No.)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProductDialogNew: React.FC<ProductDialogNewProps> = ({ open, onOpenChange, item, onSave }) => {
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const [productData, setProductData] = useState<ProductFormData>({
    name: "",
    item_number: "",
    pos_description: "",
    description: "",
    theme: "",
    wholesale_price: null,
    brand_id: "",
    category_id: "",
    gender_id: "",
    origin_id: "",
  });

  const [variantData, setVariantData] = useState<VariantFormData>({
    sku: "",
    season: "",
    color: "",
    size: "",
    selling_price: null,
    cost: null,
    tax_rate: null,
    unit: "",
    supplier_id: "",
  });

  const [priceData, setPriceData] = useState<PriceData>({
    selling_price: null,
    cost: null,
    tax_rate: null,
    wholesale_price: null,
  });

  const [loading, setLoading] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);

  // FIX: Use 'unknown' cast to force TypeScript to accept that the actual runtime data
  // structure of 'attributeTypes' matches 'AttributeMap', and alias it to 'attributes'.
  const { attributeTypes: attributes, isLoading: isLoadingAttributes } = useAttributeTypes() as unknown as {
    attributeTypes: AttributeMap;
    isLoading: boolean;
  };

  // Load data into form when editing an existing item
  useEffect(() => {
    if (item && open) {
      // 1. Load data for the PRODUCT
      setProductData({
        name: item.name || "",
        item_number: item.item_number || "",
        pos_description: item.pos_description || "",
        description: item.description || "",
        theme: item.theme || "",
        wholesale_price: item.wholesale_price || null,
        brand_id: item.brand_id || "",
        category_id: item.category_id || "",
        gender_id: item.gender_id || "",
        origin_id: item.origin_id || "",
      });

      // 2. Load data for the VARIANT
      setVariantData({
        sku: item.sku || "",
        season: item.season || "",
        color: item.color || "",
        size: item.size || "",
        selling_price: item.sellingPrice || null,
        cost: item.cost || null,
        tax_rate: item.tax_rate || null,
        unit: item.unit || "",
        supplier_id: item.supplier_id || "",
      });

      // 3. Load price data (used for confirmation logic)
      setPriceData({
        selling_price: item.sellingPrice || null,
        cost: item.cost || null,
        tax_rate: item.tax_rate || null,
        wholesale_price: item.wholesale_price || null,
      });
    } else if (open) {
      // Clear form when opening for a new product
      setProductData({
        name: "",
        item_number: "",
        pos_description: "",
        description: "",
        theme: "",
        wholesale_price: null,
        brand_id: "",
        category_id: "",
        gender_id: "",
        origin_id: "",
      });
      setVariantData({
        sku: "",
        season: "",
        color: "",
        size: "",
        selling_price: null,
        cost: null,
        tax_rate: null,
        unit: "",
        supplier_id: "",
      });
      setPriceData({ selling_price: null, cost: null, tax_rate: null, wholesale_price: null });
    }
  }, [item, open]);

  // --- Core Save Logic ---
  const handleSave = async (e: React.FormEvent, applyToAll: boolean = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalProductId = item?.product_id;
      let productInsertError = null;

      // 1. CREATE/UPDATE PARENT PRODUCT RECORD
      if (!isEditing || !item?.product_id) {
        // New product: Insert into 'products' table first
        const { data: product, error: pError } = await supabase
          .from("products")
          .insert([
            {
              name: productData.name,
              item_number: productData.item_number,
              pos_description: productData.pos_description,
              description: productData.description,
              theme: productData.theme,
              wholesale_price: productData.wholesale_price,
              brand_id: productData.brand_id || null,
              category_id: productData.category_id || null,
              gender_id: productData.gender_id || null,
              origin_id: productData.origin_id || null,
            },
          ])
          .select("product_id")
          .single();

        if (pError) {
          productInsertError = pError;
          throw new Error(`Failed to create product record: ${pError.message}`);
        }

        finalProductId = product?.product_id;
      } else {
        // Existing product: Update the parent 'products' record
        const { error: pUpdateError } = await supabase
          .from("products")
          .update({
            name: productData.name,
            item_number: productData.item_number,
            pos_description: productData.pos_description,
            description: productData.description,
            theme: productData.theme,
            wholesale_price: productData.wholesale_price,
            brand_id: productData.brand_id || null,
            category_id: productData.category_id || null,
            gender_id: productData.gender_id || null,
            origin_id: productData.origin_id || null,
          })
          .eq("product_id", item.product_id);

        if (pUpdateError) {
          throw new Error(`Failed to update product record: ${pUpdateError.message}`);
        }
      }

      // Ensure we have an ID before proceeding to save the variant
      if (!finalProductId) {
        throw new Error("Missing Product ID after save attempt.");
      }

      // 2. CREATE/UPDATE VARIANT RECORD
      const variantPayload = {
        sku: variantData.sku,
        season: variantData.season,
        color: variantData.color,
        size: variantData.size,
        selling_price: variantData.selling_price,
        cost: variantData.cost,
        tax_rate: variantData.tax_rate,
        unit: variantData.unit,
        supplier_id: variantData.supplier_id || null,
        // CRITICAL LINK: Use the ID from Step 1
        product_id: finalProductId,
      };

      if (isEditing) {
        // Editing existing variant
        const { error: vUpdateError } = await supabase
          .from("variants")
          .update(variantPayload)
          .eq("variant_id", item!.id);

        if (vUpdateError) {
          throw new Error(`Failed to update variant: ${vUpdateError.message}`);
        }
      } else {
        // Creating new variant
        const { error: vInsertError } = await supabase.from("variants").insert([variantPayload]);

        if (vInsertError) {
          // If variant insert fails, attempt to delete the product if it was just created
          if (productInsertError === null) {
            await supabase.from("products").delete().eq("product_id", finalProductId);
          }
          throw new Error(`Failed to create variant: ${vInsertError.message}`);
        }
      }

      // 3. Handle Bulk Price Update if confirmed
      if (isEditing && applyToAll) {
        const { error: bulkError } = await supabase
          .from("variants")
          .update({
            selling_price: variantData.selling_price,
            cost: variantData.cost,
          })
          .eq("product_id", finalProductId);

        if (bulkError) {
          toast.error(`Warning: Failed to bulk update other variants: ${bulkError.message}`);
        }
      }

      toast.success(isEditing ? "Product variant updated successfully." : "New product variant added successfully.");

      // Close the dialog and refresh inventory data
      onOpenChange(false);
      onSave();
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message || "An unexpected error occurred during save.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfirmation = (applyToAll: boolean) => {
    setShowUpdateConfirmation(false);
    handleSave({ preventDefault: () => {} } as React.FormEvent, applyToAll);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Logic to check if a price was changed (only for editing existing items)
    const priceChanged =
      isEditing && (priceData.selling_price !== variantData.selling_price || priceData.cost !== variantData.cost);

    if (isEditing && priceChanged) {
      setShowUpdateConfirmation(true);
    } else {
      handleSave(e, false);
    }
  };

  if (isLoadingAttributes) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <p>Loading attributes...</p>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Render logic ---
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Product Variant" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update details for the selected product variant."
                : "Enter details for the new product and its first variant."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* --- SECTION 1: CORE PRODUCT DETAILS (PRODUCTS TABLE) --- */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Product Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name*</Label>
                  <Input
                    id="name"
                    value={productData.name}
                    onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_number">Item Number*</Label>
                  <Input
                    id="item_number"
                    value={productData.item_number}
                    onChange={(e) => setProductData({ ...productData, item_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={productData.description}
                    onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* --- SECTION 2: ATTRIBUTES (PRODUCTS TABLE FOREIGN KEYS) --- */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Product Attributes (Lookup IDs)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Brand</Label>
                  <Select
                    value={productData.brand_id}
                    onValueChange={(v) => setProductData({ ...productData, brand_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.brands || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select
                    value={productData.category_id}
                    onValueChange={(v) => setProductData({ ...productData, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.categories || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender_id">Gender</Label>
                  <Select
                    value={productData.gender_id}
                    onValueChange={(v) => setProductData({ ...productData, gender_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.genders || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origin */}
                <div className="space-y-2">
                  <Label htmlFor="origin_id">Origin</Label>
                  <Select
                    value={productData.origin_id}
                    onValueChange={(v) => setProductData({ ...productData, origin_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.origins || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* --- SECTION 3: VARIANT DETAILS (VARIANTS TABLE) --- */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Variant Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU*</Label>
                  <Input
                    id="sku"
                    value={variantData.sku}
                    onChange={(e) => setVariantData({ ...variantData, sku: e.target.value })}
                    required
                  />
                </div>

                {/* Season */}
                <div className="space-y-2">
                  <Label htmlFor="season">Season</Label>
                  <Select
                    value={variantData.season}
                    onValueChange={(v) => setVariantData({ ...variantData, season: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Season" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.seasons || []).map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select value={variantData.color} onValueChange={(v) => setVariantData({ ...variantData, color: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.colors || []).map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Select value={variantData.size} onValueChange={(v) => setVariantData({ ...variantData, size: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.sizes || []).map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* --- SECTION 4: FINANCIAL & SUPPLIER (VARIANTS TABLE) --- */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Pricing & Sourcing</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <Select
                    value={variantData.supplier_id}
                    onValueChange={(v) => setVariantData({ ...variantData, supplier_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {(attributes?.suppliers || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)*</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={variantData.cost === null ? "" : variantData.cost}
                    onChange={(e) => setVariantData({ ...variantData, cost: Number(e.target.value) || null })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price ($)*</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={variantData.selling_price === null ? "" : variantData.selling_price}
                    onChange={(e) => setVariantData({ ...variantData, selling_price: Number(e.target.value) || null })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    value={variantData.tax_rate === null ? "" : variantData.tax_rate}
                    onChange={(e) => setVariantData({ ...variantData, tax_rate: Number(e.target.value) || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wholesale_price">Wholesale Price ($)</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    value={productData.wholesale_price === null ? "" : productData.wholesale_price}
                    onChange={(e) =>
                      setProductData({ ...productData, wholesale_price: Number(e.target.value) || null })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Update Product" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>

          {/* Price History Button (Only for existing items) */}
          {item && (
            <div className="absolute top-4 right-4">
              <Button variant="ghost" size="icon" onClick={() => setPriceHistoryOpen(true)}>
                <History className="w-5 h-5" />
              </Button>
            </div>
          )}
        </DialogContent>

        {item && (
          <PriceHistoryDialog
            open={priceHistoryOpen}
            onOpenChange={setPriceHistoryOpen}
            itemId={item.id}
            itemName={item.name}
          />
        )}
      </Dialog>

      {/* Update Confirmation Dialog */}
      <UpdateConfirmationDialog
        open={showUpdateConfirmation}
        onOpenChange={setShowUpdateConfirmation}
        onConfirm={handleUpdateConfirmation}
        itemName={item?.name || ""}
        itemNumber={item?.item_number}
      />
    </>
  );
};

export default ProductDialogNew;
