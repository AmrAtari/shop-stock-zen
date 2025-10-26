import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PhysicalInventoryCount, PhysicalInventorySession } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown, CheckCircle, Save } from "lucide-react";

// --- TYPE FIXES ---
interface Store {
  name: string;
}

interface SessionData {
  id: string;
  session_number: string;
  status: "draft" | "in_progress" | "completed";
  created_at: string;
  responsible_person: string;
  store_id: string;
  stores: Store[] | null;
}

interface LocalPhysicalInventoryCount
  extends Omit<PhysicalInventoryCount, "status" | "variance" | "variance_percentage"> {
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  status: "pending" | "counted";
}

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [counts, setCounts] = useState<LocalPhysicalInventoryCount[]>([]);
  const [session, setSession] = useState<(PhysicalInventorySession & { store_name: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // --- FETCH SESSION ---
  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select(
          `
          id,
          session_number,
          status,
          created_at,
          responsible_person,
          store_id,
          stores ( name )
        `,
        )
        .eq("id", id)
        .single<SessionData>();

      if (error) throw error;

      const storeName = Array.isArray(data.stores) ? data.stores[0]?.name || "N/A" : data.stores?.name || "N/A";

      setSession({
        ...data,
        store_name: storeName,
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
      const { data: existingCounts, error: existingError } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", session.id)
        .order("sku");

      if (existingError) throw existingError;

      if (existingCounts && existingCounts.length > 0) {
        setCounts(
          existingCounts.map((c) => ({
            ...c,
            status: c.counted_quantity > 0 ? "counted" : "pending",
          })) as LocalPhysicalInventoryCount[],
        );
        return;
      }

      // If no existing counts, fetch store inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("store_inventory")
        .select("item_id, quantity, items(name, sku)")
        .eq("store_id", session.store_id);

      if (inventoryError) throw inventoryError;

      const countsData: LocalPhysicalInventoryCount[] = inventoryData.map((item: any) => ({
        session_id: session.id,
        item_id: item.item_id,
        sku: item.items?.sku || item.item_id,
        item_name: item.items?.name || "N/A",
        system_quantity: item.quantity || 0,
        counted_quantity: 0,
        status: "pending",
        variance: 0,
        variance_percentage: 0,
      }));

      setCounts(countsData);
      if (countsData.length === 0) {
        toast.info("No inventory items found for this store. Please add items to the store inventory first.");
      }
    } catch (err: any) {
      console.error("Error fetching inventory counts:", err.message);
      toast.error("Failed to load inventory list.");
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

  // --- HANDLERS & CALCULATIONS ---
  const summary = useMemo(() => {
    const totalSystemQty = counts.reduce((sum, c) => sum + c.system_quantity, 0);
    const totalCountedQty = counts.reduce((sum, c) => sum + c.counted_quantity, 0);
    const totalVariance = totalCountedQty - totalSystemQty;
    const totalVariancePercentage = totalSystemQty > 0 ? (totalVariance / totalSystemQty) * 100 : 0;
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

  const handleCountChange = (itemId: string, counted: number) => {
    const finalCount = Math.max(0, counted);
    setCounts((prev) =>
      prev.map((c) =>
        c.item_id === itemId
          ? {
              ...c,
              counted_quantity: finalCount,
              variance: finalCount - c.system_quantity,
              variance_percentage: c.system_quantity ? ((finalCount - c.system_quantity) / c.system_quantity) * 100 : 0,
              status: finalCount > 0 ? "counted" : "pending",
            }
          : c,
      ),
    );
  };

  const saveCounts = async () => {
    const countsToSave = counts
      .filter((c) => c.session_id)
      .map((c) => ({
        id: c.id,
        session_id: c.session_id,
        item_id: c.item_id,
        sku: c.sku,
        item_name: c.item_name,
        system_quantity: c.system_quantity,
        counted_quantity: c.counted_quantity,
        status: c.counted_quantity > 0 ? "counted" : "pending",
        variance: c.variance,
        variance_percentage: c.variance_percentage,
      }));

    if (countsToSave.length === 0) {
      toast.info("No counts to save.");
      return;
    }

    try {
      const { error } = await supabase.from("physical_inventory_counts").upsert(countsToSave);
      if (error) throw error;

      toast.success("Counts saved successfully to session draft.");
      await fetchCounts();
    } catch (err: any) {
      console.error("Error saving counts:", err.message);
      toast.error("Failed to save counts.");
    }
  };

  const submitInventoryChanges = async () => {
    if (!session || isFinalizing || session.status === "completed") return;

    if (!window.confirm("Are you sure you want to FINALIZE this count? This will permanently update stock levels.")) {
      return;
    }

    setIsFinalizing(true);

    const updates = counts.filter((c) => c.status === "counted" || c.id);

    if (updates.length === 0) {
      toast.warning("No items counted to finalize.");
      setIsFinalizing(false);
      return;
    }

    try {
      await saveCounts();

      const inventoryUpdates = updates.map((c) => ({
        item_id: c.item_id,
        store_id: session.store_id,
        quantity: c.counted_quantity,
        updated_at: new Date().toISOString(),
      }));

      const { error: inventoryError } = await supabase
        .from("store_inventory")
        .upsert(inventoryUpdates, { onConflict: "item_id, store_id" });

      if (inventoryError) throw inventoryError;

      const { error: sessionError } = await supabase
        .from("physical_inventory_sessions")
        .update({ status: "completed", finalized_at: new Date().toISOString() })
        .eq("id", session.id);

      if (sessionError) throw sessionError;

      toast.success("Physical inventory complete! Stock levels updated.");
      await fetchSession();
    } catch (err: any) {
      console.error("Finalization failed:", err.message);
      toast.error("Finalization failed: " + err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const exportResults = () => {
    toast.info("Export functionality not yet implemented.");
  };

  const isCompleted = session?.status === "completed";

  if (isLoading) return <div className="p-4">Loading inventory counts...</div>;

  // --- RENDER ---
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">
          Physical Inventory - {session?.store_name} ({session?.session_number})
        </h1>
        <span
          className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${isCompleted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
        >
          {isCompleted ? <CheckCircle className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {isCompleted ? "Completed" : "In Progress"}
        </span>
      </div>

      {/* Summary Card */}
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

      {/* Inventory Table */}
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
        {counts.length === 0 && !isLoading && (
          <div className="p-4 text-center text-gray-500">No inventory items found.</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={exportResults} disabled={isFinalizing || counts.length === 0}>
          <FileDown className="w-4 h-4 mr-2" />
          Export Results (CSV)
        </Button>
        <div>
          {!isCompleted && (
            <Button onClick={saveCounts} disabled={isFinalizing || isLoading} variant="secondary" className="mr-3">
              <Save className="w-4 h-4 mr-2" />
              Save Counts (Draft)
            </Button>
          )}
          <Button
            onClick={submitInventoryChanges}
            disabled={isFinalizing || isLoading || isCompleted}
            className={isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
          >
            {isFinalizing ? (
              "Finalizing..."
            ) : isCompleted ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" /> Finalized
              </>
            ) : (
              "Submit & Finish Physical Inventory"
            )}
          </Button>
        </div>
      </div>

      {isCompleted && (
        <div className="flex items-center p-4 text-green-800 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 mr-2" />
          This session is complete. Inventory stock levels have been permanently updated.
        </div>
      )}
    </div>
  );
};

export default PhysicalInventoryDetail;
