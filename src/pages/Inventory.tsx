import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

const Inventory: React.FC = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Fetch dynamic attributes from database
  const fetchAttributes = async () => {
    const { data, error } = await supabase.from("item_attributes").select("id, name");

    if (error) {
      toast({ title: "Error", description: error.message, type: "foreground" });
      return;
    }

    if (data) setAttributes(data as Attribute[]);
  };

  // Fetch all items
  const fetchItems = async () => {
    const { data, error } = await supabase.from("items").select("*");

    if (error) {
      toast({ title: "Error", description: error.message, type: "foreground" });
      return;
    }

    if (data) setItems(data as Item[]);
  };

  useEffect(() => {
    fetchAttributes();
    fetchItems();
  }, []);

  // Add a new item
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

      toast({ title: "Item added successfully", type: "foreground" });
      setNewItem({});
      fetchItems();
    } catch (err: any) {
      toast({ title: "Error adding item", description: err.message, type: "foreground" });
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for Excel/CSV import
  const handleImportFile = (file: File) => {
    toast({ title: "Import feature not implemented yet", type: "foreground" });
  };

  // Placeholder for Google Sheets import
  const handleGoogleSheets = () => {
    toast({ title: "Google Sheets import not implemented yet", type: "foreground" });
  };

  return (
    <div className="inventory-page p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>

      {/* Add New Item Section */}
      <div className="add-new-item mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Add New Item</h2>

        {attributes.map((attr) => (
          <div key={attr.id} className="mb-2">
            <label className="block font-medium">{attr.name}</label>
            <input
              type="text"
              value={newItem[attr.name] || ""}
              onChange={(e) => setNewItem({ ...newItem, [attr.name]: e.target.value })}
              className="border rounded p-1 w-full"
            />
          </div>
        ))}

        <button
          onClick={handleAddItem}
          disabled={loading}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? "Adding..." : "Add Item"}
        </button>

        <div className="import-buttons mt-4 flex gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files && handleImportFile(e.target.files[0])}
          />
          <button onClick={handleGoogleSheets} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Import from Google Sheets
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="item-list">
        <h2 className="text-xl font-semibold mb-2">All Items</h2>
        <table className="table-auto border-collapse border border-gray-300 w-full">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">SKU</th>
              <th className="border px-2 py-1">Category</th>
              {attributes.map((attr) => (
                <th key={attr.id} className="border px-2 py-1">
                  {attr.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border px-2 py-1">{item.name}</td>
                <td className="border px-2 py-1">{item.sku}</td>
                <td className="border px-2 py-1">{item.category}</td>
                {attributes.map((attr) => (
                  <td key={attr.id} className="border px-2 py-1">
                    {item[attr.name] || "-"}
                  </td>
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
