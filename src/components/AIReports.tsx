import { useState } from "react";

export default function AIReports() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("/api/ai-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResponse(data.answer);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">AI Report Assistant</h2>
      <textarea
        className="w-full border p-2 rounded mb-2"
        rows={3}
        placeholder="Ask: Show me total sales this week"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">
        Generate
      </button>

      {response && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <pre>{response}</pre>
        </div>
      )}
    </div>
  );
}
