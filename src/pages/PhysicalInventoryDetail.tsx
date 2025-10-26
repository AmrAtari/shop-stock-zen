import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PhysicalInventoryCount, PhysicalInventorySession } from "@/types/inventory";

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [counts, setCounts] = useState<PhysicalInventoryCount[]>([]);
  const [session, setSession] = useState<PhysicalInventorySession | null>(null);

  // Fetch session info
  const fetchSession = async () => {
    try {
      // NOTE: Assuming PhysicalInventorySession type now includes store_id
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select("id, store_id, session_number, created_at, stores(name)")
        .eq("id", id)
        .single();

      if (error) throw error;

      setSession({
        id: data.id,
        store_id: data.store_id,
        store_name: data.stores?.name || "",
        session_number: data.session_number,
        created_at: data.created_at,
      });
    } catch (err: any) {
      console.error("Error fetching session:", err.message);
    }
  };

  // Fetch all items for this session (multi-store aware)
  const fetchCounts = async () => {
    if (!session || !session.id || !session.store_id) return;

    try {
      // 1. Check for existing counts for this session
      const { data: existingCounts, error: existingError } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", session.id)
        .order("sku");

      if (existingError) throw existingError;

      if (existingCounts && existingCounts.length > 0) {
        // If counts exist, use them directly (they already include variance, status, etc.)
        // NOTE: We trust the database data matches the PhysicalInventoryCount type structure
        setCounts(existingCounts as PhysicalInventoryCount[]);
        console.log(`Loaded ${existingCounts.length} existing counts for session ${session.session_number}`);
        return;
      }

      // 2. If no existing counts found (i.e., it's a brand new session being viewed),
      //    fetch all store inventory to populate the list for the first time.
      console.log(`No existing counts found. Populating from store inventory for store ${session.store_id}`);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("store_inventory")
        .select("item_id, sku, quantity, items(name)")
        .eq("store_id", session.store_id);

      if (inventoryError) throw inventoryError;

      const countsData: PhysicalInventoryCount[] = inventoryData.map((item: any) => ({
        session_id: session.id,
        item_id: item.item_id,
        sku: item.sku,
        item_name: item.items?.name || item.sku, // Get item name from 'items' table if joined
        system_quantity: item.quantity || 0,
        counted_quantity: 0,
        status: "pending",
        variance: 0,
        variance_percentage: 0,
      }));

      setCounts(countsData);
    } catch (err: any) {
      console.error("Error fetching inventory counts:", err.message);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (session) fetchCounts();
  }, [session]);

  const handleCountChange = (itemId: string, counted: number) => {
    const finalCount = Math.max(0, counted); // ensure count is not negative

    setCounts((prev) =>
      prev.map((c) =>
        c.item_id === itemId
          ? {
              ...c,
              counted_quantity: finalCount,
              variance: finalCount - c.system_quantity,
              variance_percentage: c.system_quantity ? ((finalCount - c.system_quantity) / c.system_quantity) * 100 : 0,
              // Update status if counted quantity is set
              status: finalCount > 0 ? "counted" : "pending",
            }
          : c,
      ),
    );
  };

  const saveCounts = async () => {
    // Only save items that have been fetched from the database (i.e., have a session_id)
    const countsToSave = counts
      .filter((c) => c.session_id) // Ensure we only try to save valid records
      .map((c) => ({
        session_id: c.session_id,
        item_id: c.item_id,
        sku: c.sku,
        item_name: c.item_name,
        system_quantity: c.system_quantity,
        counted_quantity: c.counted_quantity,
        // Status should reflect the current count state
        status: c.counted_quantity > 0 ? "counted" : "pending",
        variance: c.variance,
        variance_percentage: c.variance_percentage,
      }));

    if (countsToSave.length === 0) {
      console.log("No counts to save.");
      return;
    }

    try {
      // Use upsert to insert new records or update existing ones based on primary key/unique constraint
      const { error } = await supabase.from("physical_inventory_counts").upsert(countsToSave);
      if (error) throw error;

      console.log("Counts saved successfully");
      // Optional: Refresh counts from DB to ensure local state is synchronized
      fetchCounts();
    } catch (err: any) {
      console.error("Error saving counts:", err.message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        Physical Inventory - {session?.store_name} ({session?.session_number})
      </h1>

      {/* Table Structure - Improved Headers based on the image */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">SKU</th>
            <th className="border p-2 text-left">Item Name</th>
            <th className="border p-2 text-right">System Qty</th>
            <th className="border p-2 text-right">Counted Qty</th>
            <th className="border p-2 text-right">Variance</th>
            <th className="border p-2 text-right">Variance %</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((item) => (
            <tr key={item.item_id}>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.item_name}</td>
              <td className="border p-2 text-right">{item.system_quantity}</td>
              <td className="border p-2 text-right">
                <input
                  type="number"
                  min="0"
                  value={item.counted_quantity}
                  onChange={(e) => handleCountChange(item.item_id, Number(e.target.value))}
                  className="border p-1 w-24 text-right"
                />
              </td>
              <td className={`border p-2 text-right ${item.variance !== 0 ? "font-semibold" : ""}`}>{item.variance}</td>
              <td className={`border p-2 text-right ${item.variance_percentage !== 0 ? "font-semibold" : ""}`}>
                {item.variance_percentage.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={saveCounts} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Save Counts
      </button>

      {counts.length === 0 && <p className="mt-4 text-gray-500">Loading items or no inventory found for this store.</p>}
    </div>
  );
};

export default PhysicalInventoryDetail;
