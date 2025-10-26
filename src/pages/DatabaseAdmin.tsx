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

  // --- Data for selected table ---
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

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
          <Select onValueChange={setAddColumnType} defaultValue={addColumnType} value={addColumnType}>
            <SelectTrigger>
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
          <Button
            onClick={() => {
              if (!addColumnName) return;
              setColumns([...columns, { name: addColumnName, type: addColumnType }]);
              setAddColumnName("");
              setAddColumnType("text");
            }}
          >
            Add Column
          </Button>
        </div>

        {/* Column list */}
        {columns.length > 0 && (
          <div className="mt-2 space-y-1">
            {columns.map((c, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span>{c.name}</span>
                <span>{c.type}</span>
                {c.isPrimary && <span className="text-green-600 font-bold">PK</span>}
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
              <table className="table-auto border-collapse border w-full">
                <thead>
                  <tr className="bg-gray-100">
                    {Object.keys(rows[0]).map((col) => (
                      <th key={col} className="border px-2 py-1">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="border px-2 py-1">
                          {val?.toString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseAdminPanel;
