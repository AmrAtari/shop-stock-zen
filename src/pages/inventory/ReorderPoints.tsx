import { useState } from "react";
import { useReorderRules, useCreateReorderRule } from "@/hooks/useAdvancedInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, RefreshCw, AlertTriangle } from "lucide-react";

const ReorderPoints = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: rules, isLoading } = useReorderRules();
  const createRule = useCreateReorderRule();

  const [newRule, setNewRule] = useState({
    item_id: "",
    reorder_point: 10,
    reorder_quantity: 50,
    lead_time_days: 7,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRule.mutateAsync(newRule);
    setIsDialogOpen(false);
    setNewRule({
      item_id: "",
      reorder_point: 10,
      reorder_quantity: 50,
      lead_time_days: 7,
    });
  };

  const filteredRules = rules?.filter(rule =>
    rule.items?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.items?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reorder Points</h1>
          <p className="text-muted-foreground">Configure automatic reorder rules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reorder Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Reorder Rule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Item ID</Label>
                <Input
                  value={newRule.item_id}
                  onChange={(e) => setNewRule({ ...newRule, item_id: e.target.value })}
                  placeholder="Enter item ID"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reorder Point</Label>
                  <Input
                    type="number"
                    value={newRule.reorder_point}
                    onChange={(e) => setNewRule({ ...newRule, reorder_point: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Quantity</Label>
                  <Input
                    type="number"
                    value={newRule.reorder_quantity}
                    onChange={(e) => setNewRule({ ...newRule, reorder_quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lead Time (Days)</Label>
                <Input
                  type="number"
                  value={newRule.lead_time_days}
                  onChange={(e) => setNewRule({ ...newRule, lead_time_days: parseInt(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createRule.isPending}>
                {createRule.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Below Reorder Point
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules?.length ? Math.round(rules.reduce((sum, r) => sum + (r.lead_time_days || 0), 0) / rules.length) : 0} days
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading reorder rules...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Preferred Supplier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>No reorder rules configured</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules?.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.items?.name || "N/A"}</TableCell>
                      <TableCell>{rule.items?.sku || "N/A"}</TableCell>
                      <TableCell>{rule.stores?.name || "All Stores"}</TableCell>
                      <TableCell>{rule.reorder_point}</TableCell>
                      <TableCell>{rule.reorder_quantity}</TableCell>
                      <TableCell>{rule.lead_time_days} days</TableCell>
                      <TableCell>{rule.suppliers?.name || "Not Set"}</TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
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

export default ReorderPoints;
