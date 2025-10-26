import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ArrowLeft, Scan, Upload, BarChart3 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import PhysicalInventoryScanner from "@/components/PhysicalInventoryScanner";
import PhysicalInventoryImport from "@/components/PhysicalInventoryImport";
import PhysicalInventoryReport from "@/components/PhysicalInventoryReport";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { usePhysicalInventorySession } from "@/hooks/usePhysicalInventorySessions";
import { format } from "date-fns";

interface PhysicalInventoryCount {
  id: string;
  item_id: string | null;
  sku: string;
  item_name: string;
  systemQuantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
}

const PhysicalInventoryDetail = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"entry" | "report">("entry");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedForUpdate, setSelectedForUpdate] = useState<Set<string>>(new Set());
  const [updateMode, setUpdateMode] = useState<"all" | "selected" | "none">("all");

  const { data: currentSession, isLoading: sessionLoading } = usePhysicalInventorySession(id);

  // Fetch counts for current session
  const { data: counts = [], refetch: refetchCounts } = useQuery({
    queryKey: queryKeys.physicalInventory.counts(id || ""),
    queryFn: async (): Promise<PhysicalInventoryCount[]> => {
      if (!id) return [];

      // Join store_inventory with items table to get sku and name
      const { data, error } = await supabase
        .from("store_inventory")
        .select(`
          id,
          item_id,
          quantity,
          store_id,
          items:items(id, sku, name)
        `)
        .eq("store_id", currentSession?.store_id);

      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        item_id: row.item_id,
        sku: row.items?.sku || "",
        item_name: row.items?.name || "",
        systemQuantity: row.quantity,
        counted_quantity: 0,
        variance: 0,
        variance_percentage: 0,
        status: "pending",
        notes: null,
      }));
    },
    enabled: !!id && !!currentSession,
  });

  const lookupSku = async (sku: string) => {
    const { data, error } = await supabase
      .from("items")
      .select("id, sku, name")
      .eq("sku", sku)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Lookup systemQuantity from store_inventory for current session's store
    const { data: storeData } = await supabase
      .from("store_inventory")
      .select("quantity")
      .eq("item_id", data.id)
      .eq("store_id", currentSession?.store_id)
      .maybeSingle();

    return {
      id: data.id,
      sku: data.sku,
      name: data.name,
      systemQuantity: storeData?.quantity || 0,
    };
  };

  const handleScanItems = async (items: any[]) => {
    if (!currentSession) return;

    try {
      const countsToInsert = await Promise.all(
        items.map(async (item) => {
          const itemDetails = await lookupSku(item.sku);
          return {
            session_id: currentSession.id,
            item_id: itemDetails?.id || null,
            sku: item.sku,
            item_name: itemDetails?.name || item.sku,
            systemQuantity: itemDetails?.systemQuantity || 0,
            counted_quantity: item.countedQuantity,
            status: "pending" as const,
          };
        }),
      );

      await supabase.from("physical_inventory_counts").upsert(countsToInsert);

      refetchCounts();
      setActiveTab("report");
      toast.success("Items added to physical count");
    } catch (error: any) {
      toast.error(error.message || "Error adding items");
    }
  };

  const handleImportItems = async (items: any[]) => handleScanItems(items);

  const handleUpdateCount = async (id: string, countedQuantity: number, notes: string) => {
    const { error } = await supabase
      .from("physical_inventory_counts")
      .update({ counted_quantity: countedQuantity, notes })
      .eq("id", id);

    if (error) throw error;
    refetchCounts();
  };

  const handleCompleteSession = () => {
    setCompleteDialogOpen(true);
    setSelectedForUpdate(new Set(counts.map((c) => c.id)));
  };

  const handleFinalizeSession = async () => {
    if (!currentSession) return;

    try {
      const countsToUpdate =
        updateMode === "all"
          ? counts
          : counts.filter((c) => selectedForUpdate.has(c.id));

      for (const count of countsToUpdate) {
        if (!count.item_id) continue;

        await supabase
          .from("store_inventory")
          .update({ quantity: count.counted_quantity })
          .eq("item_id", count.item_id)
          .eq("store_id", currentSession.store_id);

        await supabase
          .from("physical_inventory_counts")
          .update({ status: "approved" })
          .eq("id", count.id);
      }

      await supabase
        .from("physical_inventory_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", currentSession.id);

      await invalidateInventoryData(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.physicalInventory.all });

      toast.success("Physical inventory session completed");
      setCompleteDialogOpen(false);
      navigate("/inventory/physical");
    } catch (error: any) {
      toast.error(error.message || "Error completing session");
    }
  };

  if (sessionLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate("/inventory/physical")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Physical Inventory
        </Button>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The session you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/inventory/physical")}>View All Sessions</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/inventory/physical")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Physical Inventory</h1>
              <Badge variant="secondary">Session: {currentSession.session_number}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>
                {currentSession.store?.name || "No Store"} |{" "}
                {format(new Date(currentSession.count_date), "MMM dd, yyyy")}
              </span>
              {currentSession.responsible_person && <span>By: {currentSession.responsible_person}</span>}
              {currentSession.count_type && (
                <Badge variant="outline" className="capitalize">{currentSession.count_type} Count</Badge>
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleCompleteSession} disabled={counts.length === 0 || currentSession.status === "completed"}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Session
        </Button>
      </div>

      {counts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{counts.length}</p>
                <p className="text-sm text-muted-foreground">Items Counted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{counts.filter(c => c.variance > 0).length}</p>
                <p className="text-sm text-muted-foreground">Over</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{counts.filter(c => c.variance < 0).length}</p>
                <p className="text-sm text-muted-foreground">Under</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.filter(c => c.variance === 0).length}</p>
                <p className="text-sm text-muted-foreground">Matched</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="entry">
            <Scan className="w-4 h-4 mr-2" />
            Physical Count
          </TabsTrigger>
          <TabsTrigger value="report" disabled={counts.length === 0}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList>
              <TabsTrigger value="scanner">
                <Scan className="w-4 h-4 mr-2" />
                Barcode Scanner
              </TabsTrigger>
              <TabsTrigger value="import">
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanner">
              <PhysicalInventoryScanner onScan={handleScanItems} onLookupSku={lookupSku} />
            </TabsContent>

            <TabsContent value="import">
              <PhysicalInventoryImport onImport={handleImportItems} onLookupSku={lookupSku} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="report">
          <PhysicalInventoryReport
            counts={counts}
            sessionNumber={currentSession.session_number}
            onUpdateCount={handleUpdateCount}
            onExport={() => {}}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Physical Inventory Session</DialogTitle>
            <DialogDescription>
              Choose how to update system quantities based on counted values
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={updateMode} onValueChange={(v: any) => setUpdateMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Update All Items</SelectItem>
                <SelectItem value="selected">Update Selected Items</SelectItem>
                <SelectItem value="none">Don't Update (Report Only)</SelectItem>
              </SelectContent>
            </Select>

            {updateMode === "selected" && (
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                <p className="text-sm font-medium mb-2">Select items to update:</p>
                {counts.map((count) => (
                  <div key={count.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedForUpdate.has(count.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedForUpdate);
                        if (checked) newSet.add(count.id);
                        else newSet.delete(count.id);
                        setSelectedForUpdate(newSet);
                      }}
                    />
                    <label className="text-sm flex-1">
                      {count.sku} - {count.item_name}
                      <span className={count.variance > 0 ? "text-green-600 ml-2" : count.variance < 0 ? "text-red-600 ml-2" : ""}>
                        ({count.variance > 0 ? "+" : ""}{count.variance})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Summary:</p>
              <ul className="space-y-1">
                <li>Total items counted: {counts.length}</li>
                {updateMode === "all" && <li>All {counts.length} items will be updated</li>}
                {updateMode === "selected" && <li>{selectedForUpdate.size} items will be updated</li>}
                {updateMode === "none" && <li>No items will be updated (report only)</li>}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFinalizeSession}>Complete Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhysicalInventoryDetail;
