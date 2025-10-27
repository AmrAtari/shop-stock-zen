import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,// src/pages/Dashboard.tsx
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
          const { data: rowsData } = await supabase
            .from(table)
            .select("*")
            .limit(50);
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

  const filteredTables = tables.filter((t) =>
    t.tableName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Database Dashboard</h1>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search table..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={fetchTables}>Refresh</Button>
      </div>

      {loading ? (
        <p>Loading tables...</p>
      ) : filteredTables.length === 0 ? (
        <p>No tables found.</p>
      ) : (
        filteredTables.map((table) => (
          <div
            key={table.tableName}
            className="mb-6 border rounded-lg p-4 shadow-sm"
          >
            <h2 className="text-xl font-semibold mb-2">{table.tableName}</h2>
            <div className="overflow-x-auto mb-2">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {table.columns.map((col) => (
                      <th
                        key={col}
                        className="border border-gray-300 px-2 py-1 text-left"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={table.columns.length}
                        className="text-center py-2"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    table.rows.map((row, idx) => (
                      <tr key={idx}>
                        {table.columns.map((col) => (
                          <td
                            key={col}
                            className="border border-gray-300 px-2 py-1"
                          >
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

  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface Metric {
  title: string;
  value: number | string;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [storeData, setStoreData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch main metrics
  const fetchMetrics = async () => {
    try {
      setError(null);

      // --- Items ---
      const { data: items, error: itemsError } = await supabase.from("items").select("quantity, price");
      if (itemsError) throw itemsError;

      const totalItems = items?.length || 0;
      const totalValue = items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);

      // --- Sales ---
      const { data: sales, error: salesError } = await supabase.from("sales").select("quantity, price");
      if (salesError) throw salesError;

      const totalSales = sales?.reduce((sum, s) => sum + (s.quantity || 0) * (s.price || 0), 0);
      const totalSoldItems = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0);

      // --- Purchase Orders ---
      const { count: purchaseCount, error: poError } = await supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true });
      if (poError) throw poError;

      // --- Stock Adjustments ---
      const { count: adjustments, error: adjError } = await supabase
        .from("stock_adjustments")
        .select("*", { count: "exact", head: true });
      if (adjError) throw adjError;

      setMetrics([
        { title: "Total Items", value: totalItems },
        { title: "Inventory Value", value: `$${totalValue.toLocaleString()}` },
        { title: "Total Sales Value", value: `$${totalSales.toLocaleString()}` },
        { title: "Items Sold", value: totalSoldItems },
        { title: "Purchase Orders", value: purchaseCount || 0 },
        { title: "Stock Adjustments", value: adjustments || 0 },
      ]);
    } catch (err: any) {
      console.error("Error fetching metrics:", err);
      setError(err.message || "Failed to fetch metrics.");
    }
  };

  // ✅ Fetch sales chart data
  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("created_at, quantity, price")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const grouped: Record<string, number> = {};
      data?.forEach((s) => {
        const date = new Date(s.created_at).toLocaleDateString();
        grouped[date] = (grouped[date] || 0) + (s.quantity || 0) * (s.price || 0);
      });

      const formatted = Object.entries(grouped).map(([date, total]) => ({
        date,
        total,
      }));

      setSalesData(formatted);
    } catch (err: any) {
      console.error("Error fetching sales data:", err);
      setError(err.message || "Failed to fetch sales data.");
    }
  };

  // ✅ Category distribution
  const fetchCategoryData = async () => {
    try {
      const { data, error } = await supabase.from("items").select("category, quantity");
      if (error) throw error;

      const grouped: Record<string, number> = {};
      data?.forEach((i) => {
        const key = i.category || "Uncategorized";
        grouped[key] = (grouped[key] || 0) + (i.quantity || 0);
      });

      setCategoryData(Object.entries(grouped).map(([name, value]) => ({ name, value })));
    } catch (err: any) {
      console.error("Error fetching category data:", err);
    }
  };

  // ✅ Items per store
  const fetchStoreData = async () => {
    try {
      const { data, error } = await supabase.from("store_inventory").select("store_id, quantity, stores(name)");
      if (error) throw error;

      const grouped: Record<string, number> = {};
      data?.forEach((r) => {
        const name = r.stores?.name || `Store ${r.store_id}`;
        grouped[name] = (grouped[name] || 0) + (r.quantity || 0);
      });

      setStoreData(Object.entries(grouped).map(([name, value]) => ({ name, value })));
    } catch (err: any) {
      console.error("Error fetching store data:", err);
    }
  };

  // ✅ Top items by quantity sold
  const fetchTopItems = async () => {
    try {
      const { data, error } = await supabase.from("sales").select("item_id, quantity, price, items(name)").limit(5);
      if (error) throw error;

      const grouped: Record<string, number> = {};
      data?.forEach((s) => {
        const name = s.items?.name || `Item ${s.item_id}`;
        grouped[name] = (grouped[name] || 0) + (s.quantity || 0);
      });

      const sorted = Object.entries(grouped)
        .map(([name, qty]) => ({ name, quantity: qty }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopItems(sorted);
    } catch (err: any) {
      console.error("Error fetching top items:", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchSalesData(), fetchCategoryData(), fetchStoreData(), fetchTopItems()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );

  if (error) return <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-xl">⚠️ {error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{m.value}</CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend (Value Over Time)</CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">No sales data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Categories & Stores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" label>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm">No category data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items per Store</CardTitle>
          </CardHeader>
          <CardContent>
            {storeData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm">No store data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Items Sold</CardTitle>
        </CardHeader>
        <CardContent>
          {topItems.length ? (
            <ul className="space-y-2">
              {topItems.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{i.name}</span>
                  <span className="font-semibold">{i.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No items sold yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
