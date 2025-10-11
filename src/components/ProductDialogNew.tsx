import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Item, PriceLevel } from "@/types/database";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProductDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  onSave: () => void;
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
  });

  const [priceData, setPriceData] = useState({
    cost_price: 0,
    selling_price: 0,
    wholesale_price: 0,
  });

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
      });
      setPriceData({
        cost_price: 0,
        selling_price: 0,
        wholesale_price: 0,
      });
    }
  }, [item, open]);

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
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Shoes, Clothing, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier || ""}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={formData.size || ""}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color || ""}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender || ""}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men">Men</SelectItem>
                  <SelectItem value="Women">Women</SelectItem>
                  <SelectItem value="Unisex">Unisex</SelectItem>
                  <SelectItem value="Kids">Kids</SelectItem>
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
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                  <SelectItem value="All Season">All Season</SelectItem>
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
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="pair">Pair</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Storage Location</Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Shelf A1, Warehouse B"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Pricing Information</h3>
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
    </Dialog>
  );
};

export default ProductDialogNew;
