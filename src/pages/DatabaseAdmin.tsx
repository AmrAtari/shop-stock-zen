// src/pages/DatabaseAdminPanel.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ColumnDef {
  name: string;
  type: string;
  isPrimary?: boolean;
}

interface ColumnMetadata {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table: string | null;
  foreign_column: string | null;
}

interface TableRow {
  [key: string]: any;
}

const dataTypes = [
  "text",
  "varchar(255)",
  "integer",
  "bigint",
  "boolean",
  "date",
  "timestamp",
  "float",
  "numeric",
  "json",
];

type AdminTab = "queryInput" | "queryResults"; // Define the two tabs

const DatabaseAdminPanel: React.FC = () => {
  // --- Tables ---
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [newTableName, setNewTableName] = useState("");

  // --- Columns for new table ---
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [addColumnName, setAddColumnName] = useState("");
  const [addColumnType, setAddColumnType] = useState("text");
  const [isPrimaryKey, setIsPrimaryKey] = useState(false);

  // --- Data for selected table ---
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // --- Column metadata ---
  const [columnMetadata, setColumnMetadata] = useState<ColumnMetadata[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // --- Column rename state ---
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");

  // --- Foreign key state ---
  const [addingFKColumn, setAddingFKColumn] = useState<string | null>(null);
  const [fkTargetTable, setFkTargetTable] = useState("");
  const [fkTargetColumn, setFkTargetColumn] = useState("");

  // --- SQL Query Execution ---
  // Pre-fill with a valid query for easy testing
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM items;");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [executingQuery, setExecutingQuery] = useState(false);

  // --- Tab State for Query Executor ---
  const [currentTab, setCurrentTab] = useState<AdminTab>("queryInput");

  // --- Load all tables via RPC ---
  const fetchTables = async () => {
    try {
      const { data, error } = await supabase.rpc("list_public_tables");
      if (error) throw error;
      if (data) setTables(data.map((t: any) => t.table_name));
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch tables.");
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // --- Load rows for selected table ---
  const fetchRows = async (table: string) => {
    if (!table) return;
    setLoadingRows(true);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      setRows(data || []);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch table data.");
    } finally {
      setLoadingRows(false);
    }
  };

  // --- Load column metadata for selected table ---
  const fetchColumnMetadata = async (table: string) => {
    if (!table) return;
    setLoadingColumns(true);
    try {
      const { data, error } = await supabase.rpc("get_table_columns", { table_name_param: table });
      if (error) throw error;
      setColumnMetadata(data || []);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch column metadata.");
    } finally {
      setLoadingColumns(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchRows(selectedTable);
      fetchColumnMetadata(selectedTable);
    } else {
      setRows([]);
      setColumnMetadata([]);
    }
  }, [selectedTable]);

  // --- Create new table ---
  const createTable = async () => {
    if (!newTableName || columns.length === 0) {
      toast.warning("Table name and at least one column required.");
      return;
    }

    // Validate table name (only lowercase letters, numbers, and underscores)
    if (!/^[a-z_][a-z0-9_]*$/.test(newTableName)) {
      toast.error("Invalid table name. Use only lowercase letters, numbers, and underscores.");
      return;
    }

    // Validate column names
    for (const col of columns) {
      if (!/^[a-z_][a-z0-9_]*$/.test(col.name)) {
        toast.error(`Invalid column name: ${col.name}. Use only lowercase letters, numbers, and underscores.`);
        return;
      }
    }

    const columnDefs = columns.map((c) => `${c.name} ${c.type}${c.isPrimary ? " PRIMARY KEY" : ""}`).join(", ");
    const sql = `CREATE TABLE ${newTableName} (${columnDefs});`;

    try {
      const { error } = await supabase.rpc("execute_sql", { sql });
      if (error) throw error;
      toast.success(`Table ${newTableName} created!`);
      setNewTableName("");
      setColumns([]);
      fetchTables();
    } catch (err: any) {
      console.error(err.message);
      toast.error("Create table failed.");
    }
  };

  // --- Add column to selected table ---
  const addColumn = async () => {
    if (!selectedTable || !addColumnName || !addColumnType) return;

    // Validate column name (only lowercase letters, numbers, and underscores)
    if (!/^[a-z_][a-z0-9_]*$/.test(addColumnName)) {
      toast.error("Invalid column name. Use only lowercase letters, numbers, and underscores.");
      return;
    }

    const sql = `ALTER TABLE ${selectedTable} ADD COLUMN ${addColumnName} ${addColumnType};`;
    try {
      const { error } = await supabase.rpc("execute_sql", { sql });
      if (error) throw error;
      toast.success(`Column ${addColumnName} added!`);
      setAddColumnName("");
      setAddColumnType("text");
      fetchRows(selectedTable);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Add column failed.");
    }
  };

  // --- Delete table ---
  const deleteTable = async () => {
    if (!selectedTable) return;
    if (!window.confirm(`Delete table ${selectedTable}? Cannot be undone.`)) return;
    const sql = `DROP TABLE ${selectedTable};`;
    try {
      const { error } = await supabase.rpc("execute_sql", { sql });
      if (error) throw error;
      toast.success(`Table ${selectedTable} deleted!`);
      setSelectedTable("");
      setRows([]);
      fetchTables();
    } catch (err: any) {
      console.error(err.message);
      toast.error("Delete table failed.");
    }
  };

  // --- Update cell value ---
  const updateCell = async (rowIdx: number, colKey: string, newValue: string) => {
    if (!selectedTable || rows.length === 0) return;

    const row = rows[rowIdx];
    const primaryKey = Object.keys(row).find((key) => key === "id") || Object.keys(row)[0];
    const primaryValue = row[primaryKey];

    try {
      // Use Supabase client methods to prevent SQL injection
      const { error } = await supabase
        .from(selectedTable)
        .update({ [colKey]: newValue })
        .eq(primaryKey, primaryValue);

      if (error) throw error;
      toast.success("Cell updated!");
      fetchRows(selectedTable);
      setEditingCell(null);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Update failed.");
    }
  };

  // --- Delete row ---
  const deleteRow = async (rowIdx: number) => {
    if (!selectedTable || rows.length === 0) return;
    if (!window.confirm("Delete this row?")) return;

    const row = rows[rowIdx];
    const primaryKey = Object.keys(row).find((key) => key === "id") || Object.keys(row)[0];
    const primaryValue = row[primaryKey];

    try {
      // Use Supabase client methods to prevent SQL injection
      const { error } = await supabase.from(selectedTable).delete().eq(primaryKey, primaryValue);

      if (error) throw error;
      toast.success("Row deleted!");
      fetchRows(selectedTable);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Delete row failed.");
    }
  };

  // --- Rename column ---
  const renameColumn = async (oldName: string, newName: string) => {
    if (!selectedTable || !newName.trim()) return;
    try {
      const { data, error } = await supabase.rpc("rename_column", {
        table_name_param: selectedTable,
        old_column_name: oldName,
        new_column_name: newName,
      });
      if (error) throw error;
      toast.success("Column renamed successfully!");
      setRenamingColumn(null);
      setNewColumnName("");
      fetchColumnMetadata(selectedTable);
      fetchRows(selectedTable);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Rename column failed: " + err.message);
    }
  };

  // --- Add foreign key ---
  const addForeignKey = async (columnName: string, targetTable: string, targetColumn: string) => {
    if (!selectedTable || !targetTable || !targetColumn) return;
    try {
      const { data, error } = await supabase.rpc("add_foreign_key", {
        table_name_param: selectedTable,
        column_name_param: columnName,
        foreign_table_param: targetTable,
        foreign_column_param: targetColumn,
      });
      if (error) throw error;
      toast.success("Foreign key added successfully!");
      setAddingFKColumn(null);
      setFkTargetTable("");
      setFkTargetColumn("");
      fetchColumnMetadata(selectedTable);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Add foreign key failed: " + err.message);
    }
  };

  // --- Execute SQL Query ---
  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.warning("Please enter a SQL query.");
      return;
    }

    setExecutingQuery(true);
    setQueryResult(null);

    // Switch to the results tab after execution
    setCurrentTab("queryResults");

    try {
      // Execute the SQL query via RPC.
      const { data, error } = await supabase.rpc("execute_sql", { sql: sqlQuery });
      if (error) throw error;

      let resultType = "command";
      const sqlUpper = sqlQuery.trim().toUpperCase();
      if (sqlUpper.startsWith("SELECT")) {
        resultType = "select";
      }

      let message = "Query executed successfully";
      let actualData = data;

      // FIX: Correctly check the data type returned by the RPC
      if (Array.isArray(data)) {
        // This is the array of rows from a SELECT query.
        if (data.length > 0) {
          message = `${data.length} row(s) returned.`;
        } else {
          message = "Query executed successfully (0 rows returned).";
        }
        actualData = data; // Keep the array for table rendering
      } else if (data && typeof data === "object" && "success" in data) {
        // This is the verbose success object from a command (INSERT, UPDATE, etc.) or an empty SELECT.
        message = data.message || message;
        actualData = data; // Keep the object to display its message
      }

      setQueryResult({
        success: true,
        message: message,
        data: actualData,
        type: resultType,
      });

      toast.success("Query executed!");
      // Refresh tables list if it was a CREATE/DROP TABLE
      if (sqlUpper.includes("CREATE TABLE") || sqlUpper.includes("DROP TABLE")) {
        fetchTables();
      }
    } catch (err: any) {
      console.error(err.message);
      setQueryResult({ success: false, error: err.message });
      toast.error("Query failed: " + err.message);
    } finally {
      setExecutingQuery(false);
    }
  };

  // Component for reusable tab button styling
  const TabButton: React.FC<{ tab: AdminTab; children: React.ReactNode }> = ({ tab, children }) => (
    <button
      onClick={() => setCurrentTab(tab)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        currentTab === tab
          ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  const renderQueryInput = () => (
    <div className="space-y-4 pt-4">
      <textarea
        value={sqlQuery}
        onChange={(e) => setSqlQuery(e.target.value)}
        placeholder="SELECT * FROM items WHERE category = 'Electronics';"
        className="w-full h-32 p-3 border rounded font-mono text-sm resize-y bg-background"
      />
      <Button onClick={executeQuery} disabled={executingQuery} className="w-full">
        {executingQuery ? "Executing..." : "Execute Query"}
      </Button>
    </div>
  );

  const renderQueryResults = () => {
    if (!queryResult) {
      return (
        <div className="mt-4 p-4 border rounded bg-muted/50 text-center text-muted-foreground">
          No query has been executed yet.
        </div>
      );
    }

    // FIX: This check is the most important part for displaying the table.
    const isTableData =
      queryResult.success &&
      Array.isArray(queryResult.data) &&
      queryResult.data.length > 0 &&
      typeof queryResult.data[0] === "object";

    // Check if the result is successful but NOT table data (e.g., SELECT COUNT(*) or an UPDATE command)
    const isNonTableData = queryResult.success && !isTableData && (queryResult.data || queryResult.message);

    return (
      <div className="mt-4 p-4 border rounded bg-muted/50">
        <h3 className="text-lg font-semibold mb-2">Query Results:</h3>
        {queryResult.success ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 font-semibold">✓ Success</span>
              <span className="text-sm">{queryResult.message}</span>
            </div>

            {/* Render the HTML Table if isTableData is TRUE */}
            {isTableData ? (
              <div className="overflow-x-auto mt-2">
                <table className="table-auto border-collapse border w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(queryResult.data[0]).map((col) => (
                        <th key={col} className="border px-2 py-1 text-left font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.data.map((row: any, idx: number) => (
                      <tr key={idx} className="border-t hover:bg-muted/50">
                        {Object.values(row).map((val: any, i: number) => (
                          <td key={i} className="border px-2 py-1">
                            {val?.toString() || "(null)"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isNonTableData && queryResult.data && !Array.isArray(queryResult.data) ? (
              // Render JSON for non-table data (like the success object or a count result)
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                {JSON.stringify(queryResult.data, null, 2)}
              </pre>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-destructive font-semibold">✗ Error</span>
            </div>
            <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded overflow-x-auto">
              {queryResult.error}
            </pre>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Database Admin Panel</h1>
        <div className="text-sm text-muted-foreground">Admin Only</div>
      </div>

      {/* SQL Query Executor with Tabs */}
      <div className="border p-4 rounded-lg space-y-2 bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Direct Database Access</h2>
          <span className="text-xs text-destructive">⚠️ Use with caution</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Execute custom SQL queries. SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE are supported.
        </p>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <TabButton tab="queryInput">Execute SQL Query</TabButton>
          <TabButton tab="queryResults">Query Results</TabButton>
        </div>

        {/* Tab Content */}
        {currentTab === "queryInput" && renderQueryInput()}
        {currentTab === "queryResults" && renderQueryResults()}
      </div>

      {/* Create Table */}
      <div className="border p-4 rounded-lg space-y-2">
        <h2 className="text-xl font-semibold">Create New Table</h2>
        <Input placeholder="Table Name" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} />

        {/* Add columns */}
        <div className="flex gap-2 mt-2">
          <Input placeholder="Column Name" value={addColumnName} onChange={(e) => setAddColumnName(e.target.value)} />
          <Select onValueChange={setAddColumnType} value={addColumnType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {dataTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 px-3 border rounded-md bg-background">
            <input
              type="checkbox"
              checked={isPrimaryKey}
              onChange={(e) => setIsPrimaryKey(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm">Primary Key</span>
          </label>
          <Button
            onClick={() => {
              if (!addColumnName) return;
              setColumns([...columns, { name: addColumnName, type: addColumnType, isPrimary: isPrimaryKey }]);
              setAddColumnName("");
              setAddColumnType("text");
              setIsPrimaryKey(false);
            }}
          >
            Add Column
          </Button>
        </div>

        {/* Column list */}
        {columns.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-muted-foreground mb-2">Columns to be created:</p>
            {columns.map((c, idx) => (
              <div key={idx} className="flex gap-2 items-center p-2 border rounded bg-muted/50">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">({c.type})</span>
                {c.isPrimary && <span className="text-green-600 font-bold text-sm">PRIMARY KEY</span>}
                <Button size="sm" variant="destructive" onClick={() => setColumns(columns.filter((_, i) => i !== idx))}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button className="mt-2" onClick={createTable}>
          Create Table
        </Button>
      </div>

      {/* Existing Tables */}
      <div className="border p-4 rounded-lg space-y-2">
        <h2 className="text-xl font-semibold">Existing Tables</h2>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="border p-2 rounded"
          disabled={tables.length === 0}
        >
          <option value="">Select Table</option>
          {tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {tables.length === 0 && <p>No tables found in database.</p>}

        {selectedTable && (
          <div className="flex gap-2 mt-2">
            <Button onClick={addColumn}>Add Column</Button>
            <Button variant="destructive" onClick={deleteTable}>
              Delete Table
            </Button>
          </div>
        )}

        {/* Column Structure */}
        {selectedTable && (
          <div className="mt-4 border p-2 rounded">
            <h3 className="font-semibold mb-2">Column Structure: {selectedTable}</h3>
            {loadingColumns ? (
              <p>Loading columns...</p>
            ) : columnMetadata.length === 0 ? (
              <p>No columns found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto border-collapse border w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-2 py-1 text-left">Column Name</th>
                      <th className="border px-2 py-1 text-left">Type</th>
                      <th className="border px-2 py-1 text-left">Nullable</th>
                      <th className="border px-2 py-1 text-left">Default</th>
                      <th className="border px-2 py-1 text-left">Keys</th>
                      <th className="border px-2 py-1 text-left">Foreign Key</th>
                      <th className="border px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columnMetadata.map((col, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/50">
                        <td className="border px-2 py-1">
                          {renamingColumn === col.column_name ? (
                            <div className="flex gap-1">
                              <Input
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className="h-8 text-xs"
                                placeholder="new_column_name"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => renameColumn(col.column_name, newColumnName)}
                                className="h-8 text-xs"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRenamingColumn(null);
                                  setNewColumnName("");
                                }}
                                className="h-8 text-xs"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{col.column_name}</span>
                          )}
                        </td>
                        <td className="border px-2 py-1">{col.data_type}</td>
                        <td className="border px-2 py-1">{col.is_nullable}</td>
                        <td className="border px-2 py-1 text-xs max-w-[150px] truncate">{col.column_default || "-"}</td>
                        <td className="border px-2 py-1">
                          <div className="flex gap-1">
                            {col.is_primary_key && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">PK</span>
                            )}
                            {col.is_foreign_key && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-1 rounded">FK</span>
                            )}
                          </div>
                        </td>
                        <td className="border px-2 py-1 text-xs">
                          {col.is_foreign_key && col.foreign_table && col.foreign_column ? (
                            <span className="text-purple-600">
                              → {col.foreign_table}.{col.foreign_column}
                            </span>
                          ) : addingFKColumn === col.column_name ? (
                            <div className="flex gap-1 items-center">
                              <Select value={fkTargetTable} onValueChange={setFkTargetTable}>
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue placeholder="Table" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tables.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="column"
                                value={fkTargetColumn}
                                onChange={(e) => setFkTargetColumn(e.target.value)}
                                className="h-7 w-20 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => addForeignKey(col.column_name, fkTargetTable, fkTargetColumn)}
                                className="h-7 text-xs"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAddingFKColumn(null);
                                  setFkTargetTable("");
                                  setFkTargetColumn("");
                                }}
                                className="h-7 text-xs"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRenamingColumn(col.column_name);
                                setNewColumnName(col.column_name);
                              }}
                              disabled={renamingColumn !== null}
                              className="h-7 text-xs"
                            >
                              Rename
                            </Button>
                            {!col.is_foreign_key && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddingFKColumn(col.column_name)}
                                disabled={addingFKColumn !== null}
                                className="h-7 text-xs"
                              >
                                Add FK
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Table Data */}
        {selectedTable && (
          <div className="mt-4 border p-2 rounded">
            <h3 className="font-semibold mb-2">Data: {selectedTable}</h3>
            {loadingRows ? (
              <p>Loading...</p>
            ) : rows.length === 0 ? (
              <p>No data found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto border-collapse border w-full">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col} className="border px-2 py-1 text-left">
                          {col}
                        </th>
                      ))}
                      <th className="border px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t hover:bg-muted/50">
                        {Object.entries(row).map(([colKey, val], colIdx) => (
                          <td key={colIdx} className="border px-2 py-1">
                            {editingCell?.rowIdx === rowIdx && editingCell?.colKey === colKey ? (
                              <div className="flex gap-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateCell(rowIdx, colKey, editValue);
                                    } else if (e.key === "Escape") {
                                      setEditingCell(null);
                                    }
                                  }}
                                />
                                <Button size="sm" onClick={() => updateCell(rowIdx, colKey, editValue)} className="h-8">
                                  ✓
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingCell(null)} className="h-8">
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer hover:bg-accent/50 px-1 py-0.5 rounded"
                                onClick={() => {
                                  setEditingCell({ rowIdx, colKey });
                                  setEditValue(val?.toString() || "");
                                }}
                              >
                                {val?.toString() || "(null)"}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="border px-2 py-1">
                          <Button size="sm" variant="destructive" onClick={() => deleteRow(rowIdx)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// *** CORRECTED EXPORT: Changed from default to NAMED EXPORT ***
export { DatabaseAdminPanel };
