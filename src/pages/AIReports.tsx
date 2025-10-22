import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Bot } from "lucide-react";

interface ReportData {
  name: string;
  value: number;
}

const AIReports: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState("");

  // Fetch report data from Supabase
  const fetchReport = async (query: string) => {
    setLoading(true);
    setSummary("");
    setData([]);

    try {
      let result;
      let reportSummary = "";

      if (query.toLowerCase().includes("sales")) {
        // Example: total sales by store
        result = await supabase.from("sales").select("store, total_amount").order("total_amount", { ascending: false });
        reportSummary = "Total sales by store";
      } else if (query.toLowerCase().includes("inventory")) {
        // Example: inventory value by category
        result = await supabase
          .from("inventory")
          .select("category, total_value")
          .order("total_value", { ascending: false });
        reportSummary = "Inventory value by category";
      } else {
        // fallback: generic inventory report
        result = await supabase.from("inventory").select("item_name, quantity");
        reportSummary = "Generic inventory report";
      }

      if (result.error) throw result.error;

      const formattedData = (result.data as any[]).map((row) => ({
        name: row.store || row.category || row.item_name,
        value: row.total_amount || row.total_value || row.quantity,
      }));

      setData(formattedData);
      setSummary(reportSummary);
    } catch (error) {
      console.error(error);
      setSummary("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    if (!query.trim()) return;
    fetchReport(query);
  };

  // Excel export using native browser download (no file-saver)
  const handleExportExcel = () => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AI_Report.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="p-6">
        <CardHeader className="text-xl font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Report Assistant
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="Ask your report (e.g. 'Show sales by store last month')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerateReport()}
            />
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-2" /> Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </div>

          {summary && <p className="text-gray-600 mb-4 font-medium">{summary}</p>}

          {data.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Report Results</h3>
                <Button variant="outline" onClick={handleExportExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIReports;
