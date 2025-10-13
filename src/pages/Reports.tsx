import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useReportsData } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";

const Reports = () => {
  const { categoryValue, stockMovement, profitMargins, recentAdjustments, isLoading, error } = useReportsData();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed insights into your inventory</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading reports: {(error as Error).message}</div>
      </div>
    );
  }

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
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
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
                  dataKey="adjustment" 
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
                const margin = item.margin;
                const performance = margin > 50 ? 'success' : margin > 30 ? 'warning' : 'destructive';
                
                return (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{margin.toFixed(1)}%</TableCell>
                    <TableCell>${item.profit.toFixed(2)}</TableCell>
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
              {recentAdjustments.map((adj, index) => (
                <TableRow key={index}>
                  <TableCell>{adj.created_at}</TableCell>
                  <TableCell className="font-medium">{adj.item_name}</TableCell>
                  <TableCell>{adj.previous_quantity}</TableCell>
                  <TableCell>{adj.new_quantity}</TableCell>
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
