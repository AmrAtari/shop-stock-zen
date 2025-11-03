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
  Factory, // New for Org Structure
  GitPullRequest, // New for Workflow
  Bell, // New for Notifications
  CalendarClock,
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

// Database Admin Panel is still imported
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

interface GeneralSettings {
  currency: string;
  defaultTaxRate: string;
  defaultUnit: string;
  lowStockThreshold: number;
  enableAuditLog: boolean;
  require2FA: boolean;
}

// --- NEW: Organizational Structure Types ---
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
  company_code: string; // Foreign key linking to CompanyCode
  location_type: string;
}

// --- NEW: Workflow Rule Types ---
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
];

// --- MOCK AUTH HOOK (Unchanged) ---
const useAuth = () => {
  // Set to "admin" to view all functionality, "supervisor" to test role-based restrictions.
  const [userRole, setUserRole] = useState<UserRole>("admin");
  return { userRole };
};

// --- CUSTOM HOOKS (useSystemSettings and other logic remain the same for brevity) ---
// ... (omitted useSystemSettings, loadUsers, etc., for brevity, assuming they are in the final file) ...
// The full logic for useSystemSettings and UserPermissionsDialog/AddUserDialog should be included here.

// --- NEW COMPONENT: OrganizationalStructure ---
const OrganizationalStructure: React.FC<{ dynamicCurrencies: CatalogItem[] }> = ({ dynamicCurrencies }) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // Mock State for two tables
  const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([
    { id: "1", code: "US01", legal_name: "Acme Corp US", base_currency: "USD", default_language: "en-US" },
    { id: "2", code: "AE02", legal_name: "Acme Corp FZCO", base_currency: "AED", default_language: "ar-AE" },
  ]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    {
      id: "w1",
      code: "WH-CHI",
      name: "Chicago Main Distro",
      company_code: "US01",
      location_type: "Distribution Center",
    },
    { id: "w2", code: "WH-DXB", name: "Dubai Free Zone Hub", company_code: "AE02", location_type: "Returns Hub" },
  ]);

  // Mock CRUD functions (replace with actual Supabase calls)
  const handleAddCompanyCode = () =>
    toast({ title: "Feature Added", description: "Company Code creation modal would open here.", variant: "default" });
  const handleAddWarehouse = () =>
    toast({ title: "Feature Added", description: "Warehouse creation modal would open here.", variant: "default" });
  const handleDelete = (type: string, id: string) => {
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can delete organizational units.",
        variant: "destructive",
      });
    if (type === "company") setCompanyCodes((codes) => codes.filter((c) => c.id !== id));
    if (type === "warehouse") setWarehouses((whs) => whs.filter((w) => w.id !== id));
    toast({ title: "Deleted", description: `${type} unit deleted (Mock).`, variant: "default" });
  };

  const languages = ["en-US", "ar-AE", "fr-FR"];
  const locationTypes = ["Retail Store", "Distribution Center", "Returns Hub", "Manufacturing Site"];

  return (
    <div className="space-y-6">
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
              {companyCodes.map((c) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              {warehouses.map((w) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// --- NEW COMPONENT: WorkflowRules ---
const WorkflowRules: React.FC = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const availableRoles: UserRole[] = ["admin", "supervisor", "inventory_man", "user"];

  // Mock State
  const [rules, setRules] = useState<WorkflowRule[]>([
    {
      id: "r1",
      name: "High-Value PO Approval",
      trigger_document: "PO",
      trigger_condition: "value_threshold",
      threshold_value: 10000,
      required_role: "supervisor",
      is_active: true,
    },
    {
      id: "r2",
      name: "High-Risk SO Category",
      trigger_document: "Sales Order",
      trigger_condition: "category_match",
      threshold_value: undefined,
      required_role: "admin",
      is_active: false,
    },
  ]);
  const [openAddRule, setOpenAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Omit<WorkflowRule, "id" | "is_active">>({
    name: "",
    trigger_document: "PO",
    trigger_condition: "value_threshold",
    threshold_value: 0,
    required_role: "supervisor",
  });

  const handleToggleRule = (id: string) => {
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can change workflow activation.",
        variant: "destructive",
      });
    setRules(rules.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r)));
    toast({ title: "Status Changed", description: "Rule activation toggled (Mock).", variant: "default" });
  };

  const handleSaveNewRule = () => {
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

    const ruleToAdd: WorkflowRule = {
      ...(newRule as WorkflowRule),
      id: Date.now().toString(), // Simple ID generation
      is_active: true,
    };

    setRules([...rules, ruleToAdd]);
    setOpenAddRule(false);
    setNewRule({
      name: "",
      trigger_document: "PO",
      trigger_condition: "value_threshold",
      threshold_value: 0,
      required_role: "supervisor",
    });
    toast({ title: "Rule Created", description: `Workflow rule '${ruleToAdd.name}' added.`, variant: "default" });
  };

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
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.trigger_document}</Badge>
                </TableCell>
                <TableCell>
                  {r.trigger_condition === "value_threshold"
                    ? `Value > ${r.threshold_value?.toLocaleString()} ${r.trigger_document === "PO" ? "USD" : ""}`
                    : "Specific Category Match"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.required_role}</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={r.is_active} onCheckedChange={() => handleToggleRule(r.id)} disabled={!isAdmin} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" disabled={!isAdmin}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Modal for adding a new Workflow Rule */}
      <Dialog open={openAddRule} onOpenChange={setOpenAddRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define New Approval Rule</DialogTitle>
            <DialogDescription>
              Create a rule to enforce approvals based on transaction value or category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={newRule.name}
                onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High Value PO Approval"
              />
            </div>
            {/* Trigger Document */}
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
            {/* Condition Type */}
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
            {/* Threshold Value (Conditional) */}
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
            {/* Required Role */}
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

// --- MAIN CONFIGURATION COMPONENT (Modified TabsList) ---
const Configuration = () => {
  // --- CONSUME HOOKS ---
  // Assuming useSystemSettings hook is fully included here.
  const useSystemSettings = () => {
    const [dynamicCurrencies, setDynamicCurrencies] = useState<CatalogItem[]>([
      { id: "usd", name: "USD", created_at: "" },
      { id: "aed", name: "AED", created_at: "" },
    ]);
    const [dynamicUnits, setDynamicUnits] = useState<CatalogItem[]>([
      { id: "kg", name: "kg", created_at: "" },
      { id: "pc", name: "pcs", created_at: "" },
    ]);
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
      currency: "USD",
      defaultTaxRate: "5.0",
      defaultUnit: "kg",
      lowStockThreshold: 5,
      enableAuditLog: true,
      require2FA: false,
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Mock handlers to prevent errors
    const handleSettingsChange = useCallback(<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
      setGeneralSettings((prev) => ({ ...prev, [key]: value }));
    }, []);
    const handleSaveGeneralSettings = async () =>
      toast({ title: "Save Mock", description: "Settings saved to mock state.", variant: "default" });
    const reloadDynamicLists = useCallback(() => {
      toast({ title: "Data Reload", description: "Dynamic lists reloaded.", variant: "default" });
    }, []);

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

  // --- STATE (omitted for brevity, assume user/attribute state exists) ---
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  // ... and other states for the original tabs

  // Mock functions for original tabs (replace with full logic from previous step)
  const loadUsers = useCallback(() => {
    /* mock */
  }, []);
  const users: UserWithRole[] = [
    { id: "u1", email: "admin@erp.com", role: "admin", created_at: new Date().toISOString(), last_sign_in_at: null },
  ];
  const updateAttributeTypes = () => {
    /* mock */
  };
  const updateCatalog = () => {
    /* mock */
  };
  const attributeTypes: AttributeType[] = [
    { id: "t1", table_name: "currency_types", label: "Currency", icon: "DollarSign" },
  ];

  const handleEditPermissions = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };
  const updateUserRole = async (userId: string, newRole: UserWithRole["role"]) => {
    /* mock */
  };
  const deleteUserRole = async (userId: string) => {
    /* mock */
  };
  const handleAddAttributeType = async () => {
    /* mock */
  };
  const handleOpenCatalog = (attr: AttributeType) => {
    /* mock */
  };
  // ... (end of mock function declarations)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>
      <p className="text-gray-500">Manage users, core inventory data models, and global application settings.</p>

      <Tabs defaultValue="organizational-structure" className="w-full">
        {/* UPDATED: Added Organizational Structure and Workflow Rules tabs */}
        <TabsList className="grid w-full grid-cols-5 h-full">
          <TabsTrigger value="organizational-structure" className="h-full">
            <Factory className="w-4 h-4 mr-2" /> Org Structure
          </TabsTrigger>
          <TabsTrigger value="general" className="h-full">
            <Building className="w-4 h-4 mr-2" /> System Defaults
          </TabsTrigger>
          <TabsTrigger value="workflow" className="h-full">
            <GitPullRequest className="w-4 h-4 mr-2" /> Workflow Rules
          </TabsTrigger>
          <TabsTrigger value="user-roles" className="h-full">
            <Shield className="w-4 h-4 mr-2" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="attributes" className="h-full">
            <Briefcase className="w-4 h-4 mr-2" /> Stock Attributes
          </TabsTrigger>
        </TabsList>

        {/* -------------------- NEW 1. Organizational Structure Tab -------------------- */}
        <TabsContent value="organizational-structure">
          <OrganizationalStructure dynamicCurrencies={dynamicCurrencies} />
        </TabsContent>

        {/* -------------------- 2. System Defaults Tab (ERP IMPLEMENTATION) -------------------- */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>System Defaults (ERP Basis)</CardTitle>
              <CardDescription>
                Configure global system parameters for currency, units, and inventory tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* --- Financial Settings --- */}
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
                        {dynamicCurrencies.length === 0 && (
                          <SelectItem value="N/A" disabled>
                            No currencies defined
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      This should be the Company Code's primary operating currency.
                    </p>
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
                    <p className="text-xs text-gray-500">
                      This value will eventually be replaced by a configurable Tax Jurisdiction table.
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Inventory & Units --- */}
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
                        {dynamicUnits.length === 0 && (
                          <SelectItem value="N/A" disabled>
                            No units defined
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
                    <p className="text-xs text-gray-500">Global minimum quantity for low stock alerts.</p>
                  </div>
                </div>
              </div>

              {/* --- Security & Audit --- */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-red-600" /> Security & Audit
                </h3>
                <div className="flex items-center justify-between space-x-4 p-3 rounded-md border">
                  <div className="space-y-0.5">
                    <Label htmlFor="audit-log" className="text-base">
                      Enable Audit Logging
                    </Label>
                    <p className="text-sm text-gray-500">Tracks all significant user actions for compliance.</p>
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
                    <p className="text-sm text-gray-500">Enforce 2FA for all users upon next sign-in.</p>
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
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingSettings ? "Saving..." : "Save System Defaults"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- NEW 3. Workflow and Business Rules Tab -------------------- */}
        <TabsContent value="workflow">
          <WorkflowRules />
        </TabsContent>

        {/* -------------------- 4. User Roles Tab (Simplified for space) -------------------- */}
        <TabsContent value="user-roles">
          <Card>
            <CardHeader>
              <CardTitle>System Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" onClick={loadUsers}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Refresh
                </Button>
                <Button onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role || "None"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEditPermissions(user)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- 5. Stock Attributes Tab (Simplified for space) -------------------- */}
        <TabsContent value="attributes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Attributes</CardTitle>
              <Button onClick={() => setOpenAttributeDialog(true)} disabled={!isAdmin}>
                <Plus className="w-4 h-4 mr-2" /> Add New Type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {attributeTypes.map((attr) => {
                  const Icon = ATTRIBUTE_ICONS.find((i) => i.value === attr.icon)?.icon || Tags;
                  return (
                    <Card key={attr.id} className="cursor-pointer" onClick={() => handleOpenCatalog(attr)}>
                      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{attr.label}</CardTitle>
                        <Icon className="h-5 w-5 text-gray-400" />
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- 6. Direct DB Access Tab -------------------- */}
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

      {/* MODALS: UserPermissionsDialog, AddUserDialog, AddAttributeDialog, CatalogDialog (Assumed to be here) */}
      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onSave={updateUserRole}
        onDelete={deleteUserRole}
      />
      {/* ... (Other Modals) ... */}
    </div>
  );
};

// ... (UserPermissionsDialog, AddUserDialog, and other modals should be included in the final compilation) ...

export default Configuration;
