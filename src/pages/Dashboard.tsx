// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TableData {
  tableName: string;
  columns: string[];
  rows: any[];
}

const Dashboard: React.FC = () => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch all table names dynamically
  const fetchTables = async () => {
    setLoading(true);
    try {
      // Get all tables in public schema
      const { data: tablesData, error: tablesError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .neq("table_type", "VIEW");

      if (tablesError) throw tablesError;

      const filteredTables = tablesData!.map((t) => t.table_name);

      const tablePromises = filteredTables.map(async (table) => {
        // Get columns for each table
        const { data: columnsData } = await supabase
          .from("information_schema.columns")
          .select("column_name")
          .eq("table_name", table);

        const columns = columnsData?.map((c) => c.column_name) || [];

        // Fetch first 50 rows for preview
        let rows: any[] = [];
        try {
          const { data: rowsData } = await supabase.from(table).select("*").limit(50);
          rows = rowsData || [];
        } catch (err) {
          rows = [];
        }

        return { tableName: table, columns, rows };
      });

      const allTables = await Promise.all(tablePromises);
      setTables(allTables);
    } catch (err: any) {
      console.error("Failed to fetch tables:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const filteredTables = tables.filter((t) => t.tableName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Database Dashboard</h1>

      <div className="mb-4 flex gap-2">
        <Input placeholder="Search table..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={fetchTables}>Refresh</Button>
      </div>

      {loading ? (
        <p>Loading tables...</p>
      ) : filteredTables.length === 0 ? (
        <p>No tables found.</p>
      ) : (
        filteredTables.map((table) => (
          <div key={table.tableName} className="mb-6 border rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{table.tableName}</h2>
            <div className="overflow-x-auto mb-2">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {table.columns.map((col) => (
                      <th key={col} className="border border-gray-300 px-2 py-1 text-left">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 ? (
                    <tr>
                      <td colSpan={table.columns.length} className="text-center py-2">
                        No data
                      </td>
                    </tr>
                  ) : (
                    table.rows.map((row, idx) => (
                      <tr key={idx}>
                        {table.columns.map((col) => (
                          <td key={col} className="border border-gray-300 px-2 py-1">
                            {row[col]?.toString() || ""}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;
