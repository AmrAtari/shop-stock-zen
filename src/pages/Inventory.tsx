import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attribute {
  id: string;
  name: string;
  label?: string;
  icon?: string;
  created_at?: string;
}

interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  [key: string]: any;
}

const Inventory: React.FC = () => {
  const toast = useToast();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttributes = async () => {
    const { data, error } = await supabase.from("item_attributes").select("*");

    if (error) {
      toast.toast({ title: "Error fetching attributes", type: "foreground" });
      return;
    }

    setAttributes(data || []);
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("inventory").select("*");
    setLoading(false);

    if (error) {
      toast.toast({ title: "Error fetching items", type: "foreground" });
      return;
    }

    setItems(data || []);
  };

  useEffect(() => {
    fetchAttributes();
    fetchItems();
  }, []);

  const handleAddNewItem = () => toast.toast({ title: "Add New Item clicked", type: "foreground" });

  const handleImport = () => toast.toast({ title: "Import clicked (Excel / Google Sheets)", type: "foreground" });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>
      <div className="flex gap-2 mb-4">
        <button onClick={handleAddNewItem} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add New Item
        </button>
        <button onClick={handleImport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Import (Excel / Google Sheets)
        </button>
      </div>

      {loading && <p>Loading...</p>}

      <table className="w-full table-auto border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">SKU</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Category</th>
            {attributes.map((attr) => (
              <th key={attr.id} className="border px-2 py-1">
                {attr.label || attr.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="border px-2 py-1">{item.id}</td>
              <td className="border px-2 py-1">{item.sku}</td>
              <td className="border px-2 py-1">{item.name}</td>
              <td className="border px-2 py-1">{item.category}</td>
              {attributes.map((attr) => (
                <td key={attr.id} className="border px-2 py-1">
                  {item[attr.name] ?? "-"}
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
