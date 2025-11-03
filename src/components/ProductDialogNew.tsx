import React, { useState, useEffect } from "react";
import { ProductDialogNewProps, ItemWithDetails } from "@/types";

export const ProductDialogNew: React.FC<ProductDialogNewProps> = ({ open, onOpenChange, editingItem }) => {
  const [item, setItem] = useState<ItemWithDetails | null>(null);

  useEffect(() => {
    if (editingItem) setItem(editingItem);
    else setItem(null);
  }, [editingItem]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2>{editingItem ? "Edit Product" : "New Product"}</h2>
        <input
          type="text"
          placeholder="Name"
          value={item?.name || ""}
          onChange={(e) => setItem({ ...item!, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quantity"
          value={item?.quantity || 0}
          onChange={(e) => setItem({ ...item!, quantity: Number(e.target.value) })}
        />
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    </div>
  );
};
