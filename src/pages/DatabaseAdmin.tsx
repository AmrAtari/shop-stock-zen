import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TableInfo {
  table_name: string;
}

const DatabaseAdmin = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch list of tables
  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const { data, error } = await supabase.rpc("list_tables");
      if (error) throw error;
      setTables(data || []);
    } catch (err: any) {
      console.error("Failed to fetch tables:", err);
      toast.error("Failed to fetch tables: " + err.message);
    } finally {
      setLoadingTables(false);
    }
  };

  // Fetch table data
  const fetchTableData = async (table: string) => {
    setLoadingData(true);
    try {
      let query = supabase.from(table).select("*");

      // Optional search
      if (searchTerm.trim()) {
        // If table has a 'name' column
        query = query.ilike("name", `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTableData(data || []);
    } catch (err: any) {
      console.error("Failed to fetch table data:", err);
      toast.error("Failed to fetch table data: " + err.message);
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Reload table data when table changes or search term changes
  useEffect(() => {
    if (selectedTable) fetchTableData(selectedTable);
  }, [selectedTable, searchTerm]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Database Admin</h3>

      {/* Table selection */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Search table..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loadingTables ? (
          <span>Loading tables...</span>
        ) : (
          <select
            className="border rounded p-2"
            value={selectedTable || ""}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            <option value="">Select a table</option>
            {tables.map((t) => (
              <option key={t.table_name} value={t.table_name}>
                {t.table_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table data display */}
      {selectedTable && (
        <div className="overflow-x-auto border rounded">
          {loadingData ? (
            <div className="p-4 text-center">Loading table data...</div>
          ) : tableData.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No data found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(tableData[0]).map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, i) => (
                  <TableRow key={i}>
                    {Object.keys(row).map((col) => (
                      <TableCell key={col}>{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseAdmin;
