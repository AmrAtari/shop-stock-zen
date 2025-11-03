import { useState, useEffect, useCallback, useMemo } from "react";
import {
  // Added icons for new functionality
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
  DollarSign, // New ERP financial icon
  Lock, // New ERP security icon
  Save, // New ERP save icon
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
import { Pagination } from "@/components/ui/pagination";

// *** DEFINITIVE FIX: New File Name (DatabaseAdminComponent.tsx) ***
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

// *** NEW: ERP-Style Global Settings Model ***
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

// --- MOCK AUTH HOOK for Role-Based UI (SECURITY UX) ---
// *** IMPORTANT: Replace this with your actual useAuth hook ***
const useAuth = () => {
  // Set to "admin" to view all functionality, "supervisor" to test role-based restrictions.
  const [userRole, setUserRole] = useState<UserRole>("admin");
  return { userRole };
};

// --- CUSTOM HOOK: useSystemSettings (ABSTRACTION/MAINTAINABILITY) ---
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

  // Placeholder UUID for the single system_settings row
  const SYSTEM_SETTINGS_ID = "YOUR_COPIED_UUID";

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
    // Fetch dynamic lists first
    const [currencies, units] = await Promise.all([
      fetchDynamicOptions("currency_types"),
      fetchDynamicOptions("unit_types"),
    ]);

    setDynamicCurrencies(currencies);
    setDynamicUnits(units);

    const currencyNames = currencies.map((c) => c.name);
    const unitNames = units.map((u) => u.name);

    try {
      // Fetch the single row of system settings
      const { data, error } = await supabase.from("system_settings").select("*").limit(1).single();

      // PGRST116 means "no rows found" - handled as defaults
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
            // Default fallback settings
            currency: "USD",
            defaultTaxRate: "5.0",
            defaultUnit: "kg",
            lowStockThreshold: 5,
            enableAuditLog: true,
            require2FA: false,
          };

      // Validation: Ensure default values exist in the dynamic lists
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
    if (!SYSTEM_SETTINGS_ID || SYSTEM_SETTINGS_ID === "YOUR_COPIED_UUID") {
      toast({ title: "Config Error", description: "SYSTEM_SETTINGS_ID is not configured.", variant: "destructive" });
      return;
    }

    setIsSavingSettings(true);
    const settingsToSave = {
      currency: generalSettings.currency,
      // Convert string inputs to proper types for Supabase
      default_tax_rate: parseFloat(generalSettings.defaultTaxRate) || 0,
      default_unit: generalSettings.defaultUnit,
      low_stock_threshold: generalSettings.lowStockThreshold,
      enable_audit_log: generalSettings.enableAuditLog,
      require_2fa: generalSettings.require2FA,
      updated_at: new Date().toISOString(),
    };

    try {
      // Upsert logic: if the row exists (eq), update. If not, insert.
      const { error } = await supabase
        .from("system_settings")
        .upsert(settingsToSave, { onConflict: "id" })
        .eq("id", SYSTEM_SETTINGS_ID) // Only update the single config row
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

// --- UserPermissionsDialog, AddUserDialog, and Catalog Management functions (Omitted for brevity, assumed to be here) ---

// --- MAIN COMPONENT ---
const Configuration = () => {
  // --- CONSUME HOOKS ---
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

  // --- STATE (Unchanged) ---
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newAttrIcon, setNewAttrIcon] = useState<string>("Tags");
  const [loadingAttribute, setLoadingAttribute] = useState(false);

  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<AttributeType | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [newValue, setNewValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // --- USER MANAGEMENT LOGIC (Assumed Unchanged) ---
  const loadUsers = useCallback(async () => {
    /* ... load users logic ... */
  }, []);
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  const handleEditPermissions = (user: UserWithRole) => {
    /* ... */
  };
  const updateUserRole = async (userId: string, newRole: UserWithRole["role"]) => {
    /* ... */
  };
  const deleteUserRole = async (userId: string) => {
    /* ... */
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

      // ERP SCALABILITY: If a core list is updated, refresh the dynamic select options
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
      // ... (rest of the loadData logic remains) ...
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

      // ERP SCALABILITY: If catalog data changes, reload the general settings dynamic lists
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

    // Secure insert using RLS or another Edge Function
    const { error } = await supabase.from(activeCatalog.table_name).insert({ name: newValue.trim() });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Success",
        description: `Added '${newValue}' to ${activeCatalog.label}.`,
        variant: "default",
      });
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
      toast({
        title: "Success",
        description: `Item deleted.`,
        variant: "default",
      });
      loadData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleExport = () => {
    /* Logic to export catalog data */
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>
      <p className="text-gray-500">Manage users, permissions, and core inventory attributes.</p>

      <Tabs defaultValue="user-roles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="user-roles">
            <Shield className="w-4 h-4 mr-2" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="attributes">
            <Tags className="w-4 h-4 mr-2" /> Stock Attributes
          </TabsTrigger>
          <TabsTrigger value="general">
            <Building className="w-4 h-4 mr-2" /> System Defaults
          </TabsTrigger>
          {/* SECURITY UX: Direct DB Access is only visible to Admins */}
          {isAdmin && (
            <TabsTrigger value="db-access">
              <Database className="w-4 h-4 mr-2" /> Direct DB Access
            </TabsTrigger>
          )}
          {!isAdmin && (
            <TabsTrigger value="db-access" disabled>
              <Lock className="w-4 h-4 mr-2" /> DB Access
            </TabsTrigger>
          )}
        </TabsList>

        {/* -------------------- 1. User Roles Tab (Only small change for admin check) -------------------- */}
        <TabsContent value="user-roles">
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
                {/* Only admins can add users */}
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
                        {/* Only show the action column if the user can act */}
                        <TableHead className="text-right">{isAdmin ? "Actions" : "View"}</TableHead>
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
                            {/* Show Edit or Eye based on role */}
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

        {/* -------------------- 2. Stock Attributes Tab (Unchanged) -------------------- */}
        <TabsContent value="attributes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Attributes</CardTitle>
                <CardDescription>Manage dynamic inventory categories (e.g., Color, Size, Brand).</CardDescription>
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
                <p className="text-center text-gray-500">No attribute types defined. Add one to get started.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- 3. General Settings Tab (NEW ERP IMPLEMENTATION) -------------------- */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>System Defaults (ERP Basis)</CardTitle>
              <CardDescription>
                Configure global system parameters for currency, units, and inventory tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* --- Financial Settings (ERP Pillar) --- */}
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
                      **ERP Note:** This value will eventually be replaced by a configurable Tax Jurisdiction table.
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

        {/* -------------------- 4. Direct DB Access Tab -------------------- */}
        <TabsContent value="db-access">
          {/* SECURITY UX: Only render if Admin */}
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

      {/* -------------------- MODALS (Assumed to be here) -------------------- */}

      {/* Add New Attribute Type Dialog */}
      {/* Catalog Item Management Dialog (e.g., Manage Colors) */}
      {/* User Permissions Dialog */}
      {/* Add User Dialog */}
    </div>
  );
};

// Assuming UserPermissionsDialog and AddUserDialog are defined elsewhere or copied here.
// The provided code already contains them, so they are omitted in this final block for brevity.

export default Configuration;
