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
  Eye,
  Download,
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

// MOCK: Replace with your actual implementation
import DatabaseAdminPanel from "./DatabaseAdminComponent.tsx";

// --- TYPE DEFINITIONS ---
type UserRole = "admin" | "inventory_man" | "supervisor" | "user" | null;

interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null; // FIX: Added required property
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

// --- Organizational Structure Types ---
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

// --- Workflow Rule Types ---
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

// --- MOCK AUTH HOOK for Role-Based UI (SECURITY UX) ---
const useAuth = () => {
  const [userRole, setUserRole] = useState<UserRole>("admin");
  return { userRole };
};

// --- CUSTOM HOOK: useSystemSettings (MOCK FOR THIS STEP) ---
const useSystemSettings = () => {
  // FIX: Mocked state and handlers to avoid Supabase errors when compiling
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

  // Mock handlers
  const handleSettingsChange = useCallback(<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleSaveGeneralSettings = async () =>
    toast({ title: "Save Mock", description: "Settings saved to mock state.", variant: "default" });
  const reloadDynamicLists = useCallback(() => {
    toast({ title: "Data Reload", description: "Dynamic lists reloaded (Mock).", variant: "default" });
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

// ---------------------------------------------------------------------
// 1. User Permissions Dialog (FIX: Re-included definition)
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
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const [currentRole, setCurrentRole] = useState<UserWithRole["role"]>(user?.role || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const availableRoles = ["admin", "inventory_man", "supervisor", "user"];

  useEffect(() => {
    setCurrentRole(user?.role || null);
  }, [user]);

  const handleSave = async () => {
    if (!user || !currentRole) return;
    setIsSaving(true);
    await onSave(user.id, currentRole);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!user) return;
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

        {isAdmin ? (
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="role" className="w-[100px]">
                System Role
              </Label>
              <Select
                value={currentRole || ""}
                onValueChange={(value) => setCurrentRole(value as UserWithRole["role"])}
                disabled={isSaving || isDeleting}
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
          </div>
        ) : (
          <Card className="p-4 bg-yellow-50 border-yellow-200 text-yellow-800">
            <p className="flex items-center font-medium">
              <MonitorOff className="w-4 h-4 mr-2" /> View Only
            </p>
            <p className="text-sm">You do not have permission to modify this user's role.</p>
          </Card>
        )}

        <DialogFooter className="flex justify-between">
          {isAdmin ? (
            <>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || isSaving}>
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Removing Role..." : "Remove Role"}
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || isDeleting || currentRole === user.role}>
                  <Check className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------
// 2. Add User Dialog (FIX: Re-included definition)
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
      // Mock Supabase call
      toast({
        title: "Success",
        description: `User ${email} created successfully (Mock).`,
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
// 3. Organizational Structure Component (FIX: Re-included definition)
// ---------------------------------------------------------------------
const OrganizationalStructure: React.FC<{ dynamicCurrencies: CatalogItem[] }> = ({ dynamicCurrencies }) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

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

// ---------------------------------------------------------------------
// 4. Workflow Rules Component (FIX: Re-included definition)
// ---------------------------------------------------------------------
const WorkflowRules: React.FC = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const availableRoles: UserRole[] = ["admin", "supervisor", "inventory_man", "user"];

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
      id: Date.now().toString(),
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
// 5. Add Attribute Dialog (FIX: Re-included definition for call)
// ---------------------------------------------------------------------
const AddAttributeDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, label: string, icon: string) => Promise<void>;
}> = ({ open, onOpenChange, onSave }) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
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
              disabled={loadingAttribute}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-name">Table Name (e.g., colors)</Label>
            <Input
              id="attr-name"
              placeholder="Enter unique table name (lowercase, no spaces)"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              disabled={loadingAttribute}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-icon">Icon</Label>
            <Select value={newAttrIcon} onValueChange={setNewAttrIcon} disabled={loadingAttribute}>
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
// 6. Catalog Management Dialog (FIX: Re-included definition for call)
// ---------------------------------------------------------------------

const CatalogManagementDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCatalog: AttributeType | null;
  isAdmin: boolean;
}> = ({ open, onOpenChange, activeCatalog, isAdmin }) => {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([
    { id: "c1", name: "Red", created_at: "" },
    { id: "c2", name: "Blue", created_at: "" },
  ]);
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newValue) return;
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can add catalog items.",
        variant: "destructive",
      });
    setCatalogItems([
      ...catalogItems,
      { id: Date.now().toString(), name: newValue, created_at: new Date().toISOString() },
    ]);
    setNewValue("");
    toast({ title: "Success", description: `Added '${newValue}'.`, variant: "default" });
  };

  const handleDelete = (itemId: string) => {
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can delete catalog items.",
        variant: "destructive",
      });
    setCatalogItems(catalogItems.filter((item) => item.id !== itemId));
    toast({ title: "Success", description: `Item deleted (Mock).`, variant: "default" });
  };

  const handleExport = () => {
    toast({ title: "Exporting...", description: "Preparing data for Excel download.", variant: "default" });
  };

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
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} disabled={!isAdmin}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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

  // --- STATE ---
  // FIX: Added required email_confirmed_at to mock user
  const [users, setUsers] = useState<UserWithRole[]>([
    {
      id: "u1",
      email: "admin@erp.com",
      role: "admin",
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    },
    {
      id: "u2",
      email: "supervisor@erp.com",
      role: "supervisor",
      created_at: new Date().toISOString(),
      last_sign_in_at: null,
      email_confirmed_at: new Date().toISOString(),
    },
  ]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([
    { id: "t1", table_name: "currency_types", label: "Currency", icon: "DollarSign" },
    { id: "t2", table_name: "color_types", label: "Color", icon: "Tags" },
  ]);
  const [loading, setLoading] = useState(false); // Mock loading state

  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<AttributeType | null>(null);

  // --- USER MANAGEMENT LOGIC (MOCK) ---
  const loadUsers = useCallback(() => {
    /* mock */
  }, []);
  const handleEditPermissions = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };
  const updateUserRole = async (userId: string, newRole: UserWithRole["role"]) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    toast({
      title: "Success",
      description: `Role for user ${userId} updated to ${newRole}. (Mock)`,
      variant: "default",
    });
  };
  const deleteUserRole = async (userId: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: null } : u)));
    toast({ title: "Success", description: `Role for user ${userId} removed. (Mock)`, variant: "default" });
  };
  const handleAttributeTypeSave = async (name: string, label: string, icon: string) => {
    setAttributeTypes([...attributeTypes, { id: Date.now().toString(), table_name: name, label: label, icon: icon }]);
    reloadDynamicLists();
    toast({ title: "Success", description: `Attribute type '${label}' created. (Mock)`, variant: "default" });
  };

  // --- ATTRIBUTE CATALOG LOGIC ---
  const handleOpenCatalog = (attr: AttributeType) => {
    setActiveCatalog(attr);
    setOpenCatalogDialog(true);
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
          <TabsTrigger value="db-access" disabled={!isAdmin}>
            <Wrench className="w-4 h-4 mr-2" /> Direct DB Access
          </TabsTrigger>
        </TabsList>

        {/* 1. Organizational Structure Tab */}
        <TabsContent value="organizational-structure">
          <OrganizationalStructure dynamicCurrencies={dynamicCurrencies} />
        </TabsContent>

        {/* 2. System Defaults Tab (ERP IMPLEMENTATION) */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>System Defaults (ERP Basis)</CardTitle>
              <CardDescription>Configure global system parameters.</CardDescription>
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

        {/* 3. Workflow and Business Rules Tab */}
        <TabsContent value="workflow">
          <WorkflowRules />
        </TabsContent>

        {/* 4. User Roles Tab */}
        <TabsContent value="user-roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>System Users</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadUsers} disabled={loading}>
                  <RotateCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>System Role</TableHead>
                      <TableHead className="text-right">{isAdmin ? "Actions" : "View"}</TableHead>
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
                            {isAdmin ? <Edit2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Stock Attributes Tab */}
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

      {/* MODALS */}
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
      />

      <CatalogManagementDialog
        open={openCatalogDialog}
        onOpenChange={setOpenCatalogDialog}
        activeCatalog={activeCatalog}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default Configuration;
