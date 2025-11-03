import React from "react";
import { ProductDialogNewProps } from "@/types";

export const ProductDialogNew: React.FC<ProductDialogNewProps> = ({ open, onOpenChange, editingItem }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white p-4 rounded w-96">
        <h2 className="text-lg font-bold">{editingItem ? "Edit Product" : "New Product"}</h2>
        <p>Name: {editingItem?.name || ""}</p>
        <p>SKU: {editingItem?.sku || ""}</p>
        <p>Category: {editingItem?.category || ""}</p>
        <p>Quantity: {editingItem?.quantity || 0}</p>
        <p>Price: {editingItem?.price || 0}</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    </div>
  );
};
