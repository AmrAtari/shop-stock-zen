import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, Loader2, Sparkles, Database, Table2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const SUGGESTED_QUERIES = [
  "Show total inventory quantity by store",
  "Top 20 items by stock quantity across all stores",
  "Show all purchase orders with status and total cost",
  "List POS transactions from the last 30 days grouped by payment method",
  "Show low stock items where quantity is below min_stock",
  "Total sales amount by store",
  "List all transfers between stores with their status",
  "Show top 10 customers by total transaction amount",
];

const AIReports: React.FC = () => {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateReport = async (questionOverride?: string) => {
    const question = questionOverride || query;
    if (!question.trim()) {
      toast.warning("Please enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setData([]);
    setSql("");

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-report", {
        body: { question },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to generate report");
      }

      if (fnData?.error) {
        setError(fnData.error);
        if (fnData.sql) setSql(fnData.sql);
        toast.error(fnData.error);
        return;
      }

      const rows = fnData?.data || [];
      setData(rows);
      setSql(fnData?.sql || "");

      if (rows.length === 0) {
        toast.info("Query returned no results.");
      } else {
        toast.success(`Report generated: ${rows.length} rows`);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Failed to generate report";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data.length) {
      toast.warning("No data to export!");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Report");
    XLSX.writeFile(wb, `AI_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel exported!");
  };

  const exportCSV = () => {
    if (!data.length) {
      toast.warning("No data to export!");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  // Determine numeric columns for charting
  const numericKeys = data.length > 0
    ? Object.keys(data[0]).filter((k) => typeof data[0][k] === "number")
    : [];
  const labelKey = data.length > 0
    ? Object.keys(data[0]).find((k) => typeof data[0][k] === "string") || Object.keys(data[0])[0]
    : "";
  const showChart = data.length > 0 && data.length <= 50 && numericKeys.length > 0;

  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">AI Reports Assistant</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask any question about your inventory, sales, purchase orders, or transfers in plain English.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Show me total inventory value by store..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && generateReport()}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={() => generateReport()} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>

          {/* Suggested queries */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => { setQuery(q); generateReport(q); }}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SQL Preview */}
      {sql && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Generated SQL</h3>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto font-mono whitespace-pre-wrap">
              {sql}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {showChart && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold">Chart</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {numericKeys.slice(0, 3).map((key, idx) => (
                  <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Results ({data.length} rows)</h3>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportCSV}>
                  <FileDown className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportExcel}>
                  <FileDown className="w-4 h-4 mr-1" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {Object.keys(data[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 border-b last:border-0">
                      {Object.values(row).map((val: any, i) => (
                        <td key={i} className="px-3 py-2 whitespace-nowrap">
                          {val === null ? <span className="text-muted-foreground italic">null</span> : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIReports;
