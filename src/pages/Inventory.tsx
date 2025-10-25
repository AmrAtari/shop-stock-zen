import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
interface Attribute {
  id: string;
  name: string;
  label?: string;
  icon?: string;
  table_name?: string;
  created_at?: string;
}

interface Item {
  id?: string;
  name: string;
  sku?: string;
  category: string;
  [key: string]: any; // for dynamic attributes
}

const Inventory: React.FC = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetchAttributes();
    fetchItems();
  }, []);

  // Fetch dynamic attributes
  const fetchAttributes = async () => {
    const { data, error } = await supabase.from("item_attributes").select("*");

    if (error) {
      toast.toast({ title: "Error fetching attributes", type: "error" });
      return;
    }

    // Type assertion to Attribute[]
    setAttributes(data as unknown as Attribute[]);
  };

  // Fetch inventory items
  const fetchItems = async () => {
    const { data, error } = await supabase.from("inventory").select("*");

    if (error) {
      toast.toast({ title: "Error fetching items", type: "error" });
      return;
    }

    // Type assertion to Item[]
    setItems(data as unknown as Item[]);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Inventory</h1>

      {/* Add New Item button */}
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={() => toast.toast({ title: "Add Item clicked" })}
      >
        Add New Item
      </button>

      {/* Items Table */}
      <table className="w-full border">
        <thead>
          <tr>
            {["Name", "SKU", "Category", ...attributes.map((a) => a.name)].map((col) => (
              <th key={col} className="border p-2 text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.category}</td>
              {attributes.map((attr) => (
                <td key={attr.id} className="border p-2">
                  {item[attr.name] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Inventory;
