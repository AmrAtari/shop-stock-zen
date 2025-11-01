import { useState, useEffect, useCallback } from "react";
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

// *** DEFINITIVE FIX: Use Default Import with explicit .tsx extension ***
import DatabaseAdminPanel from "./DatabaseAdminPanel.tsx";

// --- TYPE DEFINITIONS ---
interface UserWithRole {
  id: string;
  email: string;
  role: "admin" | "inventory_man" | "supervisor" | "user" | null;
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
  // ... more icons as needed
];

// --- COMPONENTS ---

// 1. User Permissions Dialog (Modified to use Edge Function)
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

        <div className="grid gap-4 py-4">
          {/* Role Management */}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 2. Add User Dialog
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

// --- MAIN COMPONENT ---
const Configuration = () => {
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

  // State for Catalog Management Dialog (Assumed Logic)
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<AttributeType | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [newValue, setNewValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // --- USER MANAGEMENT LOGIC ---

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the secure Edge Function to list all users
      const { data, error: edgeError } = await supabase.functions.invoke("admin-list-users");

      if (edgeError) throw edgeError;

      const { users: fetchedUsers } = data;
      setUsers(fetchedUsers || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError("Failed to load user list. Check Edge Function logs.");
      toast({
        title: "User Load Failed",
        description: err.message,
        variant: "destructive",
      });
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

  const updateUserRole = async (userId: string, newRole: UserWithRole["role"]) => {
    try {
      // Use the secure Edge Function to update the role
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, role: newRole, action: "update" },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role for user ${userId.slice(0, 8)}... updated to ${newRole}.`,
        variant: "default",
      });
      loadUsers(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Role Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUserRole = async (userId: string) => {
    try {
      // Use the secure Edge Function to delete the role
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, action: "delete" },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role for user ${userId.slice(0, 8)}... has been removed.`,
        variant: "default",
      });
      loadUsers(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Role Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // --- ATTRIBUTE TYPE MANAGEMENT LOGIC ---

  const loadAttributeTypes = useCallback(async () => {
    const { data, error } = await supabase.from("attribute_types").select("*").order("label", { ascending: true });

    if (error) {
      console.error("Error loading attribute types:", error);
      toast({
        title: "Error",
        description: "Failed to load attribute types.",
        variant: "destructive",
      });
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

    // Call the SQL RPC to create the table and register the type
    try {
      const tableName = newAttrName.toLowerCase().replace(/[^a-z0-9_]/g, ""); // Basic slugify
      const { error } = await supabase.rpc("create_attribute_table", {
        p_table_name: tableName,
        p_label: newAttrLabel.trim(),
        p_icon: newAttrIcon || "Tags",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attribute type '${newAttrLabel}' created.`,
        variant: "default",
      });
      setOpenAttributeDialog(false);
      setNewAttrName("");
      setNewAttrLabel("");
      loadAttributeTypes(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAttribute(false);
    }
  };

  // --- CATALOG ITEM MANAGEMENT LOGIC (Placeholder for reference) ---
  const ITEMS_PER_PAGE = 10;

  const loadData = useCallback(async (tableName: string, pageNum: number, search: string) => {
    // This part should also use RLS or a secure endpoint if required, but is simplified here.
    const from = (pageNum - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from(tableName).select("*", { count: "exact" });

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
  }, []);

  const handleOpenCatalog = (attr: AttributeType) => {
    setActiveCatalog(attr);
    setOpenCatalogDialog(true);
    setPage(1);
    setSearchTerm("");
    loadData(attr.table_name, 1, "");
  };

  const handleAdd = async () => {
    if (!newValue || !activeCatalog) return;

    // This part should also be protected by RLS or a secure Edge Function
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

  // (Placeholder functions for Edit and Delete catalog items)
  const handleEdit = (item: CatalogItem) => {
    /* Logic to open edit modal */
  };
  const handleDelete = async (itemId: string) => {
    if (!activeCatalog) return;
    // Secure delete using RLS or another Edge Function
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
    // Logic to export catalog data
    toast({ title: "Exporting...", description: "Preparing data for Excel download.", variant: "default" });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>
      <p className="text-gray-500">Manage users, permissions, and core inventory attributes.</p>

      <Tabs defaultValue="user-roles" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
          <TabsTrigger value="user-roles">
            <Shield className="w-4 h-4 mr-2" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="attributes">
            <Tags className="w-4 h-4 mr-2" /> Stock Attributes
          </TabsTrigger>
          <TabsTrigger value="general">
            <Building className="w-4 h-4 mr-2" /> General Settings
          </TabsTrigger>
          <TabsTrigger value="db-access">
            <Database className="w-4 h-4 mr-2" /> Direct DB Access
          </TabsTrigger>
        </TabsList>

        {/* -------------------- 1. User Roles Tab -------------------- */}
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
                <Button onClick={() => setShowAddUserDialog(true)}>
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
                            <Button variant="outline" size="sm" onClick={() => handleEditPermissions(user)}>
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

        {/* -------------------- 2. Stock Attributes Tab -------------------- */}
        <TabsContent value="attributes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Attributes</CardTitle>
                <CardDescription>Manage dynamic inventory categories (e.g., Color, Size, Brand).</CardDescription>
              </div>
              <Button onClick={() => setOpenAttributeDialog(true)}>
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

        {/* -------------------- 3. General Settings Tab -------------------- */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General System Settings</CardTitle>
              <CardDescription>
                Configure global system parameters (e.g., currency, default units). (Placeholder)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>General settings configuration goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- 4. Direct DB Access Tab -------------------- */}
        <TabsContent value="db-access">
          <DatabaseAdminPanel />
        </TabsContent>
      </Tabs>

      {/* -------------------- MODALS -------------------- */}

      {/* Add New Attribute Type Dialog */}
      <Dialog open={openAttributeDialog} onOpenChange={setOpenAttributeDialog}>
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
            <Button variant="outline" onClick={() => setOpenAttributeDialog(false)} disabled={loadingAttribute}>
              Cancel
            </Button>
            <Button onClick={handleAddAttributeType} disabled={loadingAttribute}>
              {loadingAttribute ? "Creating..." : "Create Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Item Management Dialog (e.g., Manage Colors) */}
      <Dialog open={openCatalogDialog} onOpenChange={setOpenCatalogDialog}>
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
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
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
            />
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          <DialogFooter className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setOpenCatalogDialog(false)}>
              Close
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export as Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Permissions Dialog */}
      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onSave={updateUserRole}
        onDelete={deleteUserRole}
      />

      {/* Add User Dialog */}
      <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} onUserAdded={loadUsers} />
    </div>
  );
};

export default Configuration;
