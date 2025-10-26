import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhysicalInventoryCount, PhysicalInventorySession } from "@/types/inventory";
import { toast } from "@/components/ui/toaster";

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [counts, setCounts] = useState<PhysicalInventoryCount[]>([]);
  const [session, setSession] = useState<PhysicalInventorySession | null>(null);

  // Fetch session info
  const fetchSession = async () => {
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
  };

  // Fetch all items for this session (multi-store aware)
  const fetchCounts = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("store_inventory")
      .select("id, item_id, sku, quantity, stores(name)")
      .eq("store_id", session.store_id);

    if (error) throw error;

    const countsData: PhysicalInventoryCount[] = data.map((item: any) => ({
      session_id: session.id,
      item_id: item.item_id,
      sku: item.sku,
      item_name: item.stores?.name || "",
      system_quantity: item.quantity || 0,
      counted_quantity: 0,
      status: "pending",
      variance: 0,
      variance_percentage: 0,
    }));

    setCounts(countsData);
  };

  useEffect(() => {
    fetchSession().catch((err) => toast({ title: "Error fetching session", description: err.message }));
  }, [id]);

  useEffect(() => {
    if (session) {
      fetchCounts().catch((err) => toast({ title: "Error fetching items", description: err.message }));
    }
  }, [session]);

  const handleCountChange = (itemId: string, counted: number) => {
    setCounts((prev) =>
      prev.map((c) =>
        c.item_id === itemId
          ? {
              ...c,
              counted_quantity: counted,
              variance: counted - c.system_quantity,
              variance_percentage: c.system_quantity ? ((counted - c.system_quantity) / c.system_quantity) * 100 : 0,
            }
          : c,
      ),
    );
  };

  const saveCounts = async () => {
    const insertData = counts.map((c) => ({
      session_id: c.session_id,
      item_id: c.item_id,
      sku: c.sku,
      item_name: c.item_name,
      system_quantity: c.system_quantity,
      counted_quantity: c.counted_quantity,
      status: c.status,
      variance: c.variance,
      variance_percentage: c.variance_percentage,
    }));

    const { error } = await supabase.from("physical_inventory_counts").upsert(insertData);

    if (error) {
      toast({ title: "Error saving counts", description: error.message });
    } else {
      toast({ title: "Counts saved successfully" });
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        Physical Inventory - {session?.store_name} ({session?.session_number})
      </h1>

      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2">System Qty</th>
            <th className="border p-2">Counted Qty</th>
            <th className="border p-2">Variance</th>
            <th className="border p-2">Variance %</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((item) => (
            <tr key={item.item_id}>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.item_name}</td>
              <td className="border p-2">{item.system_quantity}</td>
              <td className="border p-2">
                <input
                  type="number"
                  value={item.counted_quantity}
                  onChange={(e) => handleCountChange(item.item_id, Number(e.target.value))}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border p-2">{item.variance}</td>
              <td className="border p-2">{item.variance_percentage.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={saveCounts} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        Save Counts
      </button>
    </div>
  );
};

export default PhysicalInventoryDetail;
