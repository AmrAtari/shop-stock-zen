import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, GitPullRequest } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface WorkflowRule {
  id: string;
  name: string;
  document_type: string;
  condition_type: string;
  threshold_value: number | null;
  required_approver_role: string;
  is_active: boolean;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: "purchase_order", label: "Purchase Order" },
  { value: "transfer", label: "Transfer Request" },
  { value: "invoice", label: "Invoice" },
];

const CONDITION_TYPES = [
  { value: "always", label: "Always Required" },
  { value: "value_threshold", label: "Above Value Threshold" },
];

const APPROVER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "inventory_man", label: "Inventory Manager" },
];

const WorkflowRules: React.FC = () => {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    document_type: "purchase_order",
    condition_type: "always",
    threshold_value: "",
    required_approver_role: "admin",
    is_active: true,
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenDialog = (rule?: WorkflowRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        document_type: rule.document_type,
        condition_type: rule.condition_type,
        threshold_value: rule.threshold_value?.toString() || "",
        required_approver_role: rule.required_approver_role,
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: "",
        document_type: "purchase_order",
        condition_type: "always",
        threshold_value: "",
        required_approver_role: "admin",
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.condition_type === "value_threshold" && !formData.threshold_value) {
      toast({
        title: "Validation Error",
        description: "Threshold value is required for value-based conditions",
        variant: "destructive",
      });
      return;
    }

    try {
      const ruleData = {
        name: formData.name,
        document_type: formData.document_type,
        condition_type: formData.condition_type,
        threshold_value:
          formData.condition_type === "value_threshold"
            ? parseFloat(formData.threshold_value)
            : null,
        required_approver_role: formData.required_approver_role,
        is_active: formData.is_active,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("workflow_rules")
          .update(ruleData)
          .eq("id", editingRule.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Workflow rule updated successfully",
        });
      } else {
        const { error } = await supabase.from("workflow_rules").insert(ruleData);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Workflow rule created successfully",
        });
      }

      setDialogOpen(false);
      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (rule: WorkflowRule) => {
    try {
      const { error } = await supabase
        .from("workflow_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Rule ${!rule.is_active ? "enabled" : "disabled"}`,
      });
      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (rule: WorkflowRule) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;

    try {
      const { error } = await supabase.from("workflow_rules").delete().eq("id", rule.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Workflow rule deleted successfully",
      });
      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Workflow Rules</CardTitle>
          <CardDescription>
            Configure approval workflows for documents
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No workflow rules found. Click "Add Rule" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Approver Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <GitPullRequest className="w-4 h-4 mr-2 text-muted-foreground" />
                      {rule.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {DOCUMENT_TYPES.find((dt) => dt.value === rule.document_type)
                      ?.label || rule.document_type}
                  </TableCell>
                  <TableCell>
                    {rule.condition_type === "always"
                      ? "Always"
                      : `Above $${rule.threshold_value?.toLocaleString()}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {rule.required_approver_role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(rule)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rule)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Workflow Rule" : "Add New Workflow Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure approval requirements for documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                placeholder="e.g., High Value PO Approval"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type *</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, document_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition_type">Condition *</Label>
                <Select
                  value={formData.condition_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, condition_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.condition_type === "value_threshold" && (
              <div className="space-y-2">
                <Label htmlFor="threshold_value">Threshold Value ($) *</Label>
                <Input
                  id="threshold_value"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 5000"
                  value={formData.threshold_value}
                  onChange={(e) =>
                    setFormData({ ...formData, threshold_value: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="required_approver_role">Required Approver Role *</Label>
              <Select
                value={formData.required_approver_role}
                onValueChange={(value) =>
                  setFormData({ ...formData, required_approver_role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Rule is active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WorkflowRules;
