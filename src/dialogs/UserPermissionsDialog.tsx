import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  ShoppingCart,
  ArrowRightLeft,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  Settings,
  Shield,
  Store,
  User,
  Trash2,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email?: string;
    username?: string;
    role: "admin" | "supervisor" | "inventory_man" | "cashier" | null;
    store_id?: string;
    store_name?: string;
  } | null;
  onSave: (userId: string, role: string, storeId: string | null) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

interface Permission {
  id: string;
  label: string;
  description: string;
}

interface PermissionCategory {
  id: string;
  label: string;
  icon: any;
  color: string;
  permissions: Permission[];
}

interface StoreOption {
  id: string;
  name: string;
  location: string | null;
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "inventory",
    label: "Inventory Management",
    icon: Package,
    color: "text-blue-500",
    permissions: [
      { id: "inventory.view", label: "View Inventory", description: "View all inventory items and stock levels" },
      { id: "inventory.create", label: "Create Items", description: "Add new items to inventory" },
      { id: "inventory.update", label: "Update Items", description: "Edit existing inventory items" },
      { id: "inventory.delete", label: "Delete Items", description: "Remove items from inventory" },
      { id: "inventory.adjust", label: "Adjust Stock", description: "Make stock quantity adjustments" },
    ],
  },
  {
    id: "purchase_orders",
    label: "Purchase Orders",
    icon: ShoppingCart,
    color: "text-green-500",
    permissions: [
      { id: "po.view", label: "View POs", description: "View purchase orders" },
      { id: "po.create", label: "Create POs", description: "Create new purchase orders" },
      { id: "po.update", label: "Update POs", description: "Edit purchase orders" },
      { id: "po.delete", label: "Delete POs", description: "Remove purchase orders" },
      { id: "po.receive", label: "Receive Stock", description: "Process incoming stock from POs" },
    ],
  },
  {
    id: "transfers",
    label: "Stock Transfers",
    icon: ArrowRightLeft,
    color: "text-purple-500",
    permissions: [
      { id: "transfer.view", label: "View Transfers", description: "View stock transfer requests" },
      { id: "transfer.create", label: "Create Transfers", description: "Create new transfer requests" },
      { id: "transfer.update", label: "Update Transfers", description: "Edit transfer details" },
      { id: "transfer.approve", label: "Approve Transfers", description: "Approve or reject transfers" },
      { id: "transfer.receive", label: "Receive Transfers", description: "Process incoming transfers" },
    ],
  },
  {
    id: "physical_inventory",
    label: "Physical Inventory",
    icon: ClipboardList,
    color: "text-orange-500",
    permissions: [
      { id: "pi.view", label: "View Sessions", description: "View physical inventory sessions" },
      { id: "pi.create", label: "Create Sessions", description: "Create new count sessions" },
      { id: "pi.count", label: "Perform Counts", description: "Enter physical count data" },
      { id: "pi.approve", label: "Approve Counts", description: "Review and approve counts" },
      { id: "pi.finalize", label: "Finalize Sessions", description: "Complete and lock sessions" },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: BarChart3,
    color: "text-cyan-500",
    permissions: [
      { id: "reports.view", label: "View Reports", description: "Access all system reports" },
      { id: "reports.export", label: "Export Data", description: "Export reports to Excel/CSV" },
      { id: "reports.dashboard", label: "Dashboard Access", description: "View dashboard analytics" },
    ],
  },
  {
    id: "pos",
    label: "Point of Sale",
    icon: Store,
    color: "text-emerald-500",
    permissions: [
      { id: "pos.access", label: "Access POS", description: "Use the point of sale system" },
      { id: "pos.refund", label: "Process Refunds", description: "Process customer refunds" },
      { id: "pos.discount", label: "Apply Discounts", description: "Apply discounts to sales" },
      { id: "pos.void", label: "Void Transactions", description: "Void or cancel transactions" },
      { id: "pos.reports", label: "View POS Reports", description: "Access POS-specific reports" },
    ],
  },
  {
    id: "alerts",
    label: "Alerts & Notifications",
    icon: AlertTriangle,
    color: "text-red-500",
    permissions: [
      { id: "alerts.view", label: "View Alerts", description: "View system alerts" },
      { id: "alerts.manage", label: "Manage Alerts", description: "Configure alert settings" },
    ],
  },
  {
    id: "configuration",
    label: "System Configuration",
    icon: Settings,
    color: "text-gray-500",
    permissions: [
      { id: "config.attributes", label: "Manage Attributes", description: "Edit categories, sizes, colors, etc." },
      { id: "config.stores", label: "Manage Stores", description: "Add/edit store locations" },
      { id: "config.suppliers", label: "Manage Suppliers", description: "Manage supplier information" },
      { id: "config.system", label: "System Settings", description: "Configure system-wide settings" },
    ],
  },
  {
    id: "users",
    label: "User Management",
    icon: Shield,
    color: "text-indigo-500",
    permissions: [
      { id: "users.view", label: "View Users", description: "View all system users" },
      { id: "users.create", label: "Create Users", description: "Create new user accounts" },
      { id: "users.roles", label: "Manage Roles", description: "Assign and modify user roles" },
      { id: "users.delete", label: "Remove Users", description: "Remove user access" },
    ],
  },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    // Full access to everything
    "inventory.view", "inventory.create", "inventory.update", "inventory.delete", "inventory.adjust",
    "po.view", "po.create", "po.update", "po.delete", "po.receive",
    "transfer.view", "transfer.create", "transfer.update", "transfer.approve", "transfer.receive",
    "pi.view", "pi.create", "pi.count", "pi.approve", "pi.finalize",
    "reports.view", "reports.export", "reports.dashboard",
    "pos.access", "pos.refund", "pos.discount", "pos.void", "pos.reports",
    "alerts.view", "alerts.manage",
    "config.attributes", "config.stores", "config.suppliers", "config.system",
    "users.view", "users.create", "users.roles", "users.delete",
  ],
  supervisor: [
    // Full inventory, transfers, and PI access, view-only for POs
    "inventory.view", "inventory.create", "inventory.update", "inventory.adjust",
    "po.view", "po.receive",
    "transfer.view", "transfer.create", "transfer.update", "transfer.approve", "transfer.receive",
    "pi.view", "pi.create", "pi.count", "pi.approve", "pi.finalize",
    "reports.view", "reports.export", "reports.dashboard",
    "pos.access", "pos.refund", "pos.discount", "pos.reports",
    "alerts.view",
    "config.attributes", "config.stores",
  ],
  inventory_man: [
    // Can manage inventory and do counts
    "inventory.view", "inventory.create", "inventory.update", "inventory.adjust",
    "po.view", "po.receive",
    "transfer.view", "transfer.create",
    "pi.view", "pi.create", "pi.count",
    "reports.view",
    "pos.access",
    "alerts.view",
  ],
  cashier: [
    // POS and view-only access
    "inventory.view",
    "reports.view",
    "pos.access",
    "alerts.view",
  ],
};

const ROLE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  admin: {
    title: "Administrator",
    description: "Full system access and control. Can manage users, configuration, and all operations.",
  },
  supervisor: {
    title: "Supervisor",
    description: "Manage operations, approve actions, and oversee daily activities.",
  },
  inventory_man: {
    title: "Inventory Manager",
    description: "Handle inventory management, stock counts, and receiving.",
  },
  cashier: {
    title: "Cashier",
    description: "Point of sale access with view-only inventory permissions.",
  },
};

export const UserPermissionsDialog: React.FC<UserPermissionsDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSave,
  onDelete,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "cashier");
  const [selectedStoreId, setSelectedStoreId] = useState<string>(user?.store_id || "");
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role || "cashier");
      setSelectedStoreId(user.store_id || "");
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadStores();
    }
  }, [open]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, location")
        .order("name");
      
      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error("Error loading stores:", err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await onSave(user.id, selectedRole, selectedStoreId || null);
      toast({
        title: "Success",
        description: "User permissions updated successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      await onDelete(user.id);
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const activePermissions = ROLE_PERMISSIONS[selectedRole] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5" />
            User Management
          </DialogTitle>
          <DialogDescription>
            Manage user profile, role, and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="role" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Role
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input value={user?.id || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user?.username || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Assigned Store
              </Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Store Assigned</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} {store.location ? `- ${store.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assigning a store limits the user's access to that specific store's data.
              </p>
            </div>
          </TabsContent>

          {/* Role Tab */}
          <TabsContent value="role" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Select Role</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ROLE_DESCRIPTIONS).map(([role, info]) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedRole === role
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{info.title}</span>
                      {selectedRole === role && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Role Summary</h4>
              <p className="text-sm text-muted-foreground">
                {ROLE_DESCRIPTIONS[selectedRole]?.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {activePermissions.length} permissions
                </Badge>
              </div>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Permissions for {ROLE_DESCRIPTIONS[selectedRole]?.title}</Label>
              <Badge variant="secondary">
                {activePermissions.length} active permissions
              </Badge>
            </div>
            
            <ScrollArea className="h-[400px] rounded-lg border p-4">
              <div className="space-y-6">
                {PERMISSION_CATEGORIES.map((category) => {
                  const categoryActiveCount = category.permissions.filter((p) =>
                    activePermissions.includes(p.id)
                  ).length;
                  const IconComponent = category.icon;

                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-5 h-5 ${category.color}`} />
                        <h3 className="font-semibold">{category.label}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {categoryActiveCount} / {category.permissions.length}
                        </Badge>
                      </div>
                      <div className="ml-7 grid gap-2">
                        {category.permissions.map((permission) => {
                          const isActive = activePermissions.includes(permission.id);
                          return (
                            <div
                              key={permission.id}
                              className={`flex items-start space-x-3 p-2 rounded ${
                                isActive ? "bg-primary/5" : "opacity-50"
                              }`}
                            >
                              <Checkbox
                                checked={isActive}
                                disabled
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <Label className="text-sm font-medium">
                                  {permission.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <p className="text-xs text-muted-foreground">
              * Permissions are determined by the selected role. To modify individual permissions, 
              contact system administrator for custom role configuration.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete User"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
