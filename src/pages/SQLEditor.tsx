// src/pages/SQLEditor.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SQLEditor: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async () => {
    if (!query.trim()) {
      setError("Query cannot be empty.");
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // NOTE ON TYPING: We use the existing typed function 'create_attribute_table'
      // but cast 'supabase.rpc' to `any` to bypass the TypeScript error until types are regenerated.
      // This is a common pattern in development when the database is ahead of the local types.

      const { data, error: rpcError } = await (supabase.rpc as any)("execute_raw_sql", {
        // Argument name is irrelevant here; we pass the query string.
        sql_query: query,
      });

      if (rpcError) throw rpcError;

      setResults(data);
      toast.success("Query executed successfully!");
    } catch (err: any) {
      // Special handling for the original constraint error
      if (err.message && err.message.includes("violates check constraint")) {
        const match = err.message.match(/"([^"]+)"/);
        const constraintName = match ? match[1] : "Unknown";
        setError(`Database Error: ${err.message}. Constraint name: ${constraintName}.`);
        toast.error(`Constraint Violated: ${constraintName}`);

        if (query.includes("physical_inventory_sessions")) {
          setError(
            (prev) =>
              prev +
              "\n\nTo find the correct status: Run the query: SELECT condef FROM pg_constraint WHERE conname = 'physical_inventory_sessions_status_check';",
          );
        }
      } else {
        setError(`Error executing query: ${err.message}`);
        toast.error(`Query Failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to format results nicely
  const formatResults = (data: any) => {
    if (Array.isArray(data)) {
      if (data.length === 0) return "[] (0 rows affected)";
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="w-6 h-6" />
            <span>SQL / Database Editor (Admin)</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Execute raw SQL queries. **WARNING: Only use this for development/admin tasks.**
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., SELECT * FROM physical_inventory_sessions; OR CREATE TABLE new_table (...);"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <Button onClick={executeQuery} disabled={loading || !query.trim()}>
            <Play className="w-4 h-4 mr-2" />
            {loading ? "Executing..." : "Execute Query"}
          </Button>

          <div className="text-sm border-t pt-4 space-y-2">
            <h3 className="font-semibold flex items-center space-x-2">
              <Code className="w-4 h-4" />
              <span>Results:</span>
            </h3>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <pre className="font-mono whitespace-pre-wrap text-sm">{error}</pre>
              </div>
            )}
            {results !== null && (
              <ScrollArea className="h-64 border rounded p-4 bg-gray-50 dark:bg-gray-900">
                <pre className="font-mono whitespace-pre-wrap text-xs">{formatResults(results)}</pre>
              </ScrollArea>
            )}
            {!error && results === null && !loading && (
              <p className="text-muted-foreground italic">Execute a query to see the results here.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Setup for Supabase</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            Since the RPC function **`execute_raw_sql`** is not in your types, you **must** create it in your Supabase
            database first for the editor to work. Copy and run this SQL in your Supabase SQL editor:
          </p>
          <h4 className="font-semibold mt-3">PostgreSQL Function (`execute_raw_sql`)</h4>
          <ScrollArea className="h-48 border rounded p-3 bg-gray-50 dark:bg-gray-800">
            <pre className="font-mono text-xs whitespace-pre-wrap">
              {`CREATE OR REPLACE FUNCTION execute_raw_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
    EXECUTE sql_query INTO result;
    RETURN jsonb_build_object('status', 'success', 'data', result);
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION execute_raw_sql(TEXT) TO authenticated;
`}
            </pre>
          </ScrollArea>
          <p className="font-bold text-red-600 flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4" />
            <span>
              After running the SQL above, the editor should function. If you encounter the TypeScript error again
              later, you should regenerate your local Supabase types.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SQLEditor;
