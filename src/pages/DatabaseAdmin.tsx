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

  useEffect(() => {
    if (selectedTable) fetchRows(selectedTable);
    else setRows([]);
  }, [selectedTable]);

  // --- Create new table ---
  const createTable = async () => {
    if (!newTableName || columns.length === 0) {
      toast.warning("Table name and at least one column required.");
      return;
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
    const primaryKey = Object.keys(row).find(key => key === 'id') || Object.keys(row)[0];
    const primaryValue = row[primaryKey];
    
    const sql = `UPDATE ${selectedTable} SET ${colKey} = '${newValue}' WHERE ${primaryKey} = '${primaryValue}';`;
    
    try {
      const { error } = await supabase.rpc("execute_sql", { sql });
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
    const primaryKey = Object.keys(row).find(key => key === 'id') || Object.keys(row)[0];
    const primaryValue = row[primaryKey];
    
    const sql = `DELETE FROM ${selectedTable} WHERE ${primaryKey} = '${primaryValue}';`;
    
    try {
      const { error } = await supabase.rpc("execute_sql", { sql });
      if (error) throw error;
      toast.success("Row deleted!");
      fetchRows(selectedTable);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Delete row failed.");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Database Admin Panel</h1>

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
                                <Button
                                  size="sm"
                                  onClick={() => updateCell(rowIdx, colKey, editValue)}
                                  className="h-8"
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingCell(null)}
                                  className="h-8"
                                >
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
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteRow(rowIdx)}
                          >
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

export default DatabaseAdminPanel;
