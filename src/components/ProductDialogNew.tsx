import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Item, PriceLevel } from "@/types/database";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { History } from "lucide-react";
import PriceHistoryDialog from "./PriceHistoryDialog";

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

const ProductDialogNew = ({ open, onOpenChange, item, onSave }: ProductDialogNewProps) => {
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
        themes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (item) {
        // Update existing item
        const updateData: any = { ...formData };
        const { error: itemError } = await supabase
          .from("items")
          .update(updateData)
          .eq("id", item.id);

        if (itemError) throw itemError;

        // Check if price changed
        const { data: currentPrice } = await supabase
          .from("price_levels")
          .select("*")
          .eq("item_id", item.id)
          .eq("is_current", true)
          .single();

        if (
          !currentPrice ||
          Number(currentPrice.cost_price) !== priceData.cost_price ||
          Number(currentPrice.selling_price) !== priceData.selling_price ||
          Number(currentPrice.wholesale_price || 0) !== priceData.wholesale_price
        ) {
          // Mark old price as not current
          if (currentPrice) {
            await supabase
              .from("price_levels")
              .update({ is_current: false })
              .eq("item_id", item.id);
          }

          // Create new price level
          await supabase.from("price_levels").insert({
            item_id: item.id,
            ...priceData,
            is_current: true,
          });
        }

        toast.success("Product updated successfully");
      } else {
        // Create new item
        const insertData: any = { ...formData };
        const { data: newItem, error: itemError } = await supabase
          .from("items")
          .insert(insertData)
          .select()
          .single();

        if (itemError) throw itemError;

        // Create initial price level
        await supabase.from("price_levels").insert({
          item_id: newItem.id,
          ...priceData,
          is_current: true,
        });

        toast.success("Product added successfully");
      }

      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {item ? "Update product information and pricing" : "Add a new product to your inventory"}
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
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPriceHistoryOpen(true)}
                >
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
  );
};

export default ProductDialogNew;
