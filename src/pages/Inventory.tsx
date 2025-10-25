// src/pages/Inventory.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

// Types
interface Attribute {
  id: string;
  name: string;
}

interface Item {
  id?: string;
  name: string;
  sku: string;
  category: string;
  [key: string]: any; // dynamic attributes
}

interface InventoryProps {
  user: User;
}

const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Fetch attributes
  const fetchAttributes = async () => {
    const { data, error } = await supabase.from("item_attributes").select("id, name");
    if (error) {
      toast({ title: "Error fetching attributes", description: error.message, type: "foreground" });
      return;
    }
    setAttributes(data as Attribute[]);
  };

  // Fetch items
  const fetchItems = async () => {
    const { data, error } = await supabase.from("items").select("*");
    if (error) {
      toast({ title: "Error fetching items", description: error.message, type: "foreground" });
      return;
    }
    setItems(data as Item[]);
  };

  useEffect(() => {
    fetchAttributes();
    fetchItems();
  }, []);

  // Handle adding new item
  const handleAddItem = async () => {
    try {
      const itemToInsert: Item = {
        name: newItem["name"] || "",
        sku: newItem["sku"] || "",
        category: newItem["category"] || "",
        ...newItem,
      };
      const { error } = await supabase.from("items").insert([itemToInsert]);
      if (error) throw error;
      toast({ title: "Item added", type: "foreground" });
      setNewItem({});
      fetchItems();
    } catch (err: any) {
      toast({ title: "Error adding item", description: err.message, type: "foreground" });
    }
  };

  // Handle Excel/Google Sheets import
  const handleImport = async (file: File) => {
    // You can use libraries like xlsx to parse Excel
    toast({ title: "Import feature is not yet implemented", type: "foreground" });
  };

  return (
    <div className="inventory-page">
      <h1>Inventory</h1>

      {user.role === "admin" && (
        <div className="add-new-item">
          <h2>Add New Item</h2>
          {attributes.map((attr) => (
            <div key={attr.id}>
              <label>{attr.name}</label>
              <input
                type="text"
                value={newItem[attr.name] || ""}
                onChange={(e) => setNewItem({ ...newItem, [attr.name]: e.target.value })}
              />
            </div>
          ))}
          <button onClick={handleAddItem} disabled={loading}>
            Add Item
          </button>
          <div className="import-buttons">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => e.target.files && handleImport(e.target.files[0])}
            />
            <button onClick={() => toast({ title: "Google Sheets import not implemented", type: "foreground" })}>
              Import from Google Sheets
            </button>
          </div>
        </div>
      )}

      <div className="item-list">
        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              {attributes.map((attr) => (
                <th key={attr.id}>{attr.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.category}</td>
                {attributes.map((attr) => (
                  <td key={attr.id}>{item[attr.name] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
