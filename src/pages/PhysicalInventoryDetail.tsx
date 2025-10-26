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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PhysicalInventoryScanner from "@/components/PhysicalInventoryScanner";
import PhysicalInventoryImport from "@/components/PhysicalInventoryImport";
import PhysicalInventoryReport from "@/components/PhysicalInventoryReport";
import { queryKeys, invalidateInventoryData } from "@/hooks/queryKeys";
import { usePhysicalInventorySession } from "@/hooks/usePhysicalInventorySessions";
import { format } from "date-fns";

interface Session {
  id: string;
  session_number: string;
  status: string;
  count_date: string;
  store_id: string;
  responsible_person: string;
  count_type: string;
  notes: string | null;
  stores?: { id: string; name: string };
}

interface PhysicalInventoryCount {
  id: string;
  item_id: string | null;
  sku: string;
  item_name: string;
  system_quantity: number;
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

  const { data: counts = [], refetch: refetchCounts } = useQuery({
    queryKey: queryKeys.physicalInventory.counts(id || ""),
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("physical_inventory_counts")
        .select("*")
        .eq("session_id", id)
        .order("sku");
      if (error) throw error;
      return (data as PhysicalInventoryCount[]).map(c => ({
        ...c,
        status: c.status as "pending" | "approved" | "rejected",
      }));
    },
    enabled: !!id,
  });

  const lookupSku = async (sku: string) => {
    if (!currentSession) return null;

    // Lookup item
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("id, sku, name")
      .eq("sku", sku)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!itemData) return null;

    // Lookup store-specific quantity
    let systemQuantity = 0;
    if (currentSession.store_id) {
      const { data: storeInvData, error: storeInvError } = await supabase
        .from("store_inventory")
        .select("quantity")
        .eq("store_id", currentSession.store_id)
        .eq("item_id", itemData.id)
        .maybeSingle();
      if (storeInvError) throw storeInvError;
      systemQuantity = storeInvData?.quantity || 0;
    }

    return {
      id: itemData.id,
      sku: itemData.sku,
      name: itemData.name,
      systemQuantity,
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
            system_quantity: itemDetails?.systemQuantity || 0,
            counted_quantity: item.countedQuantity,
            status: "pending",
          };
        })
      );
      const { error } = await supabase.from("physical_inventory_counts").insert(countsToInsert);
      if (error) throw error;
      refetchCounts();
      setActiveTab("report");
      toast.success("Items added to physical count");
    } catch (error: any) {
      toast.error(error.message || "Error adding items");
    }
  };

  const handleImportItems = async (items: any[]) => {
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
            system_quantity: itemDetails?.systemQuantity || 0,
            counted_quantity: item.countedQuantity,
            status: "pending",
          };
        })
      );
      const { error } = await supabase.from("physical_inventory_counts").insert(countsToInsert);
      if (error) throw error;
      refetchCounts();
      setActiveTab("report");
      toast.success("Items imported successfully");
    } catch (error: any) {
      toast.error(error.message || "Error importing items");
    }
  };

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
      if (updateMode !== "none") {
        const countsToUpdate = updateMode === "all" ? counts : counts.filter((c) => selectedForUpdate.has(c.id));
        for (const count of countsToUpdate) {
          if (!count.item_id) continue;

          // Update store_inventory table
          const { error: upsertError } = await supabase
            .from("store_inventory")
            .upsert(
              {
                store_id: currentSession.store_id,
                item_id: count.item_id,
                quantity: count.counted_quantity,
                last_updated: new Date().toISOString(),
              } as any,
              { onConflict: ["store_id", "item_id"] }
            );
          if (upsertError) throw upsertError;

          // Mark count as approved
          await supabase
            .from("physical_inventory_counts")
            .update({ status: "approved" })
            .eq("id", count.id);
        }
      }

      // Complete session
      const { error: sessionError } = await supabase
        .from("physical_inventory_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", currentSession.id);
      if (sessionError) throw sessionError;

      await invalidateInventoryData(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.physicalInventory.all });

      toast.success("Physical inventory session completed");
      setCompleteDialogOpen(false);
      navigate("/inventory/physical");
    } catch (error: any) {
      toast.error(error.message || "Error completing session");
    }
  };

  if (sessionLoading) return <div className="p-8 text-center">Loading session...</div>;
  if (!currentSession)
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate("/inventory/physical")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The physical inventory session you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => navigate("/inventory/physical")}>View All Sessions</Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
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
              <span>{currentSession.stores?.name || "No Store"} | {format(new Date(currentSession.count_date), "MMM dd, yyyy")}</span>
              {currentSession.responsible_person && <span>By: {currentSession.responsible_person}</span>}
              {currentSession.count_type && <Badge variant="outline" className="capitalize">{currentSession.count_type} Count</Badge>}
            </div>
          </div>
        </div>
        <Button onClick={handleCompleteSession} disabled={counts.length === 0 || currentSession.status === "completed"}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Session
        </Button>
      </div>

      {/* Progress Summary */}
      {counts.length > 0 && (
        <Card>
          <CardContent className="pt-6 grid grid-cols-4 text-center">
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
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="entry"><Scan className="w-4 h-4 mr-2" />Physical Count</TabsTrigger>
          <TabsTrigger value="report" disabled={counts.length === 0}><BarChart3 className="w-4 h-4 mr-2" />Report</TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          <Tabs defaultValue="scanner" className="w-full">
            <TabsList>
              <TabsTrigger value="scanner"><Scan className="w-4 h-4 mr-2" />Barcode Scanner</TabsTrigger>
              <TabsTrigger value="import"><Upload className="w-4 h-4 mr-2" />Import Data</TabsTrigger>
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
          <PhysicalInventoryReport counts={counts} sessionNumber={currentSession.session_number} onUpdateCount={handleUpdateCount} onExport={() => {}} />
        </TabsContent>
      </Tabs>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Physical Inventory Session</DialogTitle>
            <DialogDescription>Choose how to update system quantities based on counted values</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={updateMode} onValueChange={(v: any) => setUpdateMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Update All Items</SelectItem>
                <SelectItem value="selected">Update Selected Items</SelectItem>
                <SelectItem value="none">Don't Update (Report Only)</SelectItem>
              </SelectContent>
            </Select>

            {updateMode === "selected" && (
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                <p className="text-sm font-medium mb-2">Select items to update:</p>
                {counts.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedForUpdate.has(c.id)}
                      onCheckedChange={checked => {
                        const newSet = new Set(selectedForUpdate);
                        checked ? newSet.add(c.id) : newSet.delete(c.id);
                        setSelectedForUpdate(newSet);
                      }}
                    />
                    <label className="text-sm flex-1">{c.sku} - {c.item_name}
                      <span className={c.variance > 0 ? "text-green-600 ml-2" : c.variance < 0 ? "text-red-600 ml-2" : ""}>
                        ({c.variance > 0 ? "+" : ""}{c.variance})
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
