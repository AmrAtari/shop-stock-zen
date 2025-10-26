import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface InventorySessionDetail {
  id: string;
  session_number: string;
  store_name: string;
  status: "Draft" | "Counting" | "Completed";
  created_at: string;
  responsible_person: string;
  stores?: { name: string }[];
  items?: {
    id: string;
    name: string;
    sku?: string;
    counted_qty?: number;
    system_qty?: number;
  }[];
}

export default function PhysicalInventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<InventorySessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select(
          `
          id,
          session_number,
          status,
          created_at,
          responsible_person,
          stores ( name ),
          physical_inventory_items (
            id,
            name,
            sku,
            counted_qty,
            system_qty
          )
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      const formattedSession: InventorySessionDetail = {
        id: data.id,
        session_number: data.session_number,
        store_name: Array.isArray(data.stores) ? data.stores[0]?.name || "N/A" : data.stores?.name || "N/A", // ✅ Fix
        status: data.status,
        created_at: data.created_at,
        responsible_person: data.responsible_person,
        items: data.physical_inventory_items || [],
      };

      setSession(formattedSession);
    } catch (error) {
      console.error("Error fetching session details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSession();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
        Loading session details...
      </div>
    );
  }

  if (!session) {
    return <div className="text-center text-gray-500 py-10">Session not found.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Session #{session.session_number}</h1>
      <p className="text-gray-600 mb-2">Store: {session.store_name}</p>
      <p className="text-gray-600 mb-2">Responsible: {session.responsible_person}</p>
      <p className="text-gray-600 mb-4">
        Status:{" "}
        <span
          className={
            session.status === "Completed"
              ? "text-green-600"
              : session.status === "Counting"
                ? "text-blue-600"
                : "text-gray-600"
          }
        >
          {session.status}
        </span>
      </p>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Items</h2>
        {session.items && session.items.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">SKU</th>
                <th className="py-2">Name</th>
                <th className="py-2">System Qty</th>
                <th className="py-2">Counted Qty</th>
              </tr>
            </thead>
            <tbody>
              {session.items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{item.sku || "—"}</td>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2">{item.system_qty ?? "—"}</td>
                  <td className="py-2">{item.counted_qty ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No items in this session.</p>
        )}
      </Card>
    </div>
  );
}
