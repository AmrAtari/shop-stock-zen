import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PhysicalInventoryCount, PhysicalInventorySession } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown, CheckCircle, Save, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming this utility exists

// FIX 1: Use Omit<T, K> to exclude the restrictive 'status' property from the base
// interface and redefine it with the required 'pending' | 'counted' type to fix TS2430/TS2345.
interface LocalPhysicalInventoryCount extends Omit<PhysicalInventoryCount, "status"> {
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  status: "pending" | "counted";
}

interface SessionWithStatus extends PhysicalInventorySession {
  status: "draft" | "in_progress" | "completed";
}

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<LocalPhysicalInventoryCount[]>([]);
  const [session, setSession] = useState<SessionWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // --- FETCHING LOGIC ---

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
        store_name: data.stores?.name || "",
        session_number: data.session_number,
        created_at: data.created_at,
        status: data.status,
      } as SessionWithStatus);
    } catch (err: any) {
      console.error("Error fetching session:", err.message);
      toast.error("Failed to load session details.");
    }
  };

  const fetchCounts = async () => {
    if (!session || !session.id || !session.store_id) return;
    setIsLoading(true);

    try {
      // 1. Check for existing counts for this session (FIX: Ensures saved counts are displayed)
      const { data: existingCounts, error: existingError } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", session.id)
        .order("sku");

      if (existingError) throw existingError;

      if (existingCounts && existingCounts.length > 0) {
        setCounts(existingCounts as LocalPhysicalInventoryCount[]);
        return;
      }

      // 2. If no existing counts found (brand new session), fetch all store inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("store_inventory")
        // FIX: Select the necessary data, including joining the 'items' table for item name/sku
        .select("item_id, quantity, items(name, sku)")
        .eq("store_id", session.store_id);

      if (inventoryError) throw inventoryError;

      // Map data to the local type
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
        toast.info("No items found in inventory for this store.");
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
          ? ({
              ...c,
              counted_quantity: finalCount,
              variance: finalCount - c.system_quantity,
              variance_percentage: c.system_quantity ? ((finalCount - c.system_quantity) / c.system_quantity) * 100 : 0,
              status: finalCount > 0 ? "counted" : "pending",
            } as LocalPhysicalInventoryCount)
          : c,
      ),
    );
  };

  const saveCounts = async () => {
    const countsToSave = counts
      .filter((c) => c.session_id)
      .map((c) => ({
        session_id: c.session_id,
        item_id: c.item_id,
        sku: c.sku,
        item_name: c.item_name,
        system_quantity: c.system_quantity,
        counted_quantity: c.counted_quantity,
        // Status is mapped back to the required 'pending' | 'counted' type before saving
        status: c.counted_quantity > 0 ? "counted" : "pending",
        variance: c.variance,
        variance_percentage: c.variance_percentage,
      }));

    if (countsToSave.length === 0) {
      toast.info("No counts to save.");
      return;
    }

    try {
      // 1. Save all current counts to the physical_inventory_counts table (upsert)
      const { error } = await supabase.from("physical_inventory_counts").upsert(countsToSave);
      if (error) throw error;

      toast.success("Counts saved successfully to session draft.");
      await fetchCounts();
    } catch (err: any) {
      console.error("Error saving counts:", err.message);
      toast.error("Failed to save counts.");
    }
  };

  /**
   * IMPORTANT: Implements the final inventory update logic.
   * - Saves current counts.
   * - Updates the store_inventory quantities for the respective items/store.
   * - Sets the session status to 'completed'.
   */
  const submitInventoryChanges = async () => {
    if (!session || isFinalizing || isCompleted) return;

    setIsFinalizing(true);

    // Filter for items that actually have a count or a variance (i.e., should be updated)
    const updates = counts.filter((c) => c.counted_quantity > 0 || c.system_quantity !== 0);

    if (updates.length === 0) {
      toast.warning("No items counted to finalize. Did you forget to count?");
      setIsFinalizing(false);
      return;
    }

    try {
      // 1. Ensure latest counts are saved first
      await saveCounts();

      // 2. Prepare batch updates for the store_inventory table
      const inventoryUpdates = updates.map((c) => ({
        // Assuming 'store_inventory' uses 'item_id' and 'store_id' as a composite key
        // for the item's stock in a specific location.
        item_id: c.item_id,
        store_id: session.store_id,
        quantity: c.counted_quantity, // The new system quantity is the counted quantity
        updated_at: new Date().toISOString(),
      }));

      // Use upsert to update store_inventory
      const { error: inventoryError } = await supabase
        .from("store_inventory")
        .upsert(inventoryUpdates, { onConflict: "item_id, store_id" }); // Use composite key for conflict

      if (inventoryError) throw inventoryError;

      // 3. Finalize the session status to 'completed'
      const { error: sessionError } = await supabase
        .from("physical_inventory_sessions")
        .update({ status: "completed", finalized_at: new Date().toISOString() })
        .eq("id", session.id);

      if (sessionError) throw sessionError;

      toast.success("Physical inventory complete! Stock levels have been updated.");
      // Refresh session to show 'Completed' badge
      await fetchSession();
    } catch (error: any) {
      console.error("Finalization failed:", error.message);
      toast.error("Finalization failed: " + error.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const exportResults = () => {
    toast.info("Export functionality is not fully implemented.");
  };

  // --- RENDER ---

  const isCompleted = session?.status === "completed";

  if (isLoading) {
    return <div className="p-4">Loading inventory counts...</div>;
  }

  const statusBadge = isCompleted ? (
    <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
      <CheckCircle className="w-4 h-4 mr-1" /> Completed
    </span>
  ) : (
    <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
      <Save className="w-4 h-4 mr-1" /> In Progress
    </span>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">
          Physical Inventory - {session?.store_name} ({session?.session_number})
        </h1>
        {statusBadge}
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

      {/* Main Table */}
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
                    min="0"
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
          <div className="p-4 text-center text-gray-500">No inventory items found for this store.</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        {/* Left: Export */}
        <Button variant="outline" onClick={exportResults} disabled={isFinalizing || counts.length === 0}>
          <FileDown className="w-4 h-4 mr-2" />
          Export Results (CSV)
        </Button>

        {/* Right: Save and Submit */}
        <div>
          {!isCompleted && (
            <Button onClick={saveCounts} disabled={isFinalizing || isLoading} variant="secondary" className="mr-3">
              <Save className="w-4 h-4 mr-2" />
              Save Counts
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
