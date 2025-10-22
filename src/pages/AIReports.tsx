import React, { useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Bot } from "lucide-react";

/**
 * AIReports.tsx
 * --------------------------------------------------------
 * This page provides an AI-powered reporting assistant.
 * Users can type natural queries like:
 *  - "Show me total sales by store"
 *  - "Compare inventory cost by category"
 *  - "Top 5 selling items last month"
 * --------------------------------------------------------
 */

const AIReports: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState("");

  // Simulate an AI-generated report
  const handleGenerateReport = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSummary("");
    setData([]);

    // Simulate AI report logic (you can later connect to OpenAI or Supabase Functions)
    setTimeout(() => {
      // Fake data examples based on keywords
      let generatedData: any[] = [];
      let reportSummary = "";

      if (query.toLowerCase().includes("sales")) {
        generatedData = [
          { name: "Store A", value: 12000 },
          { name: "Store B", value: 18500 },
          { name: "Store C", value: 9200 },
        ];
        reportSummary = "This chart shows total sales by store.";
      } else if (query.toLowerCase().includes("inventory")) {
        generatedData = [
          { name: "Electronics", value: 45000 },
          { name: "Clothing", value: 28000 },
          { name: "Home Goods", value: 18000 },
        ];
        reportSummary = "Inventory value breakdown by category.";
      } else {
        generatedData = [
          { name: "Item A", value: 5000 },
          { name: "Item B", value: 7000 },
          { name: "Item C", value: 4000 },
        ];
        reportSummary = "Generic report — AI could not match a specific category.";
      }

      setData(generatedData);
      setSummary(reportSummary);
      setLoading(false);
    }, 1500);
  };

  // Export chart data to Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "AI_Report.xlsx");
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
