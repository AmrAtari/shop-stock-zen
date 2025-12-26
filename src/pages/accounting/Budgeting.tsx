import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { useBudgetPeriods, useBudgetLines, useCreateBudgetPeriod, useCreateBudgetLine, useBudgetSummary } from "@/hooks/useBudgeting";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Budgeting = () => {
  const { formatCurrency } = useSystemSettings();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showNewPeriodDialog, setShowNewPeriodDialog] = useState(false);
  const [showNewLineDialog, setShowNewLineDialog] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: "",
    start_date: "",
    end_date: "",
    fiscal_year: new Date().getFullYear(),
  });
  const [newLine, setNewLine] = useState({
    account_id: "",
    budgeted_amount: 0,
    notes: "",
  });

  const { data: periods = [], isLoading: periodsLoading } = useBudgetPeriods();
  const { data: budgetLines = [], isLoading: linesLoading } = useBudgetLines(selectedPeriodId || undefined);
  const { data: summary } = useBudgetSummary(selectedPeriodId || "");
  const createPeriod = useCreateBudgetPeriod();
  const createLine = useCreateBudgetLine();

  // Fetch accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name, account_type")
        .eq("is_active", true)
        .order("account_code");
      if (error) throw error;
      return data;
    },
  });

  const handleCreatePeriod = async () => {
    try {
      await createPeriod.mutateAsync({ ...newPeriod, status: "draft" });
      setShowNewPeriodDialog(false);
      setNewPeriod({ name: "", start_date: "", end_date: "", fiscal_year: new Date().getFullYear() });
      toast.success("Budget period created successfully");
    } catch (error) {
      toast.error("Failed to create budget period");
    }
  };

  const handleCreateLine = async () => {
    if (!selectedPeriodId) return;
    try {
      await createLine.mutateAsync({
        budget_period_id: selectedPeriodId,
        account_id: newLine.account_id,
        budgeted_amount: newLine.budgeted_amount,
        notes: newLine.notes,
      });
      setShowNewLineDialog(false);
      setNewLine({ account_id: "", budgeted_amount: 0, notes: "" });
      toast.success("Budget line created successfully");
    } catch (error) {
      toast.error("Failed to create budget line");
    }
  };

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return "text-muted-foreground";
    if (variance > 0) return "text-red-500";
    if (variance < 0) return "text-green-500";
    return "text-muted-foreground";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Calculate totals
  const totalBudgeted = budgetLines.reduce((sum, line) => sum + (line.budgeted_amount || 0), 0);
  const totalActual = budgetLines.reduce((sum, line) => sum + (line.actual_amount || 0), 0);
  const totalVariance = totalActual - totalBudgeted;
  const utilizationRate = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budgeting & Forecasting</h1>
          <p className="text-muted-foreground mt-1">Manage budget periods, allocations, and track performance</p>
        </div>
        <Dialog open={showNewPeriodDialog} onOpenChange={setShowNewPeriodDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Budget Period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Budget Period</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Period Name</Label>
                <Input
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  placeholder="e.g., Q1 2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Fiscal Year</Label>
                <Input
                  type="number"
                  value={newPeriod.fiscal_year}
                  onChange={(e) => setNewPeriod({ ...newPeriod, fiscal_year: parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={handleCreatePeriod} disabled={createPeriod.isPending} className="w-full">
                {createPeriod.isPending ? "Creating..." : "Create Period"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Budget Periods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {periodsLoading ? (
            <p className="text-muted-foreground">Loading periods...</p>
          ) : periods.length === 0 ? (
            <p className="text-muted-foreground">No budget periods found. Create one to get started.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {periods.map((period) => (
                <Button
                  key={period.id}
                  variant={selectedPeriodId === period.id ? "default" : "outline"}
                  onClick={() => setSelectedPeriodId(period.id)}
                  className="flex items-center gap-2"
                >
                  {period.name}
                  {getStatusBadge(period.status || "draft")}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPeriod && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedPeriod.start_date), "MMM d")} - {format(new Date(selectedPeriod.end_date), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
                <p className="text-xs text-muted-foreground">
                  {budgetLines.length} line items
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variance</CardTitle>
                {totalVariance > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getVarianceColor(totalVariance)}`}>
                  {totalVariance > 0 ? "+" : ""}{formatCurrency(totalVariance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalVariance > 0 ? "Over budget" : "Under budget"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilization</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${utilizationRate > 100 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
                <Progress value={Math.min(utilizationRate, 100)} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Budget Lines */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Budget Lines</CardTitle>
              <Dialog open={showNewLineDialog} onOpenChange={setShowNewLineDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Line
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Budget Line</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Account</Label>
                      <Select
                        value={newLine.account_id}
                        onValueChange={(value) => setNewLine({ ...newLine, account_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Budgeted Amount</Label>
                      <Input
                        type="number"
                        value={newLine.budgeted_amount}
                        onChange={(e) => setNewLine({ ...newLine, budgeted_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={newLine.notes}
                        onChange={(e) => setNewLine({ ...newLine, notes: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </div>
                    <Button onClick={handleCreateLine} disabled={createLine.isPending} className="w-full">
                      {createLine.isPending ? "Adding..." : "Add Budget Line"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {linesLoading ? (
                <p className="text-muted-foreground">Loading budget lines...</p>
              ) : budgetLines.length === 0 ? (
                <p className="text-muted-foreground">No budget lines found. Add lines to track spending.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Budgeted</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">% Used</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetLines.map((line) => {
                      const variance = (line.actual_amount || 0) - (line.budgeted_amount || 0);
                      const percentUsed = line.budgeted_amount
                        ? ((line.actual_amount || 0) / line.budgeted_amount) * 100
                        : 0;
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.account_id}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.budgeted_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.actual_amount || 0)}</TableCell>
                          <TableCell className={`text-right ${getVarianceColor(variance)}`}>
                            {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={percentUsed > 100 ? "text-red-500" : ""}>{percentUsed.toFixed(1)}%</span>
                              <Progress value={Math.min(percentUsed, 100)} className="w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{line.notes || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Budgeting;
