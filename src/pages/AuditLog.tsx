import { useState } from "react";
import { Search, Filter, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuditLog, useAuditLogTables, AuditLogEntry } from "@/hooks/useAuditLog";
import { format } from "date-fns";

const actionColors: Record<string, string> = {
  INSERT: "bg-green-500/20 text-green-700",
  UPDATE: "bg-blue-500/20 text-blue-700",
  DELETE: "bg-destructive/20 text-destructive",
};

export default function AuditLog() {
  const [filters, setFilters] = useState({
    tableName: "all",
    actionType: "all",
    dateFrom: "",
    dateTo: "",
    searchTerm: "",
  });
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const { data: entries, isLoading } = useAuditLog(filters);
  const { data: tables } = useAuditLogTables();

  const exportToCSV = () => {
    if (!entries?.length) return;

    const headers = ["Timestamp", "Table", "Action", "Record ID", "Entity Name", "User ID"];
    const rows = entries.map((entry) => [
      entry.timestamp ? format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm:ss") : "",
      entry.table_name,
      entry.action_type,
      entry.record_id,
      entry.entity_name || "",
      entry.user_id || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Track all changes made to the system</p>
        </div>
        <Button onClick={exportToCSV} disabled={!entries?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.tableName}
              onValueChange={(value) => setFilters({ ...filters, tableName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {tables?.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.actionType}
              onValueChange={(value) => setFilters({ ...filters, actionType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Insert</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
            <Input
              type="date"
              placeholder="To"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.timestamp
                        ? format(new Date(entry.timestamp), "MMM dd, yyyy HH:mm:ss")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.table_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={actionColors[entry.action_type]}>
                        {entry.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                      {entry.record_id}
                    </TableCell>
                    <TableCell>{entry.entity_name || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Table</p>
                  <p className="font-mono">{selectedEntry.table_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge variant="secondary" className={actionColors[selectedEntry.action_type]}>
                    {selectedEntry.action_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Record ID</p>
                  <p className="font-mono text-sm">{selectedEntry.record_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p>
                    {selectedEntry.timestamp
                      ? format(new Date(selectedEntry.timestamp), "PPpp")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {selectedEntry.action_type === "UPDATE" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Before (Old Data)</p>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[300px]">
                      {JSON.stringify(selectedEntry.old_data, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">After (New Data)</p>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[300px]">
                      {JSON.stringify(selectedEntry.new_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedEntry.action_type === "INSERT" && (
                <div>
                  <p className="text-sm font-medium mb-2">Created Data</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[400px]">
                    {JSON.stringify(selectedEntry.new_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.action_type === "DELETE" && (
                <div>
                  <p className="text-sm font-medium mb-2">Deleted Data</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[400px]">
                    {JSON.stringify(selectedEntry.old_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
