import { useState } from "react";

export default function AIReports() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    setLoading(true);
    const res = await fetch("/functions/v1/ai-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setResponse(data);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-3">AI Report Assistant</h1>
      <p className="text-gray-600 mb-4">
        Ask anything about your sales, inventory, or performance.
      </p>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Show total sales per category for the last month"
        className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
      />

      <button
        onClick={handleAsk}
        disabled={loading}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Ask AI"}
      </button>

      {response && (
        <div className="mt-6">
          <h2 className="font-semibold text-lg">Generated SQL</h2>
          <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
            {response.sql}
          </pre>

          {response.error ? (
            <p className="text-red-600 mt-2">Error: {response.error}</p>
          ) : (
            <>
              <h2 className="font-semibold text-lg mt-4">Results</h2>
              <pre className="bg-gray-50 p-3 rounded overflow-x-auto text-sm">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
