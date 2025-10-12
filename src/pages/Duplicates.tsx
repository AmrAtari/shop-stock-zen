import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { DuplicateComparison } from "@/types/database";

interface DuplicateWithDetails extends DuplicateComparison {
  differences: Record<string, { old: any; new: any }>;
}

const Duplicates = () => {
  const [duplicates, setDuplicates] = useState<DuplicateWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      const { data, error } = await supabase
        .from("duplicate_comparisons")
        .select("*")
        .is("resolution", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDuplicates((data as DuplicateWithDetails[]) || []);
    } catch (error: any) {
      toast.error("Failed to load duplicates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (id: string, resolution: "keep_existing" | "update_with_new", sku: string, newData: any) => {
    try {
      if (resolution === "update_with_new") {
        // Update the item with new data
        const { error: updateError } = await supabase
          .from("items")
          .update(newData)
          .eq("sku", sku);

        if (updateError) throw updateError;
      }

      // Mark as resolved
      const { error } = await supabase
        .from("duplicate_comparisons")
        .update({
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        resolution === "keep_existing"
          ? "Kept existing data"
          : "Updated with new data"
      );
      fetchDuplicates();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleIgnore = async (id: string) => {
    try {
      const { error } = await supabase
        .from("duplicate_comparisons")
        .update({
          resolution: "ignored",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Duplicate ignored");
      fetchDuplicates();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Duplicate Items</h1>
        <p className="text-muted-foreground mt-1">
          Review and resolve duplicate items found during import
        </p>
      </div>

      {duplicates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">No duplicates to review</p>
            <p className="text-sm text-muted-foreground">All imports are clean!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates.map((duplicate) => {
            const differences = duplicate.differences as Record<string, { old: any; new: any }>;
            const hasDifferences = Object.keys(differences).length > 0;

            return (
              <Card key={duplicate.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        SKU: {duplicate.sku}
                        {hasDifferences && (
                          <Badge variant="warning">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {Object.keys(differences).length} differences
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Found during import - Review changes below
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(duplicate.id, "keep_existing", duplicate.sku, null)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Keep Existing
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleResolve(duplicate.id, "update_with_new", duplicate.sku, duplicate.new_data)
                        }
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Update with New
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleIgnore(duplicate.id)}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasDifferences ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Current Value</TableHead>
                            <TableHead>New Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(differences).map(([field, values]) => (
                            <TableRow key={field}>
                              <TableCell className="font-medium capitalize">
                                {field.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{values.old || "-"}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">{values.new || "-"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No differences found - Data is identical
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Duplicates;
