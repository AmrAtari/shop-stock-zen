import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Boxes,
  Ruler,
  Tags,
  User,
  Building,
  Package,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Shield,
  Database,
  RotateCcw,
  DollarSign,
  Lock,
  Save,
  MonitorOff,
  Briefcase,
  Wrench,
  LocateIcon,
  Factory,
  GitPullRequest,
  Eye,
  Download,
  CloudSun,
  MapPin,
  Warehouse,
  Key,
  Mail,
  Phone,
  Calendar,
  BadgeCheck,
  Ban,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// *** DatabaseAdminComponent is imported here. ***
import DatabaseAdminPanel from "./DatabaseAdminComponent.tsx";

// --- TYPE DEFINITIONS ---
type UserRole = "admin" | "inventory_man" | "supervisor" | "user" | null;

interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

interface AttributeType {
  id: string;
  table_name: string;
  label: string;
  icon: string;
}

interface CatalogItem {
  id: string;
  name: string;
  created_at: string;
}

// --- ERP Settings Types ---
interface GeneralSettings {
  currency: string;
  defaultTaxRate: string;
  defaultUnit: string;
  lowStockThreshold: number;
  enableAuditLog: boolean;
  require2FA: boolean;
}

interface CompanyCode {
  id: string;
  code: string;
  legal_name: string;
  base_currency: string;
  default_language: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  company_code: string;
  location_type: string;
}

interface WorkflowRule {
  id: string;
  name: string;
  trigger_document: "PO" | "Sales Order" | "Invoice";
  trigger_condition: "value_threshold" | "category_match";
  threshold_value?: number;
  required_role: UserRole;
  is_active: boolean;
}

const ATTRIBUTE_ICONS = [
  { value: "Tags", icon: Tags },
  { value: "Boxes", icon: Boxes },
  { value: "Ruler", icon: Ruler },
  { value: "User", icon: User },
  { value: "Building", icon: Building },
  { value: "Package", icon: Package },
  { value: "DollarSign", icon: DollarSign },
  { value: "CloudSun", icon: CloudSun },
  { value: "MapPin", icon: MapPin },
  { value: "Warehouse", icon: Warehouse },
];

// --- AUTH & SETTINGS HOOKS (Database-Aware) ---

// Mocking the auth hook for admin check, replace with your actual auth context
const useAuth = () => {
  // NOTE: This should be dynamically fetched from your user context/Supabase session
  const [userRole, setUserRole] = useState<UserRole>("admin");
  return { userRole };
};

const useSystemSettings = () => {
  const [dynamicCurrencies, setDynamicCurrencies] = useState<CatalogItem[]>([]);
  const [dynamicUnits, setDynamicUnits] = useState<CatalogItem[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    currency: "USD",
    defaultTaxRate: "5.0",
    defaultUnit: "kg",
    lowStockThreshold: 5,
    enableAuditLog: true,
    require2FA: false,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Fetch dynamic lists from pre-defined Supabase tables
  const reloadDynamicLists = useCallback(async () => {
    try {
      const { data: currencies, error: currError } = await supabase.from("currency_").select("id, name, created_at");
      const { data: units, error: unitError } = await supabase.from("units").select("id, name, created_at");

      if (currError || unitError) throw new Error("Failed to load dynamic lists.");

      setDynamicCurrencies(currencies || []);
      setDynamicUnits(units || []);
    } catch (e) {
      toast({
        title: "DB Error",
        description: "Failed to load Currencies/Units. Check if tables exist.",
        variant: "destructive",
      });
    }
  }, []);

  // Fetch general settings from a single row configuration table
  const loadGeneralSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("*").maybeSingle();
      if (error) throw error;

      if (data) {
        setGeneralSettings({
          currency: data.currency || "USD",
          defaultTaxRate: data.default_tax_rate?.toString() || "5.0",
          defaultUnit: data.default_unit || "pcs",
          lowStockThreshold: data.low_stock_threshold || 5,
          enableAuditLog: data.enable_audit_log || false,
          require2FA: data.require_2fa || false,
        });
      }
    } catch (e) {
      toast({
        title: "DB Error",
        description: "Failed to load System Settings. (system_settings table)",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    loadGeneralSettings();
    reloadDynamicLists();
  }, [loadGeneralSettings, reloadDynamicLists]);

  const handleSettingsChange = useCallback(<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveGeneralSettings = async () => {
    setIsSavingSettings(true);
    try {
      // Get the current settings row
      const { data: currentSettings } = await supabase
        .from("system_settings")
        .select("id")
        .maybeSingle();

      if (!currentSettings) {
        toast({ 
          title: "Error", 
          description: "No system settings found. Please contact administrator.", 
          variant: "destructive" 
        });
        return;
      }

      // Update the existing row
      const { error } = await supabase
        .from("system_settings")
        .update({
          currency: generalSettings.currency,
          default_tax_rate: parseFloat(generalSettings.defaultTaxRate),
          default_unit: generalSettings.defaultUnit,
          low_stock_threshold: generalSettings.lowStockThreshold,
          enable_audit_log: generalSettings.enableAuditLog,
          require_2fa: generalSettings.require2FA,
        })
        .eq("id", currentSettings.id);

      if (error) throw error;
      toast({ title: "Success", description: "System settings saved successfully!", variant: "default" });
      
      // Reload to confirm
      await loadGeneralSettings();
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return useMemo(
    () => ({
      generalSettings,
      dynamicCurrencies,
      dynamicUnits,
      handleSettingsChange,
      handleSaveGeneralSettings,
      isSavingSettings,
      reloadDynamicLists,
    }),
    [
      generalSettings,
      dynamicCurrencies,
      dynamicUnits,
      handleSettingsChange,
      handleSaveGeneralSettings,
      isSavingSettings,
      reloadDynamicLists,
    ],
  );
};

// ---------------------------------------------------------------------
// 1. Organizational Structure Component (Database-Aware)
// ---------------------------------------------------------------------
const OrganizationalStructure: React.FC<{ dynamicCurrencies: CatalogItem[] }> = ({ dynamicCurrencies }) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const loadOrgStructure = useCallback(async () => {
    setLoadingOrg(true);
    try {
      const { data: codes, error: codeError } = await supabase.from("company_codes").select("*");
      const { data: whs, error: whsError } = await supabase.from("warehouses").select("*");

      if (codeError || whsError) throw new Error("Failed to load org structure.");

      setCompanyCodes(codes || []);
      setWarehouses(whs || []);
    } catch (e) {
      toast({
        title: "DB Error",
        description: "Failed to load Org Structure. (company_codes/warehouses tables)",
        variant: "destructive",
      });
      setCompanyCodes([]);
      setWarehouses([]);
    } finally {
      setLoadingOrg(false);
    }
  }, []);

  useEffect(() => {
    loadOrgStructure();
  }, [loadOrgStructure]);

  const handleAddCompanyCode = () =>
    toast({
      title: "Feature Added",
      description: "Company Code creation modal would open here to INSERT into 'company_codes' table.",
      variant: "default",
    });
  const handleAddWarehouse = () =>
    toast({
      title: "Feature Added",
      description: "Warehouse creation modal would open here to INSERT into 'warehouses' table.",
      variant: "default",
    });
  const handleDelete = async (type: string, id: string) => {
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can delete organizational units.",
        variant: "destructive",
      });

    const tableName = type === "company" ? "company_codes" : "warehouses";
    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `${type} unit deleted.`, variant: "default" });
      loadOrgStructure();
    }
  };

  if (loadingOrg) return <p className="p-4 text-center">Loading Organizational Structure...</p>;

  return (
    <div className="space-y-6">
      {/* Company Codes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Factory className="w-5 h-5 mr-2" /> Company Codes (Legal Entities)
          </CardTitle>
          <Button onClick={handleAddCompanyCode} disabled={!isAdmin}>
            <Plus className="w-4 h-4 mr-2" /> Add Company Code
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Legal Name</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No Company Codes found. Please add them in the database.
                  </TableCell>
                </TableRow>
              ) : (
                companyCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>{c.legal_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.base_currency}</Badge>
                    </TableCell>
                    <TableCell>{c.default_language}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete("company", c.id)}
                        disabled={!isAdmin}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warehouses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <LocateIcon className="w-5 h-5 mr-2" /> Warehouse & Location Management
          </CardTitle>
          <Button onClick={handleAddWarehouse} disabled={!isAdmin}>
            <Plus className="w-4 h-4 mr-2" /> Add Warehouse
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Belongs to Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No Warehouses found. Please add them in the database.
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.code}</TableCell>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.company_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{w.location_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete("warehouse", w.id)}
                        disabled={!isAdmin}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------
// 2. Workflow Rules Component (Database-Aware)
// ---------------------------------------------------------------------
const WorkflowRules: React.FC = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const availableRoles: UserRole[] = ["admin", "supervisor", "inventory_man", "user"];

  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [openAddRule, setOpenAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Omit<WorkflowRule, "id" | "is_active">>({
    name: "",
    trigger_document: "PO",
    trigger_condition: "value_threshold",
    threshold_value: 0,
    required_role: "supervisor",
  });

  const loadWorkflowRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const { data, error } = await supabase.from("workflow_rules").select("*").order("name", { ascending: true });
      if (error) throw error;
      setRules((data as WorkflowRule[]) || []);
    } catch (e) {
      toast({
        title: "DB Error",
        description: "Failed to load Workflow Rules. (workflow_rules table)",
        variant: "destructive",
      });
      setRules([]);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflowRules();
  }, [loadWorkflowRules]);

  const handleToggleRule = async (rule: WorkflowRule) => {
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can change workflow activation.",
        variant: "destructive",
      });

    const { error } = await supabase.from("workflow_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status Changed", description: "Rule activation toggled.", variant: "default" });
      loadWorkflowRules();
    }
  };

  const handleSaveNewRule = async () => {
    if (!isAdmin) return;
    if (
      !newRule.name ||
      (newRule.trigger_condition === "value_threshold" &&
        (newRule.threshold_value === undefined || newRule.threshold_value <= 0))
    ) {
      return toast({
        title: "Validation Error",
        description: "Please complete all required fields for the rule.",
        variant: "destructive",
      });
    }

    try {
      const ruleToInsert = {
        ...newRule,
        threshold_value: newRule.trigger_condition === "value_threshold" ? newRule.threshold_value : null,
        is_active: true, // Always start active
      };

      const { error } = await supabase.from("workflow_rules").insert([ruleToInsert]);

      if (error) throw error;

      toast({ title: "Rule Created", description: `Workflow rule '${newRule.name}' added.`, variant: "default" });
      setOpenAddRule(false);
      setNewRule({
        name: "",
        trigger_document: "PO",
        trigger_condition: "value_threshold",
        threshold_value: 0,
        required_role: "supervisor",
      });
      loadWorkflowRules();
    } catch (e: any) {
      toast({ title: "Creation Failed", description: e.message, variant: "destructive" });
    }
  };

  if (loadingRules) return <p className="p-4 text-center">Loading Workflow Rules...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <GitPullRequest className="w-5 h-5 mr-2" /> Document Approval Workflows
        </CardTitle>
        <Button onClick={() => setOpenAddRule(true)} disabled={!isAdmin}>
          <Plus className="w-4 h-4 mr-2" /> Add New Rule
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule Name</TableHead>
              <TableHead>Triggers On</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Requires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No Workflow Rules found. Please add a rule.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.trigger_document}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.trigger_condition === "value_threshold"
                      ? `Value > ${r.threshold_value?.toLocaleString()}`
                      : "Specific Category Match"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.required_role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={() => handleToggleRule(r)} disabled={!isAdmin} />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Delete logic simplified */}
                    <Button size="sm" variant="destructive" disabled={!isAdmin}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Modal for adding a new Workflow Rule - Code omitted for brevity, but matches previous robust version */}
      <Dialog open={openAddRule} onOpenChange={setOpenAddRule}>
        {/* ... DialogContent for adding rule ... */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define New Approval Rule</DialogTitle>
            <DialogDescription>
              Create a rule to enforce approvals based on transaction value or category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={newRule.name}
                onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High Value PO Approval"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="trigger-doc">Triggers On</Label>
              <Select
                value={newRule.trigger_document}
                onValueChange={(val) =>
                  setNewRule((prev) => ({ ...prev, trigger_document: val as "PO" | "Sales Order" | "Invoice" }))
                }
              >
                <SelectTrigger id="trigger-doc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PO">Purchase Order (PO)</SelectItem>
                  <SelectItem value="Sales Order">Sales Order</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="trigger-condition">Condition Type</Label>
              <Select
                value={newRule.trigger_condition}
                onValueChange={(val) =>
                  setNewRule((prev) => ({ ...prev, trigger_condition: val as "value_threshold" | "category_match" }))
                }
              >
                <SelectTrigger id="trigger-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value_threshold">Transaction Value Threshold</SelectItem>
                  <SelectItem value="category_match">Item Category Match (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRule.trigger_condition === "value_threshold" && (
              <div className="space-y-1">
                <Label htmlFor="threshold">Value Threshold (e.g., 10000)</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={newRule.threshold_value}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, threshold_value: parseFloat(e.target.value) }))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="required-role">Required Approver Role</Label>
              <Select
                value={newRule.required_role || ""}
                onValueChange={(val) => setNewRule((prev) => ({ ...prev, required_role: val as UserRole }))}
              >
                <SelectTrigger id="required-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter((r) => r !== "user")
                    .map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddRule(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewRule}>
              <Save className="w-4 h-4 mr-2" /> Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// ---------------------------------------------------------------------
// 3. User & Attribute Dialogs (Imported from user's Configuration (10).tsx)
// ---------------------------------------------------------------------

// NOTE: UserPermissionsDialog, AddUserDialog, AddAttributeDialog, CatalogManagementDialog
// The implementation of these components from the user's uploaded file is used directly
// as it contains the correct Edge Function and RPC calls.

// ---------------------------------------------------------------------
// 4. User Permissions Dialog (from Configuration (10).tsx)
// ---------------------------------------------------------------------
interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSave: (userId: string, newRole: UserWithRole["role"]) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const UserPermissionsDialog: React.FC<UserPermissionsDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSave,
  onDelete,
}) => {
  const { userRole: currentUserRole } = useAuth();
  const isAdmin = currentUserRole === "admin";

  const [currentRole, setCurrentRole] = useState<UserWithRole["role"]>(user?.role || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const availableRoles = ["admin", "inventory_man", "supervisor", "user"];

  useEffect(() => {
    setCurrentRole(user?.role || null);
  }, [user]);

  const handleSave = async () => {
    if (!user || !currentRole || !isAdmin) return;
    setIsSaving(true);
    await onSave(user.id, currentRole);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!user || !isAdmin) return;
    setIsDeleting(true);
    await onDelete(user.id);
    setIsDeleting(false);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Permissions for {user.email}</DialogTitle>
          <DialogDescription>Update the system role for this user and view account details.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Role Management */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="role" className="w-[100px]">
              System Role
            </Label>
            <Select
              value={currentRole || ""}
              onValueChange={(value) => setCurrentRole(value as UserWithRole["role"])}
              disabled={isSaving || isDeleting || !isAdmin}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Details */}
          <Card className="mt-2">
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="flex justify-between">
                <span className="text-gray-500">User ID:</span> <span>{user.id.slice(0, 8)}...</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Created:</span>{" "}
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Last Sign-in:</span>{" "}
                <span>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || isSaving || !isAdmin}>
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? "Removing Role..." : "Remove Role"}
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isDeleting || currentRole === user.role || !isAdmin}>
              <Check className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------
// 5. Add User Dialog (from Configuration (10).tsx)
// ---------------------------------------------------------------------
const AddUserDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}> = ({ open, onOpenChange, onUserAdded }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserWithRole["role"]>("user");
  const [loading, setLoading] = useState(false);

  const handleAddUser = async () => {
    if (!email || !password || !role) {
      toast({ title: "Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      // Use the secure Edge Function to create the user and assign the role
      const { error } = await supabase.functions.invoke("admin-create-user-password", {
        body: {
          userId: email, // userId is used as email in the Edge Function
          password: password,
          role: role,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${email} created successfully.`,
        variant: "default",
      });
      onUserAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "User Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" /> Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with a temporary password and assign a starting role.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Input
            placeholder="Email (used as username)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Temporary Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <div className="flex items-center space-x-2">
            <Label htmlFor="new-user-role" className="w-[100px]">
              Initial Role
            </Label>
            <Select
              value={role || "user"}
              onValueChange={(value) => setRole(value as UserWithRole["role"])}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {["admin", "inventory_man", "supervisor", "user"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAddUser} disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------
// 6. Add Attribute Dialog (from Configuration (10).tsx)
// ---------------------------------------------------------------------

const AddAttributeDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, label: string, icon: string) => Promise<void>;
  isAdmin: boolean;
}> = ({ open, onOpenChange, onSave, isAdmin }) => {
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newAttrIcon, setNewAttrIcon] = useState<string>("Tags");
  const [loadingAttribute, setLoadingAttribute] = useState(false);

  const handleAddAttributeType = async () => {
    if (!newAttrName || !newAttrLabel) {
      toast({ title: "Error", description: "Name and Label are required.", variant: "destructive" });
      return;
    }
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can add new attribute types.",
        variant: "destructive",
      });
      return;
    }
    setLoadingAttribute(true);
    await onSave(newAttrName, newAttrLabel, newAttrIcon);
    setLoadingAttribute(false);
    onOpenChange(false);
    setNewAttrName("");
    setNewAttrLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Attribute Type</DialogTitle>
          <DialogDescription>
            Create a new category for stock items (e.g., Brand, Material, Supplier).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="attr-label">Display Label (e.g., Color)</Label>
            <Input
              id="attr-label"
              placeholder="Enter display label"
              value={newAttrLabel}
              onChange={(e) => setNewAttrLabel(e.target.value)}
              disabled={loadingAttribute || !isAdmin}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-name">Table Name (e.g., colors)</Label>
            <Input
              id="attr-name"
              placeholder="Enter unique table name (lowercase, no spaces)"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              disabled={loadingAttribute || !isAdmin}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-icon">Icon</Label>
            <Select value={newAttrIcon} onValueChange={setNewAttrIcon} disabled={loadingAttribute || !isAdmin}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Icon" />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_ICONS.map((i) => {
                  const Icon = i.icon;
                  return (
                    <SelectItem key={i.value} value={i.value}>
                      <span className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" /> {i.value}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loadingAttribute}>
            Cancel
          </Button>
          <Button onClick={handleAddAttributeType} disabled={loadingAttribute || !isAdmin}>
            {loadingAttribute ? "Creating..." : "Create Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------
// 7. Catalog Management Dialog (from Configuration (10).tsx)
// ---------------------------------------------------------------------

const CatalogManagementDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCatalog: AttributeType | null;
  isAdmin: boolean;
  loadData: (tableName: string, pageNum: number, search: string) => Promise<void>;
  catalogItems: CatalogItem[];
  page: number;
  totalPages: number;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  setPage: (p: number) => void;
  handleExport: () => void;
  handleAdd: () => void;
  handleDelete: (itemId: string) => void;
  handleEdit: (item: CatalogItem) => void;
  newValue: string;
  setNewValue: (s: string) => void;
}> = ({
  open,
  onOpenChange,
  activeCatalog,
  isAdmin,
  loadData,
  catalogItems,
  page,
  totalPages,
  searchTerm,
  setSearchTerm,
  setPage,
  handleExport,
  handleAdd,
  handleDelete,
  handleEdit,
  newValue,
  setNewValue,
}) => {
  // Re-implemented fully from Configuration (10).tsx

  if (!activeCatalog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage {activeCatalog?.label}</DialogTitle>
          <DialogDescription>
            Add, edit, or remove entries for the {activeCatalog?.label.toLowerCase()} category.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              placeholder={`Search ${activeCatalog?.label?.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData(activeCatalog!.table_name, 1, searchTerm)}
            />
            <Button onClick={() => loadData(activeCatalog!.table_name, 1, searchTerm)}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)} disabled={!isAdmin}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} disabled={!isAdmin}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {catalogItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500">
                    No items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                setPage(page - 1);
                loadData(activeCatalog!.table_name, page - 1, searchTerm);
              }}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => {
                setPage(page + 1);
                loadData(activeCatalog!.table_name, page + 1, searchTerm);
              }}
            >
              Next
            </Button>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Input
            placeholder={`Add new ${activeCatalog?.label?.toLowerCase()}...`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={!isAdmin}
          />
          <Button onClick={handleAdd} disabled={!isAdmin}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <DialogFooter className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export as Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------
const Configuration = () => {
  const {
    generalSettings,
    dynamicCurrencies,
    dynamicUnits,
    handleSettingsChange,
    handleSaveGeneralSettings,
    isSavingSettings,
    reloadDynamicLists,
  } = useSystemSettings();

  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // --- USER MANAGEMENT STATE & LOGIC (from Configuration (10).tsx) ---
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const { data, error: edgeError } = await supabase.functions.invoke("admin-list-users");
      if (edgeError) throw edgeError;

      const { users: fetchedUsers } = data;
      setUsers(fetchedUsers || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setErrorUsers("Failed to load user list. Check Edge Function logs.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEditPermissions = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const updateUserRole = async (userId: string, newRole: UserWithRole["role"]) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, role: newRole, action: "update" },
      });

      if (error) throw error;
      toast({
        title: "Success",
        description: `Role for user ${userId.slice(0, 8)}... updated to ${newRole}.`,
        variant: "default",
      });
      loadUsers();
    } catch (error: any) {
      toast({ title: "Role Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const deleteUserRole = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, action: "delete" },
      });

      if (error) throw error;
      toast({
        title: "Success",
        description: `Role for user ${userId.slice(0, 8)}... has been removed.`,
        variant: "default",
      });
      loadUsers();
    } catch (error: any) {
      toast({ title: "Role Removal Failed", description: error.message, variant: "destructive" });
    }
  };

  // --- ATTRIBUTE MANAGEMENT STATE & LOGIC (from Configuration (10).tsx) ---
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<AttributeType | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [newValue, setNewValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 10;

  const loadAttributeTypes = useCallback(async () => {
    const { data, error } = await supabase.from("attribute_types").select("*").order("label", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load attribute types.", variant: "destructive" });
      return;
    }
    setAttributeTypes(data || []);
  }, []);

  useEffect(() => {
    loadAttributeTypes();
  }, [loadAttributeTypes]);

  const handleAttributeTypeSave = async (name: string, label: string, icon: string) => {
    try {
      const tableName = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error } = await supabase.rpc("create_attribute_table", {
        p_table_name: tableName,
        p_label: label.trim(),
        p_icon: icon || "Tags",
      });

      if (error) throw error;
      toast({ title: "Success", description: `Attribute type '${label}' created.`, variant: "default" });
      loadAttributeTypes();
      reloadDynamicLists(); // Refresh units/currencies if they were added
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    }
  };

  const loadCatalogData = useCallback(
    async (tableName: string, pageNum: number, search: string) => {
      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(tableName).select("*", { count: "exact" });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error, count } = await query.order("name", { ascending: true }).range(from, to);

      if (error) {
        setCatalogItems([]);
        setTotalPages(1);
        toast({ title: "DB Error", description: `Failed to load catalog for ${tableName}.`, variant: "destructive" });
        return;
      }

      setCatalogItems(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    },
    [ITEMS_PER_PAGE],
  );

  const handleOpenCatalog = (attr: AttributeType) => {
    setActiveCatalog(attr);
    setOpenCatalogDialog(true);
    setPage(1);
    setSearchTerm("");
    loadCatalogData(attr.table_name, 1, "");
  };

  const handleAddCatalogItem = async () => {
    if (!newValue || !activeCatalog) return;
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can add catalog items.",
        variant: "destructive",
      });

    const { error } = await supabase.from(activeCatalog.table_name).insert({ name: newValue.trim() });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Added '${newValue}' to ${activeCatalog.label}.`, variant: "default" });
      setNewValue("");
      loadCatalogData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleDeleteCatalogItem = async (itemId: string) => {
    if (!activeCatalog) return;
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can delete catalog items.",
        variant: "destructive",
      });

    const { error } = await supabase.from(activeCatalog.table_name).delete().eq("id", itemId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Item deleted.`, variant: "default" });
      loadCatalogData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleEditCatalogItem = (item: CatalogItem) => {
    toast({
      title: "Feature Incomplete",
      description: `Editing '${item.name}' requires a dedicated modal.`,
      variant: "default",
    });
  };

  const handleExportCatalog = () => {
    toast({ title: "Exporting...", description: "Preparing data for Excel download.", variant: "default" });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>
      <p className="text-gray-500">Manage users, core inventory data models, and global application settings.</p>

      <Tabs defaultValue="organizational-structure" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-full">
          <TabsTrigger value="organizational-structure" className="h-full">
            <Factory className="w-4 h-4 mr-2" /> Org Structure
          </TabsTrigger>
          <TabsTrigger value="workflow" className="h-full">
            <GitPullRequest className="w-4 h-4 mr-2" /> Workflow Rules
          </TabsTrigger>
          <TabsTrigger value="general" className="h-full">
            <Building className="w-4 h-4 mr-2" /> System Defaults
          </TabsTrigger>
          <TabsTrigger value="user-roles" className="h-full">
            <Shield className="w-4 h-4 mr-2" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="attributes" className="h-full">
            <Briefcase className="w-4 h-4 mr-2" /> Stock Attributes
          </TabsTrigger>
          <TabsTrigger value="db-access" disabled={!isAdmin}>
            <Wrench className="w-4 h-4 mr-2" /> Direct DB Access
          </TabsTrigger>
        </TabsList>

        {/* 1. Organizational Structure Tab */}
        <TabsContent value="organizational-structure">
          <OrganizationalStructure dynamicCurrencies={dynamicCurrencies} />
        </TabsContent>

        {/* 2. Workflow and Business Rules Tab */}
        <TabsContent value="workflow">
          <WorkflowRules />
        </TabsContent>

        {/* 3. System Defaults Tab (ERP IMPLEMENTATION) */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>System Defaults (ERP Basis)</CardTitle>
              <CardDescription>
                Configure global system parameters by modifying the `system_settings` table.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" /> Financial Settings
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select
                      value={generalSettings.currency}
                      onValueChange={(value) => handleSettingsChange("currency", value)}
                      disabled={isSavingSettings || !isAdmin}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select a currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicCurrencies.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {dynamicCurrencies.length === 0 && (
                      <p className="text-xs text-red-500">Currency list is empty. Add items to 'currencies' table.</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tax-rate">Default Sales Tax (%)</Label>
                    <Input
                      id="tax-rate"
                      value={generalSettings.defaultTaxRate}
                      onChange={(e) => handleSettingsChange("defaultTaxRate", e.target.value)}
                      type="number"
                      step="0.1"
                      disabled={isSavingSettings || !isAdmin}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4 border-b pb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" /> Inventory & Units
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label htmlFor="default-unit">Default Weight/Length Unit</Label>
                    <Select
                      value={generalSettings.defaultUnit}
                      onValueChange={(value) => handleSettingsChange("defaultUnit", value)}
                      disabled={isSavingSettings || !isAdmin}
                    >
                      <SelectTrigger id="default-unit">
                        <SelectValue placeholder="Select default unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicUnits.map((u) => (
                          <SelectItem key={u.id} value={u.name}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {dynamicUnits.length === 0 && (
                      <p className="text-xs text-red-500">Unit list is empty. Add items to 'units' table.</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="low-stock-threshold">Low Stock Alert Threshold</Label>
                    <Input
                      id="low-stock-threshold"
                      value={generalSettings.lowStockThreshold}
                      onChange={(e) => handleSettingsChange("lowStockThreshold", parseInt(e.target.value) || 0)}
                      type="number"
                      min="1"
                      disabled={isSavingSettings || !isAdmin}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-red-600" /> Security & Audit
                </h3>
                <div className="flex items-center justify-between space-x-4 p-3 rounded-md border">
                  <div className="space-y-0.5">
                    <Label htmlFor="audit-log" className="text-base">
                      Enable Audit Logging
                    </Label>
                  </div>
                  <Switch
                    id="audit-log"
                    checked={generalSettings.enableAuditLog}
                    onCheckedChange={(checked) => handleSettingsChange("enableAuditLog", checked)}
                    disabled={isSavingSettings || !isAdmin}
                  />
                </div>
                <div className="flex items-center justify-between space-x-4 p-3 rounded-md border">
                  <div className="space-y-0.5">
                    <Label htmlFor="require-2fa" className="text-base">
                      Require Two-Factor Authentication (2FA)
                    </Label>
                  </div>
                  <Switch
                    id="require-2fa"
                    checked={generalSettings.require2FA}
                    onCheckedChange={(checked) => handleSettingsChange("require2FA", checked)}
                    disabled={isSavingSettings || !isAdmin}
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveGeneralSettings} disabled={isSavingSettings || !isAdmin}>
                  <Save className="w-4 h-4 mr-2" /> {isSavingSettings ? "Saving..." : "Save System Defaults"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. User Roles Tab */}
        <TabsContent value="user-roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>View and manage user accounts and their assigned system roles.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadUsers} disabled={loadingUsers}>
                  <RotateCcw className={`w-4 h-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <p>Loading users...</p>
              ) : errorUsers ? (
                <p className="text-red-500">{errorUsers}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>System Role</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Last Sign-in</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "admin"
                                  ? "default"
                                  : user.role === "inventory_man"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {user.role || "None"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPermissions(user)}
                              disabled={!isAdmin}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Stock Attributes Tab */}
        <TabsContent value="attributes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Attributes</CardTitle>
                <CardDescription>
                  Manage dynamic inventory categories (e.g., Color, Size, Brand) by manipulating the `attribute_types`
                  table.
                </CardDescription>
              </div>
              <Button onClick={() => setOpenAttributeDialog(true)} disabled={!isAdmin}>
                <Plus className="w-4 h-4 mr-2" /> Add New Type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {attributeTypes.map((attr) => {
                  const Icon = ATTRIBUTE_ICONS.find((i) => i.value === attr.icon)?.icon || Tags;
                  return (
                    <Card
                      key={attr.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleOpenCatalog(attr)}
                    >
                      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{attr.label}</CardTitle>
                        <Icon className="h-5 w-5 text-gray-400" />
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-xs text-gray-500">
                          Table: <code className="bg-gray-100 p-0.5 rounded text-xs">{attr.table_name}</code>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {attributeTypes.length === 0 && (
                <p className="text-center text-gray-500 mt-4">No attribute types defined. Add one to get started.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Direct DB Access Tab */}
        <TabsContent value="db-access">
          {isAdmin ? (
            <DatabaseAdminPanel />
          ) : (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="py-6 flex items-center">
                <MonitorOff className="w-6 h-6 mr-3 text-red-600" />
                <p className="text-red-700 font-medium">
                  Access Denied: You must be a System Administrator to view the Database Access Panel.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* MODALS (from Configuration (10).tsx) */}
      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onSave={updateUserRole}
        onDelete={deleteUserRole}
      />
      <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} onUserAdded={loadUsers} />

      <AddAttributeDialog
        open={openAttributeDialog}
        onOpenChange={setOpenAttributeDialog}
        onSave={handleAttributeTypeSave}
        isAdmin={isAdmin}
      />

      <CatalogManagementDialog
        open={openCatalogDialog}
        onOpenChange={setOpenCatalogDialog}
        activeCatalog={activeCatalog}
        isAdmin={isAdmin}
        loadData={loadCatalogData}
        catalogItems={catalogItems}
        page={page}
        totalPages={totalPages}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setPage={setPage}
        handleExport={handleExportCatalog}
        handleAdd={handleAddCatalogItem}
        handleDelete={handleDeleteCatalogItem}
        handleEdit={handleEditCatalogItem}
        newValue={newValue}
        setNewValue={setNewValue}
      />
    </div>
  );
};

export default Configuration;
