import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown, CheckCircle, Save } from "lucide-react";

// --- TYPES ---
interface LocalPhysicalInventoryCount {
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

interface PhysicalInventorySessionWithStore {
  id: string;
  session_number: string;
  store_id: string;
  store_name: string;
  created_at: string;
  status: "draft" | "in_progress" | "completed";
}

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PhysicalInventorySessionWithStore | null>(null);
  const [counts, setCounts] = useState<LocalPhysicalInventoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // --- FETCH SESSION ---
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
        store_name: data.stores?.[0]?.name || "N/A", // FIX: Access first store
        session_number: data.session_number,
        created_at: data.created_at,
        status: data.status,
      });
    } catch (err: any) {
      console.error("Error fetching session:", err.message);
      toast.error("Failed to load session details.");
    }
  };

  // --- FETCH COUNTS ---
  const fetchCounts = async () => {
    if (!session) return;
    setIsLoading(true);

    try {
      const { data: existingCounts, error } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", session.id)
        .order("sku");

      if (error) throw error;

      if (existingCounts && existingCounts.length > 0) {
        setCounts(
          existingCounts.map((c: any) => ({
            ...c,
            status: c.counted_quantity > 0 ? "counted" : "pending",
          })),
        );
        return;
      }

      // Fetch all inventory if no counts exist
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("store_inventory")
        .select("item_id, quantity, items(name, sku)")
        .eq("store_id", session.store_id);

      if (inventoryError) throw inventoryError;

      setCounts(
        inventoryData.map((item: any) => ({
          session_id: session.id,
          item_id: item.item_id,
          sku: item.items?.sku || item.item_id,
          item_name: item.items?.name || "N/A",
          system_quantity: item.quantity || 0,
          counted_quantity: 0,
          variance: 0,
          variance_percentage: 0,
          status: "pending",
        })),
      );

      if (!inventoryData || inventoryData.length === 0) {
        toast.info("No inventory items found for this store.");
      }
    } catch (err: any) {
      console.error("Error fetching counts:", err.message);
      toast.error("Failed to load inventory counts.");
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

  // --- HANDLERS ---
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

  const saveCounts = async () => {
    try {
      const { error } = await supabase.from("physical_inventory_counts").upsert(counts);
      if (error) throw error;
      toast.success("Counts saved successfully.");
    } catch (err: any) {
      console.error("Error saving counts:", err.message);
      toast.error("Failed to save counts.");
    }
  };

  const submitInventoryChanges = async () => {
    if (!session || isFinalizing || session.status === "completed") return;

    if (!window.confirm("Finalize this count? This will update stock levels permanently.")) return;

    setIsFinalizing(true);

    try {
      await saveCounts();

      const updates = counts.filter((c) => c.status === "counted");

      await supabase.from("store_inventory").upsert(
        updates.map((c) => ({
          item_id: c.item_id,
          store_id: session.store_id,
          quantity: c.counted_quantity,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: ["item_id", "store_id"] },
      );

      await supabase
        .from("physical_inventory_sessions")
        .update({ status: "completed", finalized_at: new Date().toISOString() })
        .eq("id", session.id);

      toast.success("Inventory finalized!");
      await fetchSession();
    } catch (err: any) {
      console.error("Finalization error:", err.message);
      toast.error("Failed to finalize inventory.");
    } finally {
      setIsFinalizing(false);
    }
  };

  // --- SUMMARY ---
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

      {/* Summary */}
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
            className={`text-xl font-bold ${summary.totalVariance > 0 ? "text-green-600" : summary.totalVariance < 0 ? "text-red-600" : "text-gray-700"}`}
          >
            {summary.totalVariance > 0 ? "+" : ""}
            {summary.totalVariance}
          </div>
          <div className="text-sm text-muted-foreground">Total Variance (Units)</div>
        </div>
        <div className="text-center p-2">
          <div
            className={`text-xl font-bold ${Math.abs(summary.totalVariancePercentage) > 5 ? "text-red-600" : "text-gray-700"}`}
          >
            {summary.totalVariancePercentage.toFixed(2)}%
          </div>
          <div className="text-sm text-muted-foreground">Variance %</div>
        </div>
      </div>

      {/* Counts Table */}
      <div className="border rounded-lg overflow-hidden">
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
                    onChange={(e) => handleCountChange(item.item_id, Number(e.target.value))}
                    className={`border p-1 w-24 text-right ${isCompleted ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"}`}
                    disabled={isCompleted}
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
        {counts.length === 0 && <div className="p-4 text-center text-gray-500">No inventory items found.</div>}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={() => toast.info("Export not implemented")}
          disabled={isFinalizing || counts.length === 0}
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export Results (CSV)
        </Button>

        <div>
          {!isCompleted && (
            <Button onClick={saveCounts} variant="secondary" className="mr-3" disabled={isFinalizing || isLoading}>
              <Save className="w-4 h-4 mr-2" /> Save Counts
            </Button>
          )}

          <Button onClick={submitInventoryChanges} disabled={isFinalizing || isLoading || isCompleted}>
            {isFinalizing ? (
              "Finalizing..."
            ) : isCompleted ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" /> Finalized
              </>
            ) : (
              "Submit & Finish Inventory"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhysicalInventoryDetail;
