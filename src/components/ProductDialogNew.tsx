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
import { queryKeys } from "@/hooks/queryKeys";

interface ProductDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  onSave: () => void;
}

interface Attributes {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  sizes: { id: string; name: string }[];
  colors: { id: string; name: string }[];
  genders: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  units: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  main_groups: { id: string; name: string }[];
  origins: { id: string; name: string }[];
  themes: { id: string; name: string }[];
}

// Confirmation Dialog Component
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
          <DialogTitle>Update Scope</DialogTitle>
          <DialogDescription>
            How would you like to apply the changes to <strong>{itemName}</strong>?
            {itemNumber && (
              <div className="mt-2 text-sm">
                This item belongs to model number: <strong>{itemNumber}</strong>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Apply to all related SKUs</h4>
            <p className="text-sm text-blue-700">
              Update all products with the same model number. This ensures consistency across all variants (sizes,
              colors, etc.).
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">Apply only to this SKU</h4>
            <p className="text-sm text-gray-700">
              Update only this specific product. Other variants with the same model number will remain unchanged.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onConfirm(false)}>
            Only This SKU
          </Button>
          <Button onClick={() => onConfirm(true)}>All Related SKUs</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProductDialogNew = ({ open, onOpenChange, item, onSave }: ProductDialogNewProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Item>>({
    name: "",
    sku: "",
    category: "",
    brand: "",
    size: "",
    color: "",
    gender: "",
    season: "",
    quantity: 0,
    min_stock: 0,
    unit: "pcs",
    supplier: "",
    location: "",
    department: "",
    main_group: "",
    origin: "",
    theme: "",
  });

  const [attributes, setAttributes] = useState<Attributes>({
    categories: [],
    brands: [],
    sizes: [],
    colors: [],
    genders: [],
    seasons: [],
    suppliers: [],
    locations: [],
    units: [],
    departments: [],
    main_groups: [],
    origins: [],
    themes: [],
  });

  const [priceData, setPriceData] = useState({
    cost_price: 0,
    selling_price: 0,
    wholesale_price: 0,
  });

  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchAttributes();
    }
  }, [open]);

  useEffect(() => {
    if (item) {
      setFormData(item);
      fetchCurrentPrice(item.id);
    } else {
      setFormData({
        name: "",
        sku: "",
        category: "",
        brand: "",
        size: "",
        color: "",
        gender: "",
        season: "",
        quantity: 0,
        min_stock: 0,
        unit: "pcs",
        supplier: "",
        location: "",
        department: "",
        main_group: "",
        origin: "",
        theme: "",
      });
      setPriceData({
        cost_price: 0,
        selling_price: 0,
        wholesale_price: 0,
      });
    }
  }, [item, open]);

  const fetchAttributes = async () => {
    try {
      const [
        categories,
        brands,
        sizes,
        colors,
        genders,
        seasons,
        suppliers,
        locations,
        units,
        departments,
        main_groups,
        origins,
        themes,
      ] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("brands").select("*").order("name"),
        supabase.from("sizes").select("*").order("name"),
        supabase.from("colors").select("*").order("name"),
        supabase.from("genders").select("*").order("name"),
        supabase.from("seasons").select("*").order("name"),
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("locations").select("*").order("name"),
        supabase.from("units").select("*").order("name"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("main_groups").select("*").order("name"),
        supabase.from("origins").select("*").order("name"),
        supabase.from("themes").select("*").order("name"),
      ]);

      setAttributes({
        categories: categories.data || [],
        brands: brands.data || [],
        sizes: sizes.data || [],
        colors: colors.data || [],
        genders: genders.data || [],
        seasons: seasons.data || [],
        suppliers: suppliers.data || [],
        locations: locations.data || [],
        units: units.data || [],
        departments: departments.data || [],
        main_groups: main_groups.data || [],
        origins: origins.data || [],
        themes: themes.data || [],
      });
    } catch (error) {
      console.error("Error fetching attributes:", error);
    }
  };

  const fetchCurrentPrice = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from("price_levels")
        .select("*")
        .eq("item_id", itemId)
        .eq("is_current", true)
        .single();

      if (error) throw error;
      if (data) {
        setPriceData({
          cost_price: Number(data.cost_price),
          selling_price: Number(data.selling_price),
          wholesale_price: Number(data.wholesale_price) || 0,
        });
      }
    } catch (error) {
      // No current price found, that's okay for new items
    }
  };

  /**
   * Check if any shared fields have been modified
   */
  const hasSharedFieldsChanged = (originalItem: Item, newFormData: Partial<Item>, sharedFields: string[]): boolean => {
    return sharedFields.some((field) => {
      const originalValue = originalItem[field as keyof Item];
      const newValue = newFormData[field as keyof Item];
      return originalValue !== newValue;
    });
  };

  /**
   * Update all related SKUs with the same item_number
   */
  const updateRelatedSKUs = async (itemNumber: string, updateData: any, sharedFields: string[]) => {
    try {
      // Filter update data to only include shared fields
      const sharedUpdateData: any = {};
      sharedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          sharedUpdateData[field] = updateData[field];
        }
      });

      // If no shared fields to update, return early
      if (Object.keys(sharedUpdateData).length === 0) {
        return;
      }

      // Update all items with the same item_number (excluding variant-specific fields)
      const { error: bulkUpdateError } = await supabase
        .from("items")
        .update(sharedUpdateData)
        .eq("item_number", itemNumber);

      if (bulkUpdateError) throw bulkUpdateError;

      // Get the count of updated items
      const { count: updatedCount } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("item_number", itemNumber);

      toast.success(`Updated ${Object.keys(sharedUpdateData).length} field(s) across ${updatedCount} related SKUs`);
    } catch (error: any) {
      console.error("Error updating related SKUs:", error);
      toast.error("Failed to update related SKUs: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (item) {
        // Determine which fields should be propagated to related SKUs
        const sharedFields = [
          "name",
          "category",
          "brand",
          "department",
          "supplier",
          "season",
          "main_group",
          "origin",
          "theme",
          "min_stock",
          "unit",
        ];

        const updateData: any = { ...formData };

        // Check if this item has an item_number and shared fields were modified
        if (item.item_number && hasSharedFieldsChanged(item, formData, sharedFields)) {
          // Show confirmation dialog instead of automatically updating
          setPendingUpdateData({ updateData, sharedFields });
          setShowUpdateConfirmation(true);
          return;
        } else {
          // No shared fields changed or no item_number, proceed with normal update
          await performItemUpdate(item.id, updateData, false);
        }
      } else {
        // Create new item
        const insertData: any = { ...formData };
        const { data: newItem, error: itemError } = await supabase.from("items").insert(insertData).select().single();

        if (itemError) throw itemError;

        // Create initial price level
        await supabase.from("price_levels").insert({
          item_id: newItem.id,
          ...priceData,
          is_current: true,
        });

        toast.success("Product added successfully");

        // Invalidate all related queries
        await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.categoryDistribution });
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.lowStock });

        onSave();
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    }
  };

  const handleUpdateConfirmation = async (applyToAll: boolean) => {
    if (!item || !pendingUpdateData) return;

    try {
      await performItemUpdate(item.id, pendingUpdateData.updateData, applyToAll);
      setShowUpdateConfirmation(false);
      setPendingUpdateData(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    }
  };

  const performItemUpdate = async (itemId: string, updateData: any, applyToAll: boolean) => {
    // Update the current item
    const { error: itemError } = await supabase.from("items").update(updateData).eq("id", itemId);

    if (itemError) throw itemError;

    // If user chose to apply to all related SKUs
    if (applyToAll && item?.item_number) {
      const sharedFields = [
        "name",
        "category",
        "brand",
        "department",
        "supplier",
        "season",
        "main_group",
        "origin",
        "theme",
        "min_stock",
        "unit",
      ];
      await updateRelatedSKUs(item.item_number, updateData, sharedFields);
    }

    // Handle price updates
    const { data: currentPrice } = await supabase
      .from("price_levels")
      .select("*")
      .eq("item_id", itemId)
      .eq("is_current", true)
      .single();

    if (
      !currentPrice ||
      Number(currentPrice.cost_price) !== priceData.cost_price ||
      Number(currentPrice.selling_price) !== priceData.selling_price ||
      Number(currentPrice.wholesale_price || 0) !== priceData.wholesale_price
    ) {
      if (currentPrice) {
        await supabase.from("price_levels").update({ is_current: false }).eq("item_id", itemId);
      }

      await supabase.from("price_levels").insert({
        item_id: itemId,
        ...priceData,
        is_current: true,
      });
    }

    toast.success(applyToAll ? "Product and all related SKUs updated successfully" : "Product updated successfully");

    // Invalidate all related queries
    await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.categoryDistribution });
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.lowStock });

    onSave();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{item ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {item ? "Update product information and pricing" : "Add a new product to your inventory"}
              {item?.item_number && (
                <div className="mt-2 text-sm text-blue-600">
                  This item is part of a product group (Model: {item.item_number}). Changes to shared fields can be
                  applied to all related SKUs.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department || ""}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="main_group">Main Group</Label>
                <Select
                  value={formData.main_group || ""}
                  onValueChange={(value) => setFormData({ ...formData, main_group: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select main group" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.main_groups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={formData.brand || ""}
                  onValueChange={(value) => setFormData({ ...formData, brand: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Select
                  value={formData.origin || ""}
                  onValueChange={(value) => setFormData({ ...formData, origin: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.origins.map((origin) => (
                      <SelectItem key={origin.id} value={origin.name}>
                        {origin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={formData.theme || ""}
                  onValueChange={(value) => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.themes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.name}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={formData.supplier || ""}
                  onValueChange={(value) => setFormData({ ...formData, supplier: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size || ""}
                  onValueChange={(value) => setFormData({ ...formData, size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.sizes.map((size) => (
                      <SelectItem key={size.id} value={size.name}>
                        {size.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color || ""}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.colors.map((color) => (
                      <SelectItem key={color.id} value={color.name}>
                        {color.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.genders.map((gender) => (
                      <SelectItem key={gender.id} value={gender.name}>
                        {gender.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Select
                  value={formData.season || ""}
                  onValueChange={(value) => setFormData({ ...formData, season: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.seasons.map((season) => (
                      <SelectItem key={season.id} value={season.name}>
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Current Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">Minimum Stock Level *</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Storage Location</Label>
              <Select
                value={formData.location || ""}
                onValueChange={(value) => setFormData({ ...formData, location: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {attributes.locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Pricing Information</h3>
                {item && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPriceHistoryOpen(true)}>
                    <History className="w-4 h-4 mr-2" />
                    View Price History
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price ($) *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={priceData.cost_price}
                    onChange={(e) => setPriceData({ ...priceData, cost_price: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price ($) *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={priceData.selling_price}
                    onChange={(e) => setPriceData({ ...priceData, selling_price: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wholesale_price">Wholesale Price ($)</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    value={priceData.wholesale_price}
                    onChange={(e) => setPriceData({ ...priceData, wholesale_price: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{item ? "Update Product" : "Add Product"}</Button>
            </DialogFooter>
          </form>
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
