import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
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

  // ✅ Fetch main KPIs
  const fetchMetrics = async () => {
    try {
      setError(null);

      const { data: items, error: itemsError } = await supabase.from("items").select("quantity, price");
      if (itemsError) throw itemsError;

      const totalItems = items?.length || 0;
      const totalValue = items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);

      const { count: purchaseCount, error: poError } = await supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true });
      if (poError) throw poError;

      const { count: stockAdjustments, error: adjError } = await supabase
        .from("stock_adjustments")
        .select("*", { count: "exact", head: true });
      if (adjError) throw adjError;

      setMetrics([
        { title: "Total Items", value: totalItems },
        { title: "Inventory Value", value: `$${totalValue.toLocaleString()}` },
        { title: "Purchase Orders", value: purchaseCount || 0 },
        { title: "Stock Adjustments", value: stockAdjustments || 0 },
      ]);
    } catch (err: any) {
      console.error("Error fetching metrics:", err);
      setError(err.message || "Failed to fetch metrics.");
    }
  };

  // ✅ Fetch sales chart safely
  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase.from("sales").select("*").order("created_at", { ascending: true });

      if (error) throw error;

      // Try to detect the total field automatically
      const totalField =
        data && data.length > 0
          ? Object.keys(data[0]).find((k) => ["total", "grand_total", "amount", "total_amount"].includes(k))
          : null;

      const formatted = (data || []).map((row) => ({
        date: new Date(row.created_at).toLocaleDateString(),
        total: totalField ? row[totalField] || 0 : 0,
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

      const formatted = Object.entries(grouped).map(([name, value]) => ({
        name,
        value,
      }));
      setCategoryData(formatted);
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
        const key = r.stores?.name || `Store ${r.store_id}`;
        grouped[key] = (grouped[key] || 0) + (r.quantity || 0);
      });

      setStoreData(Object.entries(grouped).map(([name, value]) => ({ name, value })));
    } catch (err: any) {
      console.error("Error fetching store data:", err);
    }
  };

  // ✅ Top items by quantity
  const fetchTopItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("name, quantity")
        .order("quantity", { ascending: false })
        .limit(5);
      if (error) throw error;
      setTopItems(data || []);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-xl">⚠️ {error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{metric.value}</CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.length > 0 ? (
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

      {/* Categories + Stores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
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
              <p className="text-gray-500 text-sm">No category data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items per Store</CardTitle>
          </CardHeader>
          <CardContent>
            {storeData.length > 0 ? (
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
              <p className="text-gray-500 text-sm">No store data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Items by Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          {topItems.length > 0 ? (
            <ul className="space-y-2">
              {topItems.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No item data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
