import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { mockInventory, mockAdjustments } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

const Reports = () => {
  const profitMargins = useMemo(() => {
    return mockInventory.map(item => ({
      name: item.name,
      margin: ((item.sellingPrice - item.costPrice) / item.sellingPrice * 100).toFixed(1),
      profit: (item.sellingPrice - item.costPrice).toFixed(2),
    })).sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin));
  }, []);

  const stockMovement = useMemo(() => {
    return mockAdjustments.map(adj => ({
      date: adj.date,
      item: adj.itemName,
      change: adj.adjustment,
    }));
  }, []);

  const categoryValue = useMemo(() => {
    const categories = mockInventory.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { totalValue: 0, totalItems: 0 };
      }
      acc[item.category].totalValue += item.quantity * item.sellingPrice;
      acc[item.category].totalItems += item.quantity;
      return acc;
    }, {} as Record<string, { totalValue: number; totalItems: number }>);

    return Object.entries(categories).map(([name, data]) => ({
      name,
      value: Math.round(data.totalValue),
      items: data.totalItems,
    }));
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Detailed insights into your inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryValue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Movement Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockMovement}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="change" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit Margin Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Profit Margin</TableHead>
                <TableHead>Profit per Unit</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitMargins.map((item) => {
                const margin = parseFloat(item.margin);
                const performance = margin > 50 ? 'success' : margin > 30 ? 'warning' : 'destructive';
                
                return (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.margin}%</TableCell>
                    <TableCell>${item.profit}</TableCell>
                    <TableCell>
                      <Badge variant={performance as any}>
                        {margin > 50 ? 'Excellent' : margin > 30 ? 'Good' : 'Low'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAdjustments.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell>{adj.date}</TableCell>
                  <TableCell className="font-medium">{adj.itemName}</TableCell>
                  <TableCell>{adj.previousQty}</TableCell>
                  <TableCell>{adj.newQty}</TableCell>
                  <TableCell>
                    <Badge variant={adj.adjustment > 0 ? 'success' : 'destructive'}>
                      {adj.adjustment > 0 ? '+' : ''}{adj.adjustment}
                    </Badge>
                  </TableCell>
                  <TableCell>{adj.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
