// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Table {
  table_name: string;
  table_type: string;
}

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

const Dashboard: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tables
  const fetchTables = async () => {
    setLoadingTables(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from<Table>("information_schema.tables")
        .select("*")
        .eq("table_schema", "public");

      if (error) throw error;

      if (data) {
        setTables(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch tables");
    } finally {
      setLoadingTables(false);
    }
  };

  // Fetch columns for selected table
  const fetchColumns = async (tableName: string) => {
    setLoadingColumns(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from<Column>("information_schema.columns")
        .select("*")
        .eq("table_schema", "public")
        .eq("table_name", tableName);

      if (error) throw error;

      if (data) {
        setColumns(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch columns");
    } finally {
      setLoadingColumns(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchColumns(selectedTable);
    } else {
      setColumns([]);
    }
  }, [selectedTable]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Database Dashboard</h1>

      {error && <div className="text-red-600 mb-4">⚠️ {error}</div>}

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Tables</h2>
        {loadingTables ? (
          <div>Loading tables...</div>
        ) : (
          <ul className="space-y-1">
            {tables.map((table) => (
              <li key={table.table_name}>
                <Button
                  variant={selectedTable === table.table_name ? "default" : "outline"}
                  onClick={() => setSelectedTable(table.table_name)}
                >
                  {table.table_name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTable && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Columns in {selectedTable}</h2>
          {loadingColumns ? (
            <div>Loading columns...</div>
          ) : (
            <ul className="space-y-1">
              {columns.map((col) => (
                <li key={col.column_name}>
                  <span className="font-medium">{col.column_name}</span> — {col.data_type}{" "}
                  {col.is_nullable === "NO" ? "(required)" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
