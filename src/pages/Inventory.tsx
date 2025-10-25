// src/pages/Inventory.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface Attribute {
  id: string;
  name: string;
}

interface Item {
  id?: string;
  name: string;
  sku: string;
  category: string;
  [key: string]: any;
}

interface InventoryProps {
  user: User & { role: string }; // ensure role exists
}

const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const fetchAttributes = async () => {
    const { data, error } = await supabase.from("item_attributes").select("id, name");
    if (error) return toast({ title: "Error", description: error.message, type: "foreground" });
    setAttributes(data as Attribute[]);
  };

  const fetchItems = async () => {
    const { data, error } = await supabase.from("items").select("*");
    if (error) return toast({ title: "Error", description: error.message, type: "foreground" });
    setItems(data as Item[]);
  };

  useEffect(() => {
    fetchAttributes();
    fetchItems();
  }, []);

  const handleAddItem = async () => {
    setLoading(true);
    try {
      const itemToInsert: Item = {
        name: newItem.name || "",
        sku: newItem.sku || "",
        category: newItem.category || "",
        ...newItem,
      };
      const { error } = await supabase.from("items").insert([itemToInsert]);
      if (error) throw error;
      toast({ title: "Item added", type: "foreground" });
      setNewItem({});
      fetchItems();
    } catch (err: any) {
      toast({ title: "Error adding item", description: err.message, type: "foreground" });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (file: File) => {
    toast({ title: "Import feature not implemented yet", type: "foreground" });
  };

  const handleGoogleSheets = () => {
    toast({ title: "Google Sheets import not implemented yet", type: "foreground" });
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
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files && handleImportFile(e.target.files[0])}
            />
            <button onClick={handleGoogleSheets}>Import from Google Sheets</button>
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
