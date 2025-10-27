import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Metric {
  title: string;
  value: number | string;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch overall metrics
  const fetchMetrics = async () => {
    try {
      setError(null);

      // 1️⃣ Fetch all items
      const { data: items, error: itemsError } = await supabase.from("items").select("quantity, price");

      if (itemsError) throw itemsError;

      // 2️⃣ Total item count
      const totalItems = items?.length || 0;

      // 3️⃣ Total inventory value
      const totalValue = items?.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);

      // 4️⃣ Purchase orders count
      const { count: purchaseCount, error: poError } = await supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true });
      if (poError) throw poError;

      // 5️⃣ Stock adjustments count
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

  // ✅ Fetch sales data for chart
  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("created_at, total")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((row) => ({
        date: new Date(row.created_at).toLocaleDateString(),
        total: row.total || 0,
      }));

      setSalesData(formatted);
    } catch (err: any) {
      console.error("Error fetching sales data:", err);
      setError(err.message || "Failed to fetch sales data.");
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchSalesData()]);
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

      {/* 🔹 Metrics */}
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

      {/* 🔹 Sales Chart */}
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
    </div>
  );
};

export default Dashboard;
