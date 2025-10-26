// src/pages/DatabaseAdmin.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Play, Eye, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// List of essential tables to display in the viewer
const DB_TABLES = [
  "physical_inventory_sessions",
  "stores",
  "items", // Assuming you have an 'items' or 'inventory' table
  "suppliers",
];

// --- SQL Editor Logic ---

const SqlEditorComponent: React.FC = () => {
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
      // NOTE: This requires the 'execute_raw_sql' RPC function in your Supabase DB.
      // We cast 'supabase.rpc' to 'any' to bypass the TypeScript typing error temporarily.
      const { data, error: rpcError } = await (supabase.rpc as any)("execute_raw_sql", {
        sql_query: query,
      });

      if (rpcError) throw rpcError;

      setResults(data);
      toast.success("Query executed successfully!");
    } catch (err: any) {
      setError(`Error executing query: ${err.message}`);
      toast.error(`Query Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatResults = (data: any) => {
    if (Array.isArray(data)) {
      if (data.length === 0) return "[] (0 rows affected)";
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Code className="w-6 h-6" />
          <span>SQL Query Editor</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Run custom SQL commands directly against the database.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., SELECT * FROM physical_inventory_sessions; OR UPDATE items SET price = 100 WHERE id = 1;"
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
              <pre className="font-mono text-xs whitespace-pre-wrap">{formatResults(results)}</pre>
            </ScrollArea>
          )}
          {!error && results === null && !loading && (
            <p className="text-muted-foreground italic">Execute a query to see the results here.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Table Viewer Logic ---

interface TableViewerProps {
  refreshKey: number; // Used to trigger re-fetches
}

const TableViewerComponent: React.FC<TableViewerProps> = ({ refreshKey }) => {
  const [selectedTable, setSelectedTable] = useState(DB_TABLES[0]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);

  const fetchTableData = useCallback(async (tableName: string) => {
    setLoading(true);
    setTableData([]);
    setColumns([]);

    try {
      // FIX: Cast supabase to 'any' to allow the dynamic table name (string)
      // instead of strictly typed table names (like "v_store_stock_levels").
      const { data, error } = await (supabase as any).from(tableName).select().limit(50); // Limit to 50 rows for performance

      if (error) throw error;

      if (data.length > 0) {
        // Get column names from the keys of the first object
        setColumns(Object.keys(data[0]));
      }
      setTableData(data);
    } catch (err: any) {
      console.error("Error fetching table data:", err);
      toast.error(`Failed to fetch data for ${tableName}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable, fetchTableData, refreshKey]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  // Helper to render complex objects gracefully
  const renderCell = (value: any) => {
    if (typeof value === "object" && value !== null) {
      // For JSON/JSONB columns, show a snippet
      return JSON.stringify(value).substring(0, 30) + (JSON.stringify(value).length > 30 ? "..." : "");
    }
    // Basic rendering for strings/numbers/nulls
    return value === null ? <span className="text-muted-foreground italic">NULL</span> : String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="w-6 h-6" />
          <span>Table Data Viewer</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">View the first 50 rows of essential database tables.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Select value={selectedTable} onValueChange={handleTableSelect}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a table" />
            </SelectTrigger>
            <SelectContent>
              {DB_TABLES.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => fetchTableData(selectedTable)} disabled={loading} variant="outline">
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading data for {selectedTable}...</div>
          ) : (
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background/90 backdrop-blur z-10">
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.length > 0 ? (
                    tableData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {columns.map((col) => (
                          <TableCell key={col} className="text-xs">
                            {renderCell(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length || 1}
                        className="text-center italic text-muted-foreground py-10"
                      >
                        No data found in "{selectedTable}".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Component ---

const DatabaseAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState("viewer");
  const [refreshKey, setRefreshKey] = useState(0); // Key to force viewer refresh after editor runs

  // Simple handler to trigger a viewer refresh after running a query in the editor
  const handleEditorAction = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // NOTE: This component is for ADMIN use. It exposes database access.
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Database Administration Tool</h1>
      <p className="text-muted-foreground">
        **ADMIN WARNING:** Use this tool with extreme caution. All changes are immediate and permanent.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="viewer">
            <Eye className="w-4 h-4 mr-2" />
            Table Viewer
          </TabsTrigger>
          <TabsTrigger value="editor">
            <Code className="w-4 h-4 mr-2" />
            SQL Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer" className="mt-4">
          <TableViewerComponent refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="editor" className="mt-4">
          {/* Placeholder for the SQL editor component (You could integrate the editor logic here and pass handleEditorAction) */}
          <SqlEditorComponent />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span>SQL Editor Setup Requirement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            For the **SQL Editor** tab to function, you **must** create the **`execute_raw_sql`** PostgreSQL function in
            your Supabase project's SQL Editor. Run the following code in your Supabase SQL editor:
          </p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseAdmin;
