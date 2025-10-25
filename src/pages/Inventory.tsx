import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import XLSX from "xlsx";

// --- Types ---
interface Attribute {
  id: string;
  name: string;
}

interface Item {
  id: string;
  [key: string]: any;
}

interface User {
  id: string;
  role: string; // 'admin' | 'user'
}

const InventoryPage: React.FC<{ user: User }> = ({ user }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [showGoogleSheetModal, setShowGoogleSheetModal] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");

  // --- Fetch inventory and attributes ---
  const fetchInventory = async () => {
    const { data: attrs } = await supabase.from("item_attributes").select("*");
    setAttributes(attrs || []);

    const { data: itemsData } = await supabase.from("items").select("*");
    setItems(itemsData || []);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // --- Add Item ---
  const handleAddItem = async () => {
    const itemToInsert: Record<string, any> = {};
    attributes.forEach((attr) => {
      itemToInsert[attr.name] = newItem[attr.name] ?? "";
    });

    const { error } = await supabase.from("items").insert([itemToInsert]);
    if (error) toast({ title: "Error adding item", description: error.message, type: "error" });
    else {
      toast({ title: "Item added successfully", type: "success" });
      setShowAddModal(false);
      setNewItem({});
      fetchInventory();
    }
  };

  // --- Excel Import ---
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      jsonData = jsonData.map((row) => {
        const sanitized: Record<string, any> = {};
        attributes.forEach((attr) => {
          sanitized[attr.name] = row[attr.name] ?? "";
        });
        return sanitized;
      });

      const { error } = await supabase.from("items").insert(jsonData);
      if (error) toast({ title: "Error importing items", description: error.message, type: "error" });
      else {
        toast({ title: "Items imported successfully", type: "success" });
        fetchInventory();
      }
    } catch (err) {
      toast({ title: "Error reading file", description: (err as Error).message, type: "error" });
    }
  };

  // --- Google Sheets Import ---
  const handleGoogleSheetImport = async () => {
    try {
      const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) throw new Error("Invalid Google Sheet URL");

      const sheetId = sheetIdMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      const res = await fetch(csvUrl);
      const csvText = await res.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      jsonData = jsonData.map((row) => {
        const sanitized: Record<string, any> = {};
        attributes.forEach((attr) => {
          sanitized[attr.name] = row[attr.name] ?? "";
        });
        return sanitized;
      });

      const { error } = await supabase.from("items").insert(jsonData);
      if (error) toast({ title: "Error importing items", description: error.message, type: "error" });
      else {
        toast({ title: "Items imported from Google Sheets successfully", type: "success" });
        fetchInventory();
      }
    } catch (err) {
      toast({ title: "Error importing Google Sheet", description: (err as Error).message, type: "error" });
    } finally {
      setShowGoogleSheetModal(false);
      setGoogleSheetUrl("");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Inventory</h1>

      {/* --- Admin Buttons --- */}
      {user.role === "admin" && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded">
            Add New Item
          </button>

          <label className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer">
            Import Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
          </label>

          <button onClick={() => setShowGoogleSheetModal(true)} className="px-4 py-2 bg-orange-500 text-white rounded">
            Import Google Sheets
          </button>
        </div>
      )}

      {/* --- Items Table --- */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            {attributes.map((attr) => (
              <th key={attr.id} className="border p-2 text-left">
                {attr.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {attributes.map((attr) => (
                <td key={attr.id} className="border p-2">
                  {item[attr.name]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- Add Item Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded w-1/2">
            <h2 className="text-xl mb-4">Add New Item</h2>
            {attributes.map((attr) => (
              <div key={attr.id} className="mb-2">
                <label className="block mb-1">{attr.name}</label>
                <input
                  type="text"
                  className="border p-1 w-full"
                  value={newItem[attr.name] || ""}
                  onChange={(e) => setNewItem({ ...newItem, [attr.name]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                Cancel
              </button>
              <button onClick={handleAddItem} className="px-4 py-2 bg-blue-500 text-white rounded">
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Google Sheet Modal --- */}
      {showGoogleSheetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded w-1/2">
            <h2 className="text-xl mb-4">Import Google Sheet</h2>
            <input
              type="text"
              className="border p-2 w-full"
              placeholder="Paste Google Sheet URL"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowGoogleSheetModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                Cancel
              </button>
              <button onClick={handleGoogleSheetImport} className="px-4 py-2 bg-green-500 text-white rounded">
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
