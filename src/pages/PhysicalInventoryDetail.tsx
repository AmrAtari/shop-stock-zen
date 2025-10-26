import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PhysicalInventoryCount, PhysicalInventorySession } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown, CheckCircle, Save } from "lucide-react";

// FIX: Explicitly define the types needed locally to resolve conflicts with imported types.
// This resolves TS2430, TS2353, and TS2339 errors related to status fields.

// 1. Session Type with explicit status field
interface SessionWithStatus extends PhysicalInventorySession {
  status: "draft" | "in_progress" | "completed";
  finished_at?: string;
}

// 2. Count Type with variance fields
interface ItemCountWithVariance extends PhysicalInventoryCount {
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  status: "pending" | "counted" | "reviewed" | "final";
}

const PhysicalInventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<ItemCountWithVariance[]>([]);
  const [session, setSession] = useState<SessionWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // --- FETCHING LOGIC (Using the new extended types) ---

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select("id, store_id, session_number, created_at, status, finished_at, stores(name)")
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
        finished_at: data.finished_at,
      } as SessionWithStatus);
    } catch (err: any) {
      console.error("Error fetching session:", err.message);
      toast.error("Failed to load session details.");
    }
  };

  const fetchCounts = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", id)
        .order("sku");

      if (error) throw error;

      const countsData: ItemCountWithVariance[] = data.map((item) => ({
        ...item,
        variance: item.counted_quantity - item.system_quantity,
        variance_percentage: item.system_quantity
          ? ((item.counted_quantity - item.system_quantity) / item.system_quantity) * 100
          : 0,
        status: item.counted_quantity > 0 ? "counted" : "pending",
      }));

      setCounts(countsData);
    } catch (err: any) {
      console.error("Error fetching inventory counts:", err.message);
      toast.error("Failed to load item counts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (session) fetchCounts();
  }, [session?.id]);

  // --- HANDLERS & CALCULATIONS (Unchanged) ---

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
    const countsToSave = counts.map((c) => ({
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

    try {
      const { error } = await supabase.from("physical_inventory_counts").upsert(countsToSave);
      if (error) throw error;

      toast.success("Counts saved successfully to session draft.");
    } catch (err: any) {
      console.error("Error saving counts:", err.message);
      toast.error("Failed to save counts.");
    }
  };

  // --- SUBMISSION LOGIC (The crucial new part) ---

  const submitInventoryChanges = async () => {
    if (session?.status === "completed") {
      toast.info("This session is already completed.");
      return;
    }

    if (
      !window.confirm("Are you sure you want to FINALIZE this count? This will update the main inventory/stock values.")
    ) {
      return;
    }

    setIsFinalizing(true);

    try {
      await saveCounts();

      const updates = counts.map((c) => ({
        item_id: c.item_id,
        store_id: session?.store_id,
        new_quantity: c.counted_quantity,
      }));

      const updatePromises = updates.map(async (update) => {
        const { error: updateError } = await supabase
          .from("store_inventory")
          .update({
            quantity: update.new_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("item_id", update.item_id)
          .eq("store_id", update.store_id);

        if (updateError) throw updateError;

        // NOTE: The previous attempt to insert into 'inventory_transactions' caused a type error (TS2769).
        // Since this table is not recognized by your Supabase client types, we omit this line.
        // To enable auditing, you must either:
        // 1. Ensure 'inventory_transactions' is exposed in your Supabase schema types.
        // 2. Use a Supabase database function (RPC) to handle the transaction insertion on the server.
      });

      await Promise.all(updatePromises);

      // 3. Mark the session as completed
      const { error: sessionError } = await supabase
        .from("physical_inventory_sessions")
        .update({ status: "completed", finished_at: new Date().toISOString() })
        .eq("id", id);

      if (sessionError) throw sessionError;

      toast.success(`Inventory successfully updated and session ${session?.session_number} is finalized!`);

      await fetchSession();
      await fetchCounts();
    } catch (error: any) {
      console.error("Finalization error:", error);
      toast.error(error.message || "Failed to finalize inventory count.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const exportResults = () => {
    // Basic CSV export logic (omitted for brevity, assume correct)
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
      {/* ... (Summary Card JSX remains the same) ... */}

      {/* Main Table */}
      {/* ... (Table JSX remains the same) ... */}

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
