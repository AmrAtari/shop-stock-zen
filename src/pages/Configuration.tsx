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
}

interface UserRole {
  id: string;
  email: string;
  role: "admin" | "manager" | "cashier" | "viewer";
  status: "active" | "inactive";
  last_login?: string;
  created_at: string;
}

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: "active" | "inactive";
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

  // User Management States
  const [users, setUsers] = useState<UserRole[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    role: "cashier" as UserRole["role"],
    status: "active" as UserRole["status"],
  });

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

  const [catalogs, setCatalogs] = useState<{ key: string; label: string; icon: string }[]>([
    { key: "categories", label: "Categories", icon: "Boxes" },
    { key: "units", label: "Units", icon: "Ruler" },
    { key: "colors", label: "Colors", icon: "Tags" },
    { key: "genders", label: "Genders", icon: "User" },
    { key: "departments", label: "Departments", icon: "Building" },
    { key: "suppliers", label: "Suppliers", icon: "Package" },
    { key: "seasons", label: "Seasons", icon: "CloudSun" },
    { key: "locations", label: "Locations", icon: "MapPin" },
    { key: "sizes", label: "Sizes", icon: "Ruler" },
  ]);

  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("customCatalogs");
    if (saved) setCatalogs(JSON.parse(saved));
    loadUsers();
    loadStores();
  }, []);

  useEffect(() => {
    localStorage.setItem("customCatalogs", JSON.stringify(catalogs));
  }, [catalogs]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, isLoading, navigate]);

  const loadData = async (table: AttributeTable, currentPage = 1, term = "") => {
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from(table as any)
        .select("*", { count: "exact" })
        .order("name")
        .range(from, to);
      if (term.trim()) query = query.ilike("name", `%${term.trim()}%`);

      const { data, count, error } = (await query) as any;
      if (error) throw error;

      setAttributes((data as Attribute[]) || []);
      setTotal(count || 0);
    } catch (err: any) {
      toast.error(err.message || "Error loading data");
    }
  };

  const loadUsers = async () => {
    try {
      // Mock user data - replace with actual Supabase call
      const mockUsers: UserRole[] = [
        {
          id: "1",
          email: "admin@company.com",
          role: "admin",
          status: "active",
          last_login: "2024-01-15T10:30:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          email: "manager@company.com",
          role: "manager",
          status: "active",
          last_login: "2024-01-15T09:15:00Z",
          created_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "3",
          email: "cashier1@company.com",
          role: "cashier",
          status: "active",
          last_login: "2024-01-14T16:45:00Z",
          created_at: "2024-01-03T00:00:00Z",
        },
        {
          id: "4",
          email: "viewer@company.com",
          role: "viewer",
          status: "inactive",
          created_at: "2024-01-04T00:00:00Z",
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  const loadStores = async () => {
    try {
      // Mock store data - replace with actual Supabase call
      const mockStores: Store[] = [
        {
          id: "1",
          name: "Downtown Store",
          address: "123 Main Street, Downtown",
          phone: "+1 (555) 123-4567",
          manager: "John Smith",
          status: "active",
        },
        {
          id: "2",
          name: "Mall Branch",
          address: "456 Mall Road, Shopping Center",
          phone: "+1 (555) 123-4568",
          manager: "Sarah Johnson",
          status: "active",
        },
        {
          id: "3",
          name: "Airport Outlet",
          address: "789 Airport Boulevard",
          phone: "+1 (555) 123-4569",
          manager: "Mike Davis",
          status: "inactive",
        },
      ];
      setStores(mockStores);
    } catch (error) {
      toast.error("Failed to load stores");
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
      const { error } = await supabase.from(activeCatalog.key as any).insert({ name: newValue.trim() });
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

  const handleAddUser = async () => {
    if (!newUser.email.trim()) return toast.error("Please enter email");

    try {
      // Add user logic here
      toast.success("User added successfully");
      setShowUserDialog(false);
      setNewUser({ email: "", role: "cashier", status: "active" });
      loadUsers();
    } catch (error) {
      toast.error("Failed to add user");
    }
  };

  const handleAddStore = async () => {
    if (!newStore.name.trim()) return toast.error("Please enter store name");

    try {
      // Add store logic here
      toast.success("Store added successfully");
      setShowStoreDialog(false);
      setNewStore({ name: "", address: "", phone: "", manager: "", status: "active" });
      loadStores();
    } catch (error) {
      toast.error("Failed to add store");
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole["role"]) => {
    try {
      // Update user role logic here
      toast.success("User role updated");
      loadUsers();
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: UserRole["status"]) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      // Update user status logic here
      toast.success(`User ${newStatus}`);
      loadUsers();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const toggleStoreStatus = async (storeId: string, currentStatus: Store["status"]) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      // Update store status logic here
      toast.success(`Store ${newStatus}`);
      loadStores();
    } catch (error) {
      toast.error("Failed to update store status");
    }
  };

  const getRoleColor = (role: UserRole["role"]) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "cashier":
        return "bg-green-100 text-green-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
                  Add User
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
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
                          value={user.role}
                          onValueChange={(value: UserRole["role"]) => updateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="cashier">Cashier</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.status === "active"}
                            onCheckedChange={() => toggleUserStatus(user.id, user.status)}
                          />
                          <Badge variant={user.status === "active" ? "success" : "secondary"}>{user.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.last_login ? (
                          new Date(user.last_login).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Key className="w-4 h-4 mr-1" />
                            Reset Password
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
                        <h4 className="font-semibold">Manager</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Inventory management, reports, basic configurations
                      </p>
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold">Cashier</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        POS operations, sales, refunds, basic inventory view
                      </p>
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-600" />
                        <h4 className="font-semibold">Viewer</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">Read-only access to inventory and reports</p>
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
                          <Badge variant={store.status === "active" ? "success" : "secondary"}>{store.status}</Badge>
                        </div>
                      </div>
                      <Switch
                        checked={store.status === "active"}
                        onCheckedChange={() => toggleStoreStatus(store.id, store.status)}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <LocateIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{store.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{store.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Manager: {store.manager}</span>
                      </div>
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
              <Select>
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
              onClick={() => {
                if (!newAttrName.trim()) return toast.error("Enter a name");
                const newKey = newAttrName.toLowerCase().replace(/\s+/g, "_");
                setCatalogs([...catalogs, { key: newKey, label: newAttrName, icon: "Tags" }]);
                setAttrModalOpen(false);
                setNewAttrName("");
                toast.success("Attribute type added!");
              }}
            >
              Save Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account and assign permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-email">Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@company.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole["role"]) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newUser.status === "active"}
                onCheckedChange={(checked) => setNewUser({ ...newUser, status: checked ? "active" : "inactive" })}
              />
              <Label>Active User</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancel
            </Button>
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
    </div>
  );
};

export default Configuration;
