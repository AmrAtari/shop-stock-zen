import { useState } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AIReports() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);
    setError("");
    setData([]);
    setSql("");

    try {
      const res = await fetch("/functions/v1/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const json = await res.json();

      if (json.error) throw new Error(json.error);

      setData(json.data || []);
      setSql(json.sql || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "AI_Report.xlsx");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-3">AI Report Assistant</h1>
      <p className="text-gray-600 mb-4">Ask about your sales, inventory, or performance in natural language.</p>

      <div className="flex gap-2 mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Show total sales per category for last month"
          className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">⚠️ {error}</p>}

      {sql && (
        <div className="mb-4">
          <h2 className="font-semibold text-lg">Generated SQL</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">{sql}</pre>
        </div>
      )}

      {data.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Results ({data.length})</h2>
            <button
              onClick={handleExport}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Export Excel
            </button>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="text-left px-4 py-2 capitalize border-r">
                      {key.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    {Object.keys(row).map((key) => (
                      <td key={key} className="px-4 py-2 border-r">
                        {String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Auto Chart (if possible) */}
          {Object.keys(data[0]).length >= 2 && (
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-2">Quick Visualization</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={Object.keys(data[0])[0]} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey={Object.keys(data[0])[1]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
