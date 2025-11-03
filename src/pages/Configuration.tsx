import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Boxes,
  Ruler,
  Tags,
  User,
  Building,
  Package,
  CloudSun,
  MapPin,
  Warehouse,
  Plus,
  Trash2,
  Edit2,
  Download,
  Check,
  X,
  Search,
  Users,
  Shield,
  Store,
  LocateIcon,
  Key,
  Mail,
  Phone,
  Calendar,
  BadgeCheck,
  Ban,
  Eye,
  Database,
  RotateCcw,
  DollarSign,
  Lock,
  Save,
  Wrench,
  Briefcase,
  MonitorOff, // New icon for disabled UI
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

// Assuming external components are available
import DatabaseAdminPanel from "./DatabaseAdminComponent.tsx";

// --- TYPE DEFINITIONS (Unchanged) ---
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

const ATTRIBUTE_ICONS = [
  { value: "Tags", icon: Tags },
  { value: "Boxes", icon: Boxes },
  { value: "Ruler", icon: Ruler },
  { value: "User", icon: User },
  { value: "Building", icon: Building },
  { value: "Package", icon: Package },
  { value: "CloudSun", icon: CloudSun },
  { value: "MapPin", icon: MapPin },
  { value: "Warehouse", icon: Warehouse },
  { value: "DollarSign", icon: DollarSign },
];

// --- MOCK AUTH HOOK for Role-Based UI ---
// *** IMPORTANT: Replace this with your actual useAuth hook ***
const useAuth = () => {
  // In a real app, this would fetch the user session and return their role.
  const [userRole, setUserRole] = useState<UserRole>("admin");

  // You can test different roles by changing the initial state above:
  // "admin" (can see everything)
  // "supervisor" (can see users, but not the advanced tab or Add User)

  return { userRole };
};

// --- CUSTOM HOOK: useSystemSettings (Abstraction for Maintainability) ---
// This handles all the state and logic for the 'System Defaults' tab.
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

  const fetchDynamicOptions = useCallback(async (tableName: string): Promise<CatalogItem[]> => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("id, name, created_at")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error loading dynamic options for ${tableName}:`, error);
      return [];
    }
  }, []);

  const loadGeneralSettings = useCallback(async () => {
    const [currencies, units] = await Promise.all([
      fetchDynamicOptions("currency_types"),
      fetchDynamicOptions("unit_types"),
    ]);

    setDynamicCurrencies(currencies);
    setDynamicUnits(units);

    const currencyNames = currencies.map((c) => c.name);
    const unitNames = units.map((u) => u.name);

    try {
      const { data, error } = await supabase.from("system_settings").select("*").limit(1).single();

      if (error && error.code !== "PGRST116") throw error;

      let initialSettings: GeneralSettings = data
        ? {
            currency: data.currency,
            defaultTaxRate: String(data.default_tax_rate),
            defaultUnit: data.default_unit,
            lowStockThreshold: data.low_stock_threshold,
            enableAuditLog: data.enable_audit_log,
            require2FA: data.require_2fa,
          }
        : {
            currency: "USD",
            defaultTaxRate: "5.0",
            defaultUnit: "kg",
            lowStockThreshold: 5,
            enableAuditLog: true,
            require2FA: false,
          };

      // Validation logic remains
      if (!currencyNames.includes(initialSettings.currency) && currencies.length > 0) {
        initialSettings.currency = currencies[0].name;
      }
      if (!unitNames.includes(initialSettings.defaultUnit) && units.length > 0) {
        initialSettings.defaultUnit = units[0].name;
      }

      setGeneralSettings(initialSettings);
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        title: "Database Error",
        description: "Failed to load system settings.",
        variant: "destructive",
      });
    }
  }, [fetchDynamicOptions]);

  useEffect(() => {
    loadGeneralSettings();
  }, [loadGeneralSettings]);

  // Type-safe change handler
  const handleSettingsChange = useCallback(<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveGeneralSettings = async () => {
    setIsSavingSettings(true);
    const settingsToSave = {
      currency: generalSettings.currency,
      default_tax_rate: parseFloat(generalSettings.defaultTaxRate) || 0,
      default_unit: generalSettings.defaultUnit,
      low_stock_threshold: generalSettings.lowStockThreshold,
      enable_audit_log: generalSettings.enableAuditLog,
      require_2fa: generalSettings.require2FA,
      updated_at: new Date().toISOString(),
    };

    try {
      // *** IMPORTANT: You must replace 'YOUR_COPIED_UUID' with the actual UUID of your single system_settings row ***
      const { error } = await supabase
        .from("system_settings")
        .update(settingsToSave)
        .eq("id", "YOUR_COPIED_UUID")
        .single();

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "System defaults updated successfully.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Saving Failed",
        description: `Could not save settings: ${error.message}.`,
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Expose a function to reload dynamic lists after a catalog change
  const reloadDynamicLists = useCallback(() => {
    loadGeneralSettings();
  }, [loadGeneralSettings]);

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

// --- USER MANAGEMENT COMPONENTS (Minimal changes, mainly role checks) ---
// (UserPermissionsDialog and AddUserDialog functions remain here for brevity)
// ... (Your UserPermissionsDialog and AddUserDialog code) ...

const UserPermissionsDialog: React.FC<any> = ({ open, onOpenChange, user, onSave, onDelete }) => {
  const { userRole } = useAuth(); // Check role for button visibility
  const [currentRole, setCurrentRole] = useState<UserRole>(user?.role || null);
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

        {userRole === "admin" ? (
          <div className="grid gap-4 py-4">
            {/* Role Management */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="role" className="w-[100px]">
                System Role
              </Label>
              <Select
                value={currentRole || ""}
                onValueChange={(value) => setCurrentRole(value as UserRole)}
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
            {/* Account Details... (unchanged) */}
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
          {userRole === "admin" ? (
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

// ... (Your AddUserDialog code) ...
const AddUserDialog: React.FC<any> = ({ open, onOpenChange, onUserAdded }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);

  const handleAddUser = async () => {
    if (!email || !password || !role) {
      toast({ title: "Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("admin-create-user-password", {
        body: { userId: email, password: password, role: role },
      });

      if (error) throw error;

      toast({ title: "Success", description: `User ${email} created successfully.`, variant: "default" });
      onUserAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "User Creation Failed", description: error.message, variant: "destructive" });
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
            <Select value={role || "user"} onValueChange={(value) => setRole(value as UserRole)} disabled={loading}>
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

// --- MAIN COMPONENT (Now much leaner) ---
const Configuration = () => {
  // Consume the new hook for cleaner code
  const {
    generalSettings,
    dynamicCurrencies,
    dynamicUnits,
    handleSettingsChange,
    handleSaveGeneralSettings,
    isSavingSettings,
    reloadDynamicLists, // Used to refresh units/currencies after catalog update
  } = useSystemSettings();

  // Consume the mock auth hook for role-based security
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  // State for Attribute Management Dialog
  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newAttrIcon, setNewAttrIcon] = useState<string>("Tags");
  const [loadingAttribute, setLoadingAttribute] = useState(false);

  // State for Catalog Management Dialog
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<AttributeType | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [newValue, setNewValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // --- USER MANAGEMENT LOGIC (Unchanged) ---
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: edgeError } = await supabase.functions.invoke("admin-list-users");
      if (edgeError) throw edgeError;
      const { users: fetchedUsers } = data;
      setUsers(fetchedUsers || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError("Failed to load user list. Check Edge Function logs.");
      toast({ title: "User Load Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEditPermissions = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
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

  // --- ATTRIBUTE TYPE MANAGEMENT LOGIC (Modified to call reloadDynamicLists) ---

  const loadAttributeTypes = useCallback(async () => {
    const { data, error } = await supabase.from("attribute_types").select("*").order("label", { ascending: true });
    if (error) {
      console.error("Error loading attribute types:", error);
      toast({ title: "Error", description: "Failed to load attribute types.", variant: "destructive" });
      return;
    }
    setAttributeTypes(data || []);
  }, []);

  useEffect(() => {
    loadAttributeTypes();
  }, [loadAttributeTypes]);

  const handleAddAttributeType = async () => {
    if (!newAttrName || !newAttrLabel) {
      toast({ title: "Error", description: "Name and Label are required.", variant: "destructive" });
      return;
    }
    setLoadingAttribute(true);

    try {
      const tableName = newAttrName.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error } = await supabase.rpc("create_attribute_table", {
        p_table_name: tableName,
        p_label: newAttrLabel.trim(),
        p_icon: newAttrIcon || "Tags",
      });

      if (error) throw error;

      toast({ title: "Success", description: `Attribute type '${newAttrLabel}' created.`, variant: "default" });
      setOpenAttributeDialog(false);
      setNewAttrName("");
      setNewAttrLabel("");
      loadAttributeTypes();

      // *** NEW: Refresh dynamic options after a table is created ***
      if (tableName === "currency_types" || tableName === "unit_types") {
        reloadDynamicLists();
      }
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoadingAttribute(false);
    }
  };

  // --- CATALOG ITEM MANAGEMENT LOGIC (Modified to call reloadDynamicLists) ---
  const ITEMS_PER_PAGE = 10;

  const loadData = useCallback(
    async (tableName: string, pageNum: number, search: string) => {
      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(tableName).select("id, name, created_at", { count: "exact" });
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error, count } = await query.order("name", { ascending: true }).range(from, to);

      if (error) {
        console.error(`Error loading catalog ${tableName}:`, error);
        setCatalogItems([]);
        setTotalPages(1);
        return;
      }

      setCatalogItems(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

      // *** NEW: Refresh dynamic options after catalog data changes ***
      if (tableName === "currency_types" || tableName === "unit_types") {
        reloadDynamicLists();
      }
    },
    [reloadDynamicLists],
  );

  const handleOpenCatalog = (attr: AttributeType) => {
    setActiveCatalog(attr);
    setOpenCatalogDialog(true);
    setPage(1);
    setSearchTerm("");
    loadData(attr.table_name, 1, "");
  };

  const handleAdd = async () => {
    if (!newValue || !activeCatalog) return;
    const { error } = await supabase.from(activeCatalog.table_name).insert({ name: newValue.trim() });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Added '${newValue}' to ${activeCatalog.label}.`, variant: "default" });
      setNewValue("");
      loadData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleEdit = (item: CatalogItem) => {
    /* Logic to open edit modal */
  };

  const handleDelete = async (itemId: string) => {
    if (!activeCatalog) return;
    const { error } = await supabase.from(activeCatalog.table_name).delete().eq("id", itemId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Item deleted.`, variant: "default" });
      loadData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleExport = () => {
    toast({ title: "Exporting...", description: "Preparing data for Excel download.", variant: "default" });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>
      <p className="text-gray-500">Manage users, core inventory data models, and global application settings.</p>

      <Tabs defaultValue="user-access" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="user-access">
            <Shield className="w-4 h-4 mr-2" /> User & Access
          </TabsTrigger>
          <TabsTrigger value="data-models">
            <Briefcase className="w-4 h-4 mr-2" /> Inventory Data Models
          </TabsTrigger>
          <TabsTrigger value="system-defaults">
            <Building className="w-4 h-4 mr-2" /> System Defaults
          </TabsTrigger>
          {/* SECURITY UX: Only show the advanced tab to admins */}
          {isAdmin && (
            <TabsTrigger value="developer">
              <Wrench className="w-4 h-4 mr-2" /> Developer/Advanced
            </TabsTrigger>
          )}
        </TabsList>

        {/* -------------------- 1. User & Access Tab -------------------- */}
        <TabsContent value="user-access">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>View and manage user accounts and their assigned system roles.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadUsers} disabled={loading}>
                  <RotateCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
                {/* SECURITY UX: Only admins can add users */}
                <Button onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading users...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>System Role</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Last Sign-in</TableHead>
                        {/* SECURITY UX: Only show the action column if the user can act */}
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        {!isAdmin && <TableHead className="text-right">View</TableHead>}
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
                            {/* SECURITY UX: Show Edit or Eye based on role */}
                            <Button variant="outline" size="sm" onClick={() => handleEditPermissions(user)}>
                              {isAdmin ? <Edit2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

        {/* -------------------- 2. Inventory Data Models Tab (Unchanged) -------------------- */}
        <TabsContent value="data-models">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Data Models</CardTitle>
                <CardDescription>
                  Define dynamic categories and values for your inventory (e.g., **Units**, **Brands**, **Currencies**).
                </CardDescription>
              </div>
              <Button onClick={() => setOpenAttributeDialog(true)} disabled={!isAdmin}>
                <Plus className="w-4 h-4 mr-2" /> Add New Model
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
                <p className="text-center text-gray-500">
                  No data models defined. Add one to get started (e.g., units, colors).
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- 3. System Defaults Tab (Consumes useSystemSettings) -------------------- */}
        <TabsContent value="system-defaults">
          <Card>
            <CardHeader>
              <CardTitle>System Defaults</CardTitle>
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
                      disabled={isSavingSettings || !isAdmin} // Only admins can change this
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
                          <SelectItem value="USD" disabled>
                            USD (Add currencies in Data Models)
                          </SelectItem>
                        )}
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
                          <SelectItem value="kg" disabled>
                            kg (Add units in Data Models)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">This will auto-select for new items.</p>
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

        {/* -------------------- 4. Developer/Advanced Tab (Only visible to admin) -------------------- */}
        {isAdmin && (
          <TabsContent value="developer">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center">
                  <Wrench className="w-5 h-5 mr-2" /> Developer/Advanced Access
                </CardTitle>
                <CardDescription>
                  **Caution:** This panel provides direct, low-level access to the database. Only authorized
                  administrators should use this feature.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DatabaseAdminPanel />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* --- MODALS (Code not included for brevity, but they would use isAdmin for button disabled states) --- */}
      {/* ... Dialog components ... */}
    </div>
  );
};

export default Configuration;
