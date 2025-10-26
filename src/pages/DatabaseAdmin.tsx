// src/pages/DatabaseManager.tsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface RowData {
  [key: string]: any;
}

const DatabaseManager: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [rows, setRows] = useState<RowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 1️⃣ Load all table names
  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public"); // only public tables

      if (error) throw error;
      setTables(data.map((t: any) => t.table_name));
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch tables.");
    }
  };

  // 2️⃣ Load rows for selected table with search and pagination
  const fetchRows = async (table: string, page: number = 1, search: string = "") => {
    if (!table) return;
    setLoading(true);
    try {
      let query = supabase
        .from(table)
        .select("*")
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (search && columns.length > 0) {
        // Search on first column only for simplicity
        query = query.ilike(columns[0], `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) {
        setRows(data);
        setColumns(Object.keys(data[0]));
      } else {
        setRows([]);
        if (!columns.length) setColumns([]);
      }
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch rows.");
    } finally {
      setLoading(false);
    }
  };

  // 3️⃣ Insert a new row
  const insertRow = async () => {
    if (!selectedTable || columns.length === 0) return;

    const emptyRow: RowData = {};
    columns.forEach((col) => (emptyRow[col] = ""));
    try {
      const { error } = await supabase.from(selectedTable).insert([emptyRow]);
      if (error) throw error;
      toast.success("New row inserted!");
      fetchRows(selectedTable, page, searchTerm);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Insert failed.");
    }
  };

  // 4️⃣ Update a row
  const updateRow = async (row: RowData) => {
    if (!selectedTable) return;
    const primaryKey = columns[0]; // Assuming first column is primary key
    try {
      const { error } = await supabase.from(selectedTable).update([row]).eq(primaryKey, row[primaryKey]);
      if (error) throw error;
      toast.success("Row updated!");
      fetchRows(selectedTable, page, searchTerm);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Update failed.");
    }
  };

  // 5️⃣ Delete a row
  const deleteRow = async (row: RowData) => {
    if (!selectedTable) return;
    const primaryKey = columns[0]; // Assuming first column is primary key
    if (!window.confirm(`Delete row ${row[primaryKey]}?`)) return;
    try {
      const { error } = await supabase.from(selectedTable).delete().eq(primaryKey, row[primaryKey]);
      if (error) throw error;
      toast.success("Row deleted!");
      fetchRows(selectedTable, page, searchTerm);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Delete failed.");
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);
  useEffect(() => {
    fetchRows(selectedTable, page, searchTerm);
  }, [selectedTable, page, searchTerm]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Database Manager</h1>

      {/* Table Selector */}
      <select
        value={selectedTable}
        onChange={(e) => {
          setSelectedTable(e.target.value);
          setPage(1);
        }}
      >
        <option value="">Select Table</option>
        {tables.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Search */}
      {selectedTable && columns.length > 0 && (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder={`Search by ${columns[0]}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={() => fetchRows(selectedTable, 1, searchTerm)}>Search</Button>
        </div>
      )}

      {/* Table */}
      {selectedTable && (
        <>
          <div className="mt-4">
            <Button onClick={insertRow} className="mb-2">
              Add New Row
            </Button>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((col) => (
                        <TableCell key={col}>
                          <input
                            value={row[col] ?? ""}
                            onChange={(e) => (row[col] = e.target.value)}
                            className="border p-1 w-full"
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button onClick={() => updateRow(row)} className="mr-2">
                          Save
                        </Button>
                        <Button onClick={() => deleteRow(row)} variant="destructive">
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex gap-2 mt-4">
            <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Prev
            </Button>
            <span>Page {page}</span>
            <Button disabled={rows.length < pageSize} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DatabaseManager;
