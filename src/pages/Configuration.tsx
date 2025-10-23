import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { UserPermissionsDialog } from "@/components/UserPermissionsDialog";

type AttributeTable =
  | "categories"
  | "units"
  | "colors"
  | "genders"
  | "departments"
  | "suppliers"
  | "seasons"
  | "locations"
  | "sizes"
  | "stores"
  | string;

interface Attribute {
  id: string;
  name: string;
  created_at?: string;
}

interface UserWithRole {
  id: string;
  email: string;
  role: "admin" | "supervisor" | "inventory_man" | "cashier" | null;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
  status?: "active" | "inactive";
  created_at: string;
}

const PAGE_SIZE = 20;

const ICONS: Record<string, any> = {
  Boxes,
  Ruler,
  Tags,
  User,
  Building,
  Package,
  CloudSun,
  MapPin,
  Warehouse,
  Eye,
};

const Configuration = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<{ key: AttributeTable; label: string; icon: string } | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newValue, setNewValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // User Management States (MODIFIED)
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUserId, setNewUserId] = useState(""); // MODIFIED: Replaced newUserEmail
  const [newUserPassword, setNewUserPassword] = useState(""); // MODIFIED: Added for password-based creation
  const [newUserRole, setNewUserRole] = useState<"admin" | "supervisor" | "inventory_man" | "cashier">("cashier");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  // Store Management States
  const [stores, setStores] = useState<Store[]>([]);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    phone: "",
    manager: "",
    status: "active" as Store["status"],
  });

  const [catalogs, setCatalogs] = useState<{ key: string; label: string; icon: string }[]>([]);
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrIcon, setNewAttrIcon] = useState("Tag");

  // Load attribute types from database
  const loadAttributeTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("attribute_types")
        .select("*")
        .order("label");

      if (error) throw error;

      const catalogData = (data || []).map((attr: any) => ({
        key: attr.table_name,
        label: attr.label,
        icon: attr.icon || "Tag",
      }));

      setCatalogs(catalogData);
    } catch (error: any) {
      console.error("Error loading attribute types:", error);
      toast.error("Failed to load attribute types");
    }
  };

  useEffect(() => {
    loadAttributeTypes();
    loadUsers();
    loadStores();

    // Set up real-time subscription for attribute types
    const subscription = supabase
      .channel("attribute_types_subscription")
      .on("postgres_changes", { event: "*", schema: "public", table: "attribute_types" }, () => {
        loadAttributeTypes();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, isLoading, navigate]);

  // Load attribute data from Supabase
  const loadData = async (table: AttributeTable, currentPage = 1, term = "") => {
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from(table as any)
        .select("*", { count: "exact" })
        .order("name")
        .range(from, to);

      if (term.trim()) {
        query = query.ilike("name", `%${term.trim()}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // Cast the data to Attribute[] to fix TypeScript error
      setAttributes((data as unknown as Attribute[]) || []);
      setTotal(count || 0);
    } catch (err: any) {
      console.error(`Error loading ${table}:`, err);
      toast.error(err.message || `Error loading ${table}`);
    }
  };

  // Load users via edge function
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");

      if (error) throw error;

      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users: " + error.message);
    }
  };

  // Load stores from Supabase
  const loadStores = async () => {
    try {
      const { data, error } = await supabase.from("stores").select("*").order("name");

      if (error) {
        // If stores table doesn't exist, create it
        if (error.code === "PGRST116") {
          await createStoresTable();
          return;
        }
        throw error;
      }

      // Ensure all stores have a status field and cast to Store[]
      const storesWithStatus: Store[] = (data || []).map((store) => ({
        ...store,
        status: (store as any).status || "active",
      }));

      setStores(storesWithStatus);
    } catch (error: any) {
      console.error("Error loading stores:", error);
      toast.error("Failed to load stores: " + error.message);
    }
  };

  // Create stores table if it doesn't exist
  const createStoresTable = async () => {
    try {
      const storeData: any = {
        name: "Main Store",
        address: "123 Main Street",
        phone: "+1 (555) 123-4567",
        manager: "Store Manager",
      };

      // Only add status if we think the column exists
      try {
        storeData.status = "active";
      } catch (error) {
        console.log("Status column might not exist, skipping...");
      }

      const { error } = await supabase.from("stores").insert([storeData]);

      if (error && error.code !== "23505") {
        // Ignore duplicate key errors
        throw error;
      }

      // Reload stores after creating table/columns
      loadStores();
    } catch (error: any) {
      console.error("Error setting up stores table:", error);
      toast.error("Please create a 'stores' table in your Supabase database");
    }
  };

  const handleOpen = async (catalog: { key: AttributeTable; label: string; icon: string }) => {
    setActiveCatalog(catalog);
    setPage(1);
    await loadData(catalog.key, 1);
    setOpen(true);
    setSearchTerm("");
  };

  const handleAdd = async () => {
    if (!activeCatalog || !newValue.trim()) return toast.error("Please enter a value");
    try {
      const insertData: any = { name: newValue.trim() };

      const { error } = await supabase.from(activeCatalog.key as any).insert(insertData);

      if (error) throw error;

      toast.success("Added successfully");
      setNewValue("");
      loadData(activeCatalog.key, page, searchTerm);
    } catch (err: any) {
      toast.error(err.message || "Error adding item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeCatalog) return;
    if (!confirm("Delete this item?")) return;
    try {
      const { error } = await supabase
        .from(activeCatalog.key as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Deleted successfully");
      loadData(activeCatalog.key, page, searchTerm);
    } catch (err: any) {
      toast.error(err.message || "Error deleting");
    }
  };

  const handleEditSave = async (id: string) => {
    if (!activeCatalog || !editValue.trim()) return toast.error("Please enter a name");
    try {
      const { error } = await supabase
        .from(activeCatalog.key as any)
        .update({ name: editValue.trim() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Updated successfully");
      setEditId(null);
      setEditValue("");
      loadData(activeCatalog.key, page, searchTerm);
    } catch (err: any) {
      toast.error(err.message || "Error updating item");
    }
  };

  const handleExport = () => {
    if (!attributes.length) return toast.error("No data to export");
    const ws = XLSX.utils.json_to_sheet(attributes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeCatalog?.label || "Data");
    XLSX.writeFile(wb, `${activeCatalog?.label || "data"}.xlsx`);
  };

  // MODIFIED: Function to handle adding user with ID and Password
  const handleAddUser = async () => {
    if (!newUserId.trim() || !newUserPassword.trim()) {
      return toast.error("Please enter a User ID and Password");
    }

    try {
      // NOTE: This assumes you have a Supabase Edge Function named 'admin-create-user-password'
      // that uses the Supabase Admin client to create a user with a password.
      const { data, error } = await supabase.functions.invoke("admin-create-user-password", {
        body: {
          userId: newUserId,
          password: newUserPassword,
          role: newUserRole,
        },
      });

      if (error) throw error;

      toast.success(data.message || "User created successfully!");
      setShowUserDialog(false);
      setNewUserId("");
      setNewUserPassword("");
      setNewUserRole("cashier");
      loadUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user: " + error.message);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserWithRole["role"]) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, role: newRole, action: "update" },
      });

      if (error) throw error;

      toast.success("User role updated");
      loadUsers();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role: " + error.message);
    }
  };

  const deleteUserRole = async (userId: string) => {
    if (!confirm("Remove role from this user?")) return;

    try {
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, action: "delete" },
      });

      if (error) throw error;

      toast.success("User role removed");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user role:", error);
      toast.error("Failed to remove user role: " + error.message);
    }
  };

  const handleAddStore = async () => {
    if (!newStore.name.trim()) return toast.error("Please enter store name");

    try {
      const storeData: any = {
        name: newStore.name,
        address: newStore.address,
        phone: newStore.phone,
        manager: newStore.manager,
      };

      // Only add status if we think the column exists
      try {
        storeData.status = newStore.status;
      } catch (error) {
        console.log("Status column might not exist, skipping...");
      }

      const { error } = await supabase.from("stores").insert(storeData);

      if (error) throw error;

      toast.success("Store added successfully");
      setShowStoreDialog(false);
      setNewStore({
        name: "",
        address: "",
        phone: "",
        manager: "",
        status: "active",
      });
      loadStores();
    } catch (error: any) {
      console.error("Error adding store:", error);
      toast.error("Failed to add store: " + error.message);
    }
  };

  const toggleStoreStatus = async (storeId: string, currentStatus: Store["status"]) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";

      // Try to update status, but handle case where column doesn't exist
      const updateData: any = {};

      // Only try to update status if we think the column exists
      try {
        updateData.status = newStatus;
      } catch (error) {
        console.log("Status column does not exist, skipping status update");
        return;
      }

      const { error } = await supabase.from("stores").update(updateData).eq("id", storeId);

      if (error) throw error;

      toast.success(`Store ${newStatus}`);
      loadStores();
    } catch (error: any) {
      console.error("Error updating store status:", error);
      // Don't show error if it's just because status column doesn't exist
      if (!error.message.includes("status")) {
        toast.error("Failed to update store status: " + error.message);
      }
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage system settings, users, and stores</p>
        </div>
      </div>

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stock Attributes
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Stores & Branches
          </TabsTrigger>
        </TabsList>

        {/* Stock Attributes Section */}
        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Stock Attributes Management
              </CardTitle>
              <CardDescription>Manage all inventory-related attributes and categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Attribute Types</h3>
                <Button onClick={() => setAttrModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Attribute Type
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogs.map((cat) => (
                  <Card key={cat.key} className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const Icon = ICONS[cat.icon] || Tags;
                          return <Icon className="w-5 h-5 text-blue-600" />;
                        })()}
                        <div>
                          <h4 className="font-semibold">{cat.label}</h4>
                          <p className="text-sm text-muted-foreground">{cat.key}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(cat)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this attribute type?")) {
                              setCatalogs((prev) => prev.filter((c) => c.key !== cat.key));
                              toast.success("Deleted successfully");
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users & Roles Section */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management & Roles
              </CardTitle>
              <CardDescription>Manage system users and assign roles and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">System Users</h3>
                <Button onClick={() => setShowUserDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User {/* MODIFIED: Text changed from Invite User */}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || ""}
                          onValueChange={(value) => updateUserRole(user.id, value as UserWithRole["role"])}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="No role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="inventory_man">Inventory Manager</SelectItem>
                            <SelectItem value="cashier">Cashier</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.email_confirmed_at ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? (
                          new Date(user.last_sign_in_at).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPermissionsDialog(true);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Permissions
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUserRole(user.id)}
                            disabled={!user.role}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Role Permissions Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Role Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <h4 className="font-semibold">Admin</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full system access, user management, all configurations
                      </p>
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold">Supervisor</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Approve POs, manage physical inventory, view reports
                      </p>
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold">Inventory Manager</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">Create POs, conduct counts, manage transfers</p>
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-600" />
                        <h4 className="font-semibold">Cashier</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">View-only access to inventory</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stores & Branches Section */}
        <TabsContent value="stores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Store & Branch Management
              </CardTitle>
              <CardDescription>Manage all store locations and branch information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Store Locations</h3>
                <Button onClick={() => setShowStoreDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Store
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store) => (
                  <Card key={store.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Store className="w-6 h-6 text-blue-600" />
                        <div>
                          <h4 className="font-semibold">{store.name}</h4>
                          {store.status && (
                            <Badge variant={store.status === "active" ? "success" : "secondary"}>{store.status}</Badge>
                          )}
                        </div>
                      </div>
                      {store.status && (
                        <Switch
                          checked={store.status === "active"}
                          onCheckedChange={() => toggleStoreStatus(store.id, store.status!)}
                        />
                      )}
                    </div>

                    <div className="space-y-3">
                      {store.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <LocateIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{store.address}</span>
                        </div>
                      )}
                      {store.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                      {store.manager && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>Manager: {store.manager}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        View Map
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {stores.length === 0 && (
                <div className="text-center py-8">
                  <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Stores Found</h3>
                  <p className="text-muted-foreground mb-4">Get started by adding your first store location.</p>
                  <Button onClick={() => setShowStoreDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Store
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Attribute Type Modal */}
      <Dialog open={attrModalOpen} onOpenChange={setAttrModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Attribute Type</DialogTitle>
            <DialogDescription>Create a new attribute category for your inventory system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="attr-name">Attribute Name</Label>
              <Input
                id="attr-name"
                placeholder="Enter attribute type name (e.g. Brand)"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="attr-icon">Icon</Label>
              <Select value={newAttrIcon} onValueChange={setNewAttrIcon}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ICONS).map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = ICONS[iconName];
                          return <Icon className="w-4 h-4" />;
                        })()}
                        {iconName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttrModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newAttrName.trim()) return toast.error("Enter a name");
                
                // Convert name to table name format (lowercase with underscores)
                const tableName = newAttrName.toLowerCase().replace(/\s+/g, "_");
                
                try {
                  const { data, error } = await supabase.rpc("create_attribute_table", {
                    p_table_name: tableName,
                    p_label: newAttrName.trim(),
                    p_icon: newAttrIcon || "Tag",
                  });

                  if (error) throw error;

                  toast.success("Attribute type created successfully!");
                  setAttrModalOpen(false);
                  setNewAttrName("");
                  setNewAttrIcon("Tag");
                  loadAttributeTypes(); // Reload the list
                } catch (error: any) {
                  console.error("Error creating attribute type:", error);
                  toast.error(error.message || "Failed to create attribute type");
                }
              }}
            >
              Create Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODIFIED: Add User Modal (formerly Invite User Modal) */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            {/* MODIFIED: Title Change */}
            <DialogTitle>Add New User</DialogTitle>
            {/* MODIFIED: Description Change */}
            <DialogDescription>Create a new system user and assign their role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              {/* MODIFIED: Label Change */}
              <Label htmlFor="user-id">User ID / Username</Label>
              <Input
                id="user-id"
                // MODIFIED: Placeholder Change
                placeholder="inventory_clerk_01"
                value={newUserId}
                // MODIFIED: Using newUserId
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>
            <div>
              {/* MODIFIED: New Field */}
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="********"
                value={newUserPassword}
                // MODIFIED: Using newUserPassword
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as typeof newUserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="inventory_man">Inventory Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancel
            </Button>
            {/* MODIFIED: Button text and function call */}
            <Button onClick={handleAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Store Modal */}
      <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Store</DialogTitle>
            <DialogDescription>Register a new store location in the system</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                placeholder="Downtown Store"
                value={newStore.name}
                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone Number</Label>
              <Input
                id="store-phone"
                placeholder="+1 (555) 123-4567"
                value={newStore.phone}
                onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="store-address">Address</Label>
              <Input
                id="store-address"
                placeholder="123 Main Street, City, State ZIP"
                value={newStore.address}
                onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="store-manager">Store Manager</Label>
              <Input
                id="store-manager"
                placeholder="John Smith"
                value={newStore.manager}
                onChange={(e) => setNewStore({ ...newStore, manager: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={newStore.status === "active"}
                onCheckedChange={(checked) => setNewStore({ ...newStore, status: checked ? "active" : "inactive" })}
              />
              <Label>Active Store</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStore}>Add Store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attribute Items Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeCatalog?.label}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                loadData(activeCatalog!.key, 1, e.target.value);
                setPage(1);
              }}
              className="flex-1"
            />
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {attributes.length > 0 ? (
              attributes.map((attr) => (
                <div
                  key={attr.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 hover:bg-gray-50"
                >
                  {editId === attr.id ? (
                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="mr-2" />
                  ) : (
                    <span>{attr.name}</span>
                  )}

                  <div className="flex items-center gap-2">
                    {editId === attr.id ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => handleEditSave(attr.id)}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditId(attr.id);
                            setEditValue(attr.name);
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(attr.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No items found</p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  loadData(activeCatalog!.key, page - 1, searchTerm);
                }}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1);
                  loadData(activeCatalog!.key, page + 1, searchTerm);
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
            <Button variant="outline" onClick={() => setOpen(false)}>
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
      />
    </div>
  );
};

export default Configuration;
