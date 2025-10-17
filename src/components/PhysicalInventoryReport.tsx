import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface PhysicalInventoryCount {
  id: string;
  sku: string;
  item_name: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_percentage: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
}

interface PhysicalInventoryReportProps {
  counts: PhysicalInventoryCount[];
  sessionNumber: string;
  onUpdateCount: (id: string, countedQuantity: number, notes: string) => Promise<void>;
  onExport: () => void;
}

const PhysicalInventoryReport = ({ counts, sessionNumber, onUpdateCount, onExport }: PhysicalInventoryReportProps) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");

  const filteredCounts = useMemo(() => {
    if (filterStatus === "all") return counts;
    if (filterStatus === "variances") return counts.filter(c => c.variance !== 0);
    return counts.filter(c => c.status === filterStatus);
  }, [counts, filterStatus]);

  const summary = useMemo(() => {
    const totalItems = counts.length;
    const itemsWithVariance = counts.filter(c => c.variance !== 0).length;
    const totalPositiveVariance = counts.reduce((sum, c) => sum + (c.variance > 0 ? c.variance : 0), 0);
    const totalNegativeVariance = counts.reduce((sum, c) => sum + (c.variance < 0 ? c.variance : 0), 0);
    const approvedItems = counts.filter(c => c.status === "approved").length;

    return {
      totalItems,
      itemsWithVariance,
      totalPositiveVariance,
      totalNegativeVariance,
      approvedItems,
    };
  }, [counts]);

  const handleEditStart = (count: PhysicalInventoryCount) => {
    setEditingId(count.id);
    setEditQuantity(count.counted_quantity);
    setEditNotes(count.notes || "");
  };

  const handleEditSave = async (id: string) => {
    try {
      await onUpdateCount(id, editQuantity, editNotes);
      setEditingId(null);
      toast.success("Count updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Error updating count");
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditQuantity(0);
    setEditNotes("");
  };

  const getVarianceBadge = (variancePercentage: number) => {
    const absPercent = Math.abs(variancePercentage);
    if (absPercent < 5) return { label: "Low", variant: "secondary" as const };
    if (absPercent < 15) return { label: "Medium", variant: "warning" as const };
    return { label: "High", variant: "destructive" as const };
  };

  const handleExportLocal = () => {
    const exportData = counts.map(c => ({
      SKU: c.sku,
      "Item Name": c.item_name,
      "System Quantity": c.system_quantity,
      "Counted Quantity": c.counted_quantity,
      "Variance": c.variance,
      "Variance %": c.variance_percentage.toFixed(2) + "%",
      "Status": c.status,
      "Notes": c.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Physical Inventory");

    // Add summary sheet
    const summaryData = [
      { Metric: "Session Number", Value: sessionNumber },
      { Metric: "Date", Value: new Date().toLocaleDateString() },
      { Metric: "Total Items Counted", Value: summary.totalItems },
      { Metric: "Items with Variance", Value: summary.itemsWithVariance },
      { Metric: "Total Positive Variance", Value: summary.totalPositiveVariance },
      { Metric: "Total Negative Variance", Value: summary.totalNegativeVariance },
      { Metric: "Approved Items", Value: summary.approvedItems },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    XLSX.writeFile(wb, `Physical_Inventory_${sessionNumber}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Report exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Items with Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.itemsWithVariance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Positive Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{summary.totalPositiveVariance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Negative Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.totalNegativeVariance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <div className="flex justify-between items-center">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="variances">Only Variances</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleExportLocal}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Counts Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">System Qty</TableHead>
              <TableHead className="text-right">Counted Qty</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCounts.map((count) => {
              const isEditing = editingId === count.id;
              const varianceBadge = getVarianceBadge(count.variance_percentage);

              return (
                <TableRow key={count.id}>
                  <TableCell className="font-medium">{count.sku}</TableCell>
                  <TableCell>{count.item_name}</TableCell>
                  <TableCell className="text-right">{count.system_quantity}</TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      count.counted_quantity
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={count.variance === 0 ? "text-muted-foreground" : count.variance > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                      {count.variance > 0 ? "+" : ""}{count.variance}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={count.variance === 0 ? "text-muted-foreground" : count.variance > 0 ? "text-green-600" : "text-red-600"}>
                        {count.variance_percentage.toFixed(2)}%
                      </span>
                      {count.variance !== 0 && (
                        <Badge variant={varianceBadge.variant}>{varianceBadge.label}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={count.status === "approved" ? "success" : "secondary"}>
                      {count.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add notes..."
                        className="min-h-[60px]"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{count.notes || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEditSave(count.id)}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleEditCancel}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => handleEditStart(count)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PhysicalInventoryReport;
