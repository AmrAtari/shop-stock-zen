// src/pages/DatabaseAdmin.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const PAGE_SIZE = 20;

interface TableRowData {
  [key: string]: any;
}

const DatabaseAdmin = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");

  // Fetch all tables
  const loadTables = async () => {
    try {
      const { data, error } = await supabase.rpc("list_tables"); // Create RPC in Supabase: returns list of table names
      if (error) throw error;
      setTables(data || []);
    } catch (error: any) {
      console.error("Failed to fetch tables:", error);
      toast.error("Failed to fetch tables: " + error.message);
    }
  };

  // Fetch rows for a table
  const loadTableData = async (table: string, currentPage = 1, term = "") => {
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from(table).select("*", { count: "exact" }).range(from, to);

      if (term.trim()) {
        // Apply a simple ILIKE filter to all text columns
        // Note: This only works if your tables have a 'name' column; can be customized per table
        query = query.ilike("name", `%${term.trim()}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setRows(data || []);
      setTotal(count || 0);
      if (data && data.length > 0) {
        setColumns(Object.keys(data[0]));
      } else {
        setColumns([]);
      }
    } catch (error: any) {
      console.error(`Error loading table ${table}:`, error);
      toast.error(error.message || `Failed to load table ${table}`);
    }
  };

  // Execute raw SQL
  const executeSQL = async () => {
    if (!sqlQuery.trim()) return;
    if (!confirm("Are you sure you want to execute this query? Changes are immediate!")) return;

    try {
      const { data, error } = await supabase.rpc("run_sql", { p_sql: sqlQuery }); // Create RPC in Supabase
      if (error) throw error;
      toast.success("Query executed successfully!");
      setSqlQuery("");
      if (activeTable) loadTableData(activeTable, page);
    } catch (error: any) {
      console.error("SQL execution error:", error);
      toast.error("SQL execution failed: " + error.message);
    }
  };

  // Export table to Excel
  const handleExport = () => {
    if (!rows.length) return toast.error("No data to export");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTable || "data");
    XLSX.writeFile(wb, `${activeTable || "data"}.xlsx`);
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (activeTable) {
      setPage(1);
      loadTableData(activeTable, 1);
    }
  }, [activeTable]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Table Selection */}
      <div className="flex items-center gap-2 flex-wrap">
        {tables.map((t) => (
          <Button key={t} variant={t === activeTable ? "default" : "outline"} onClick={() => setActiveTable(t)}>
            {t}
          </Button>
        ))}
      </div>

      {/* Table Data */}
      {activeTable && (
        <>
          <div className="flex items-center gap-2 my-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                loadTableData(activeTable, 1, e.target.value);
                setPage(1);
              }}
            />
            <Button onClick={handleExport}>Export Excel</Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col}>{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  loadTableData(activeTable, page - 1, searchTerm);
                }}
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1);
                  loadTableData(activeTable, page + 1, searchTerm);
                }}
              >
                Next
              </Button>
            </div>
          )}

          {/* Raw SQL Execution */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Execute SQL</h3>
            <Input placeholder="Enter SQL query" value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} />
            <Button className="mt-2" onClick={executeSQL}>
              Run SQL
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DatabaseAdmin;
