import React, { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ✅ Create an *untyped* Supabase client (bypasses the type errors)
const supabaseUnsafe = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

const AIReports: React.FC = () => {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Function to "interpret" user input and decide which report to run
  const generateReport = async () => {
    setLoading(true);
    try {
      let result;

      // Very simple "AI-like" keyword logic — can be replaced with OpenAI API later
      if (query.toLowerCase().includes("inventory")) {
        result = await supabaseUnsafe.from("inventory").select("*").limit(50);
      } else if (query.toLowerCase().includes("sales")) {
        result = await supabaseUnsafe.from("sales").select("*").limit(50);
      } else if (query.toLowerCase().includes("store")) {
        result = await supabaseUnsafe.from("stores").select("*").limit(50);
      } else {
        toast.warning("Unknown report type — try 'inventory report' or 'sales report'.");
        setLoading(false);
        return;
      }

      if (result.error) throw result.error;

      setData(result.data || []);
      toast.success("Report generated successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error("Error generating report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data.length) {
      toast.warning("No data to export!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "AI_Report.xlsx");
    toast.success("Excel file exported!");
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">AI Reports Assistant</h1>
          <p className="text-sm text-gray-500">
            Type what report you want (e.g., “Show me inventory report” or “Sales for this month”)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me to create a report..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateReport()}
            />
            <Button onClick={generateReport} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </Button>
            <Button onClick={handleExportExcel} variant="secondary">
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Report Preview</h2>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={Object.keys(data[0])[0]} />
                <YAxis />
                <Tooltip />
                <Bar dataKey={Object.keys(data[0])[1]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-auto mt-6">
              <table className="min-w-full text-sm border border-gray-200 rounded-md">
                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(data[0]).map((key) => (
                      <th key={key} className="px-3 py-2 border-b text-left">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-3 py-2 border-b">
                          {String(val)}
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
