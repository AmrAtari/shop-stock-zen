// src/pages/Dashboard.tsx
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

  // Fetch key metrics (inventory count, total value, etc.)
  const fetchMetrics = async () => {
    try {
      setError(null);
      // Example queries (replace table names with your actual ones)
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("quantity, price");

      if (invError) throw invError;

      const totalItems = inventory.length;
      const totalValue = inventory.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
        0
      );

      setMetrics([
        { title: "Total Items", value: totalItems },
        { title: "Total Inventory Value", value: `$${totalValue.toLocaleString()}` },
      ]);
    } catch (err: any) {
      console.error("Error fetching metrics:", err);
      setError(err.message || "Failed to fetch metrics.");
    }
  };

  // Fetch chart data (e.g., daily sales trend)
  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("date, total")
        .order("date", { ascending: true });

      if (error) throw error;
      setSalesData(data || []);
    } catch (err: any) {
      console.error("Error fetching sales data:", err);
      setError(err.message || "Failed to fetch sales data.");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchSalesData()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-xl">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{metric.value}</CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
