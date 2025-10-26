// src/pages/DatabaseAdmin.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface RowData {
  [key: string]: any;
}

const DatabaseAdmin: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [rows, setRows] = useState<RowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
  const pageSize = 20;

  // --- Load all public tables ---
  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public");

      if (error) throw error;
      setTables(data.map((t: any) => t.table_name));
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch tables.");
    }
  };

  // --- Detect primary key of table ---
  const fetchPrimaryKey = async (table: string) => {
    try {
      const { data, error } = await supabase
        .from("information_schema.table_constraints")
        .select("constraint_name")
        .eq("table_name", table)
        .eq("constraint_type", "PRIMARY KEY");

      if (error) throw error;
      if (data && data.length > 0) {
        const constraint = data[0].constraint_name;
        // Get the column name of the primary key
        const { data: cols, error: colErr } = await supabase
          .from("information_schema.key_column_usage")
          .select("column_name")
          .eq("table_name", table)
          .eq("constraint_name", constraint)
          .single();
        if (colErr) throw colErr;
        setPrimaryKey(cols.column_name);
      } else {
        setPrimaryKey(columns[0] || "");
      }
    } catch (err: any) {
      console.error(err.message);
      setPrimaryKey(columns[0] || "");
    }
  };

  // --- Load rows for selected table with search and pagination ---
  const fetchRows = async (table: string, page: number = 1, search: string = "") => {
    if (!table) return;
    setLoading(true);
    try {
      let query = supabase
        .from(table)
        .select("*")
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (search) {
        // Search in all string columns
        columns.forEach((col) => {
          query = query.ilike(col, `%${search}%`);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) {
        setRows(data);
        setColumns(Object.keys(data[0]));
        fetchPrimaryKey(table);
      } else {
        setRows([]);
      }
    } catch (err: any) {
      console.error(err.message);
      toast.error("Failed to fetch rows.");
    } finally {
      setLoading(false);
    }
  };

  // --- Insert a new row ---
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

  // --- Update a row ---
  const updateRow = async (row: RowData) => {
    if (!selectedTable || !primaryKey) return;
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

  // --- Delete selected rows ---
  const deleteSelectedRows = async () => {
    if (!selectedTable || !primaryKey || selectedRows.size === 0) return;
    if (!window.confirm(`Delete ${selectedRows.size} selected rows?`)) return;

    try {
      for (const key of selectedRows) {
        const { error } = await supabase.from(selectedTable).delete().eq(primaryKey, key);
        if (error) throw error;
      }
      toast.success("Selected rows deleted!");
      setSelectedRows(new Set());
      fetchRows(selectedTable, page, searchTerm);
    } catch (err: any) {
      console.error(err.message);
      toast.error("Delete failed.");
    }
  };

  // --- Export table to CSV ---
  const exportCSV = () => {
    if (!rows.length) return;
    const csvContent = [columns.join(","), ...rows.map((r) => columns.map((col) => r[col]).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${selectedTable}.csv`);
    link.click();
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) fetchRows(selectedTable, page, searchTerm);
  }, [selectedTable, page, searchTerm]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Database Admin Panel</h1>

      {/* Table Selector */}
      <select
        value={selectedTable}
        onChange={(e) => {
          setSelectedTable(e.target.value);
          setPage(1);
          setSearchTerm("");
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
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Button onClick={() => fetchRows(selectedTable, 1, searchTerm)}>Search</Button>
        </div>
      )}

      {/* Actions */}
      {selectedTable && (
        <div className="mt-4 flex gap-2">
          <Button onClick={insertRow}>Add New Row</Button>
          <Button onClick={deleteSelectedRows} variant="destructive" disabled={selectedRows.size === 0}>
            Delete Selected
          </Button>
          <Button onClick={exportCSV} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
      {selectedTable && (
        <div className="mt-4 overflow-auto">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.size === rows.length && rows.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedRows(new Set(rows.map((r) => r[primaryKey])));
                        else setSelectedRows(new Set());
                      }}
                    />
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(row[primaryKey])}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedRows);
                          if (checked) newSet.add(row[primaryKey]);
                          else newSet.delete(row[primaryKey]);
                          setSelectedRows(newSet);
                        }}
                      />
                    </TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {rows.length > 0 && (
            <div className="flex gap-2 mt-4">
              <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <span>Page {page}</span>
              <Button disabled={rows.length < pageSize} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseAdmin;
