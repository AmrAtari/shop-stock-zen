// File: src/components/ProductDialogNew.tsx
import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ItemWithDetails {
  sku: string;
  name: string;
  supplier: string;
  main_group: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
}

interface ProductDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: ItemWithDetails;
}

const ProductDialogNew: React.FC<ProductDialogNewProps> = ({ open, onOpenChange, editingItem }) => {
  if (!editingItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">Edit Item</h2>
        <p>SKU: {editingItem.sku}</p>
        <p>Name: {editingItem.name}</p>
        <p>Supplier: {editingItem.supplier}</p>
        <p>Main Group: {editingItem.main_group}</p>
        <p>Category: {editingItem.category}</p>
        <p>Price: {editingItem.price}</p>
        <p>Cost: {editingItem.cost}</p>
        <p>Quantity: {editingItem.quantity}</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ProductDialogNew;
