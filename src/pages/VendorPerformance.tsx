import { useState } from "react";
import { useVendorPerformance, useCalculateVendorPerformance } from "@/hooks/useEnhancedPO";
import { useSuppliers } from "@/hooks/usePurchaseOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calculator, TrendingUp, Award, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const VendorPerformance = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: performance, isLoading } = useVendorPerformance();
  const { data: suppliers } = useSuppliers();
  const calculatePerformance = useCalculateVendorPerformance();

  const [calcParams, setCalcParams] = useState({
    supplier_id: "",
    period_start: "",
    period_end: "",
  });

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    await calculatePerformance.mutateAsync(calcParams);
    setIsDialogOpen(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (score >= 50) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  // Calculate summary stats
  const avgScore = performance?.length 
    ? performance.reduce((sum, p) => sum + (p.overall_score || 0), 0) / performance.length 
    : 0;
  const excellentVendors = performance?.filter(p => (p.overall_score || 0) >= 90).length || 0;
  const poorVendors = performance?.filter(p => (p.overall_score || 0) < 50).length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendor Performance</h1>
          <p className="text-muted-foreground">Track and evaluate supplier performance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Performance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calculate Vendor Performance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCalculate} className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select
                  value={calcParams.supplier_id}
                  onValueChange={(value) => setCalcParams({ ...calcParams, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={calcParams.period_start}
                    onChange={(e) => setCalcParams({ ...calcParams, period_start: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={calcParams.period_end}
                    onChange={(e) => setCalcParams({ ...calcParams, period_end: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={calculatePerformance.isPending}>
                {calculatePerformance.isPending ? "Calculating..." : "Calculate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore.toFixed(1)}%
            </div>
            <Progress value={avgScore} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" />
              Excellent Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{excellentVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Poor Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{poorVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading performance data...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>On-Time Delivery</TableHead>
                  <TableHead>Late Deliveries</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>No performance records found</p>
                      <p className="text-sm text-muted-foreground">Calculate performance to start tracking</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  performance?.map((perf) => (
                    <TableRow key={perf.id}>
                      <TableCell className="font-medium">{perf.suppliers?.name || "N/A"}</TableCell>
                      <TableCell>
                        {perf.period_start && perf.period_end
                          ? `${format(new Date(perf.period_start), "MMM yyyy")} - ${format(new Date(perf.period_end), "MMM yyyy")}`
                          : "-"}
                      </TableCell>
                      <TableCell>{perf.total_orders}</TableCell>
                      <TableCell className="text-green-600">{perf.on_time_deliveries}</TableCell>
                      <TableCell className="text-red-600">{perf.late_deliveries}</TableCell>
                      <TableCell>${perf.total_value?.toLocaleString() || 0}</TableCell>
                      <TableCell className={getScoreColor(perf.overall_score || 0)}>
                        {(perf.overall_score || 0).toFixed(1)}%
                      </TableCell>
                      <TableCell>{getScoreBadge(perf.overall_score || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorPerformance;
