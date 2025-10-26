// src/pages/DatabaseAdmin.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Play, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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
      // FIX: Use 'as any' to allow calling the custom RPC function 'execute_raw_sql'
      const { data, error: rpcError } = await (supabase.rpc as any)("execute_raw_sql", {
        sql_query: query,
      });

      if (rpcError) throw rpcError;

      // The function 'execute_raw_sql' is expected to return a JSON object with 'data' or 'message'
      setResults(data);
      toast.success("Query executed successfully!");
    } catch (err: any) {
      // If error is from RPC itself
      if (err.message && err.message.includes("execute_raw_sql")) {
        setError(`Error: RPC Function Missing or Incorrectly Defined. Check your Supabase SQL setup.`);
        toast.error(`Query Failed: RPC Error`);
      } else {
        // If error is from the function output
        setError(`Error executing query: ${err.message || "Unknown error"}`);
        toast.error(`Query Failed: ${err.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatResults = (data: any) => {
    if (Array.isArray(data)) {
      if (data.length === 0) return "[] (0 rows affected)";
      return JSON.stringify(data, null, 2);
    }
    // Handle the case where the RPC function returns a single object (like status/error)
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
          placeholder="e.g., SELECT * FROM items LIMIT 10;"
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
  // MODIFIED: State to hold dynamically loaded table names
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | undefined>(undefined);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);

  // NEW FUNCTION: Fetch all table and view names from the database schema
  const fetchTableNames = async () => {
    try {
      // FIX 1: Use 'as any' to allow calling the custom RPC function
      const { data, error } = await (supabase.rpc as any)("get_schema_tables_and_views");

      if (error) throw error;

      // FIX 2: Check for null/undefined data and ensure it is an array before calling .map()
      const tableNames = (data || []).map((t: { table_name: string }) => t.table_name);
      setAvailableTables(tableNames.sort());

      // Set the first table in the list as the selected table if none is set
      if (tableNames.length > 0) {
        if (!selectedTable || !tableNames.includes(selectedTable)) {
          setSelectedTable(tableNames[0]);
        }
      } else {
        setSelectedTable(undefined);
      }
    } catch (err: any) {
      console.error("Error fetching table names:", err);
      toast.error("Failed to load table list: Check if 'get_schema_tables_and_views' function exists.");
    }
  };

  const fetchTableData = useCallback(async (tableName: string) => {
    setLoading(true);
    setTableData([]);
    setColumns([]);

    try {
      // Use 'as any' to bypass the strictly typed table names
      const { data, error } = await (supabase as any).from(tableName).select().limit(50); // Limit to 50 rows for performance

      if (error) throw error;

      if (data && data.length > 0) {
        // Get column names from the keys of the first object
        setColumns(Object.keys(data[0]));
      }
      setTableData(data || []);
    } catch (err: any) {
      console.error("Error fetching table data:", err);
      toast.error(`Failed to fetch data for ${tableName}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load table names on component mount
    fetchTableNames();
  }, []);

  useEffect(() => {
    // Fetch data whenever selectedTable or refreshKey changes
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
        <p className="text-sm text-muted-foreground">View the first 50 rows of **all** database tables and views.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Select
            value={selectedTable}
            onValueChange={handleTableSelect}
            disabled={loading || availableTables.length === 0}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a table" />
            </SelectTrigger>
            <SelectContent>
              {availableTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => selectedTable && fetchTableData(selectedTable)}
            disabled={loading || !selectedTable}
            variant="outline"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading data for {selectedTable || "table"}...</div>
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
                        {selectedTable ? `No data found in "${selectedTable}".` : "Select a table to view its data."}
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
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
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
          <SqlEditorComponent />
        </TabsContent>
      </Tabs>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span>SQL Function Setup Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            For the **Table Viewer** to list all tables and the **SQL Editor** to run queries, you must create the
            following PostgreSQL functions in your Supabase project's SQL Editor:
          </p>
          <h4 className="font-semibold mt-4">1. Function for Table List (`get_schema_tables_and_views`):</h4>
          <ScrollArea className="h-48 border rounded p-3 bg-gray-50 dark:bg-gray-800">
            <pre className="font-mono text-xs whitespace-pre-wrap">
              {`CREATE OR REPLACE FUNCTION get_schema_tables_and_views()
RETURNS TABLE(table_name TEXT)
LANGUAGE sql
AS $function$
SELECT
    table_name::TEXT
FROM
    information_schema.tables
WHERE
    table_schema = 'public' -- Restrict to public schema
    AND table_type IN ('BASE TABLE', 'VIEW') -- Include both tables and views
    AND table_name NOT IN ('spatial_ref_sys') -- Exclude standard system tables
ORDER BY
    table_name;
$function$;

GRANT EXECUTE ON FUNCTION get_schema_tables_and_views() TO authenticated;
`}
            </pre>
          </ScrollArea>

          <h4 className="font-semibold mt-4">2. Function for Query Execution (`execute_raw_sql`):</h4>
          <ScrollArea className="h-48 border rounded p-3 bg-gray-50 dark:bg-gray-800">
            <pre className="font-mono text-xs whitespace-pre-wrap">
              {`-- WARNING: This exposes raw SQL execution. Secure it properly.
-- NOTE: The RETURN type should be adjusted based on your needs (e.g., SETOF JSONB, or JSONB if wrapping results)
CREATE OR REPLACE FUNCTION execute_raw_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
    -- The use of INTO result will attempt to cast the result of the EXECUTE to JSONB.
    -- This works best for SELECT queries returning a single row or simple statement results.
    EXECUTE 'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
EXCEPTION
    WHEN others THEN
        -- Return a standardized error structure
        RETURN jsonb_build_object('error', TRUE, 'message', SQLERRM, 'detail', SQLSTATE);
END;
$function$;

GRANT EXECUTE ON FUNCTION execute_raw_sql(TEXT) TO authenticated;
`}
            </pre>
          </ScrollArea>
          <p className="text-red-600 font-semibold mt-3">
            ⚠️ **IMPORTANT:** You must run the two SQL scripts above in your Supabase database editor for the
            application to function correctly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseAdmin;
