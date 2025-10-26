import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, Save, FileDown } from "lucide-react";

interface PhysicalInventorySession {
  id: string;
  store_id: string;
  store_name: string;
  session_number: string;
  created_at: string;
  status: "draft" | "in_progress" | "completed";
}

interface LocalPhysicalInventoryCount {
  id?: string;
  session_id: string;
  item_id: string;
  sku: string;
  item_name: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  status: "pending" | "counted";
}

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PhysicalInventorySession | null>(null);
  const [counts, setCounts] = useState<LocalPhysicalInventoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select("id, store_id, session_number, created_at, status, stores(name)")
        .eq("id", id)
        .single();

      if (error) throw error;

      setSession({
        id: data.id,
        store_id: data.store_id,
        store_name: data.stores?.name || "N/A",
        session_number: data.session_number,
        created_at: data.created_at,
        status: data.status,
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load session details.");
    }
  };

  const fetchCounts = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const { data: existingCounts } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", session.id);

      if (existingCounts && existingCounts.length > 0) {
        setCounts(
          existingCounts.map((c: any) => ({
            ...c,
            status: c.counted_quantity > 0 ? "counted" : "pending",
          })),
        );
        return;
      }

      const { data: inventoryData } = await supabase
        .from("store_inventory")
        .select("item_id, quantity, items(name, sku)")
        .eq("store_id", session.store_id);

      const countsData: LocalPhysicalInventoryCount[] = inventoryData.map((item: any) => ({
        session_id: session.id,
        item_id: item.item_id,
        sku: item.items?.sku || item.item_id,
        item_name: item.items?.name || "N/A",
        system_quantity: item.quantity || 0,
        counted_quantity: 0,
        variance: 0,
        variance_percentage: 0,
        status: "pending",
      }));

      setCounts(countsData);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load counts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (session) fetchCounts();
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
              status: counted > 0 ? "counted" : "pending",
            }
          : c,
      ),
    );
  };

  const summary = useMemo(() => {
    const totalSystemQty = counts.reduce((sum, c) => sum + c.system_quantity, 0);
    const totalCountedQty = counts.reduce((sum, c) => sum + c.counted_quantity, 0);
    const totalVariance = totalCountedQty - totalSystemQty;
    const totalVariancePercentage = totalSystemQty ? (totalVariance / totalSystemQty) * 100 : 0;
    const countedItems = counts.filter((c) => c.counted_quantity !== 0).length;

    return {
      totalSystemQty,
      totalCountedQty,
      totalVariance,
      totalVariancePercentage,
      countedItems,
      totalItems: counts.length,
    };
  }, [counts]);

  const isCompleted = session?.status === "completed";

  if (isLoading) return <div className="p-4">Loading inventory counts...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">
        Physical Inventory - {session?.store_name} ({session?.session_number})
      </h1>

      <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg shadow-sm">
        <div className="text-center p-2 border-r">
          <div className="text-xl font-bold">{summary.totalItems}</div>
          <div className="text-sm text-muted-foreground">Items in Count List</div>
        </div>
        <div className="text-center p-2 border-r">
          <div className="text-xl font-bold">{summary.countedItems}</div>
          <div className="text-sm text-muted-foreground">Items Counted</div>
        </div>
        <div className="text-center p-2 border-r">
          <div
            className={`text-xl font-bold ${
              summary.totalVariance > 0
                ? "text-green-600"
                : summary.totalVariance < 0
                  ? "text-red-600"
                  : "text-gray-700"
            }`}
          >
            {summary.totalVariance > 0 ? "+" : ""}
            {summary.totalVariance}
          </div>
          <div className="text-sm text-muted-foreground">Total Variance (Units)</div>
        </div>
        <div className="text-center p-2">
          <div
            className={`text-xl font-bold ${
              Math.abs(summary.totalVariancePercentage) > 5 ? "text-red-600" : "text-gray-700"
            }`}
          >
            {summary.totalVariancePercentage.toFixed(2)}%
          </div>
          <div className="text-sm text-muted-foreground">Variance %</div>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">SKU</th>
            <th className="p-3 text-left">Item Name</th>
            <th className="p-3 text-right">System Qty</th>
            <th className="p-3 text-right">Counted Qty</th>
            <th className="p-3 text-right">Variance</th>
            <th className="p-3 text-right">Variance %</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((item) => (
            <tr key={item.item_id} className="border-t hover:bg-gray-50">
              <td className="p-3 font-mono text-sm">{item.sku}</td>
              <td className="p-3">{item.item_name}</td>
              <td className="p-3 text-right">{item.system_quantity}</td>
              <td className="p-3 text-right">
                <input
                  type="number"
                  min={0}
                  value={item.counted_quantity}
                  disabled={isCompleted}
                  onChange={(e) => handleCountChange(item.item_id, Number(e.target.value))}
                  className="border p-1 w-24 text-right"
                />
              </td>
              <td
                className={`p-3 text-right font-medium ${item.variance > 0 ? "text-green-600" : item.variance < 0 ? "text-red-600" : "text-gray-700"}`}
              >
                {item.variance}
              </td>
              <td
                className={`p-3 text-right ${Math.abs(item.variance_percentage) > 5 ? "font-bold text-red-600" : ""}`}
              >
                {item.variance_percentage.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PhysicalInventoryDetail;
