import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calculator, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InventoryRecalculate() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("recalculate-inventory", {
        body: {},
      });

      if (error) throw error;

      setResult(data);
      toast.success("Inventory recalculated successfully");
    } catch (error: any) {
      console.error("Recalculation error:", error);
      toast.error(error.message || "Failed to recalculate inventory");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Inventory Recalculation</h1>
          <p className="text-muted-foreground">Rebuild inventory quantities from transaction history</p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This tool recalculates all store inventory quantities from scratch based on:
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Completed Purchase Order receipts (additions)</li>
            <li>Completed Transfers (additions/subtractions)</li>
            <li>POS Sales transactions (subtractions)</li>
          </ul>
          <p className="mt-2">
            <strong>Note:</strong> Currently, sales cannot be deducted accurately because transactions don't track
            store_id. Only PO receipts are used for recalculation. Future sales will be tracked correctly with the
            updated POS system.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Recalculate All Inventory</CardTitle>
          <CardDescription>
            This process will recalculate quantities for all items across all stores based on completed transactions.
            Existing store_inventory records will be updated with calculated values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRecalculate} disabled={isRecalculating} size="lg">
            {isRecalculating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Run Recalculation
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-lg">Recalculation Results</h3>
              
              {result.success && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200 font-medium">{result.message}</p>
                </div>
              )}

              {result.stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{result.stats.itemsProcessed}</div>
                    <div className="text-sm text-muted-foreground">Items Processed</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{result.stats.storesProcessed}</div>
                    <div className="text-sm text-muted-foreground">Stores Processed</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{result.stats.poItemsProcessed}</div>
                    <div className="text-sm text-muted-foreground">PO Items Processed</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{result.stats.inventoryEntriesUpdated}</div>
                    <div className="text-sm text-muted-foreground">Entries Updated</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-2xl font-bold">{result.stats.inventoryEntriesInserted}</div>
                    <div className="text-sm text-muted-foreground">Entries Inserted</div>
                  </div>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc ml-6 mt-2">
                      {result.warnings.map((warning: string, idx: number) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
