import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  ArrowRightLeft,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  Settings,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    role: "admin" | "supervisor" | "inventory_man" | "cashier" | null;
  } | null;
  onSave: (userId: string, role: "admin" | "supervisor" | "inventory_man" | "cashier") => Promise<void>;
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
    ],
  },
  {
    id: "users",
    label: "User Management",
    icon: Shield,
    color: "text-indigo-500",
    permissions: [
      { id: "users.view", label: "View Users", description: "View all system users" },
      { id: "users.invite", label: "Invite Users", description: "Send user invitations" },
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
    "alerts.view", "alerts.manage",
    "config.attributes", "config.stores", "config.suppliers",
    "users.view", "users.invite", "users.roles", "users.delete",
  ],
  supervisor: [
    // Full inventory, transfers, and PI access, view-only for POs
    "inventory.view", "inventory.create", "inventory.update", "inventory.adjust",
    "po.view", "po.receive",
    "transfer.view", "transfer.create", "transfer.update", "transfer.approve", "transfer.receive",
    "pi.view", "pi.create", "pi.count", "pi.approve", "pi.finalize",
    "reports.view", "reports.export", "reports.dashboard",
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
    "alerts.view",
  ],
  cashier: [
    // View-only access
    "inventory.view",
    "reports.view",
    "alerts.view",
  ],
};

export function UserPermissionsDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: UserPermissionsDialogProps) {
  const [selectedRole, setSelectedRole] = useState<"admin" | "supervisor" | "inventory_man" | "cashier">("cashier");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role);
    }
  }, [user]);

  const getRolePermissions = (role: string) => ROLE_PERMISSIONS[role] || [];

  const handleRoleChange = (role: "admin" | "supervisor" | "inventory_man" | "cashier") => {
    setSelectedRole(role);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await onSave(user.id, selectedRole);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const activePermissions = getRolePermissions(selectedRole);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">User Permissions & Role Management</DialogTitle>
          <DialogDescription>
            Viewing permissions for <span className="font-semibold text-foreground">{user?.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Role</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRoleChange("admin")}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedRole === "admin"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">Administrator</span>
                  {selectedRole === "admin" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Full system access and control</p>
              </button>

              <button
                onClick={() => handleRoleChange("supervisor")}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedRole === "supervisor"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">Supervisor</span>
                  {selectedRole === "supervisor" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Manage operations and approve actions</p>
              </button>

              <button
                onClick={() => handleRoleChange("inventory_man")}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedRole === "inventory_man"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">Inventory Manager</span>
                  {selectedRole === "inventory_man" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Handle inventory and counts</p>
              </button>

              <button
                onClick={() => handleRoleChange("cashier")}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedRole === "cashier"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">Cashier</span>
                  {selectedRole === "cashier" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">View-only access to inventory</p>
              </button>
            </div>
          </div>

          {/* Permissions Preview */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Permissions Included</Label>
            <ScrollArea className="h-[400px] rounded-lg border p-4">
              <div className="space-y-6">
                {PERMISSION_CATEGORIES.map((category) => {
                  const categoryPermissions = category.permissions.filter((p) =>
                    activePermissions.includes(p.id)
                  );

                  if (categoryPermissions.length === 0) return null;

                  const IconComponent = category.icon;

                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-5 h-5 ${category.color}`} />
                        <h3 className="font-semibold">{category.label}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {categoryPermissions.length} / {category.permissions.length}
                        </Badge>
                      </div>
                      <div className="ml-7 space-y-3">
                        {category.permissions.map((permission) => {
                          const isActive = activePermissions.includes(permission.id);
                          return (
                            <div
                              key={permission.id}
                              className={`flex items-start space-x-3 ${
                                !isActive ? "opacity-40" : ""
                              }`}
                            >
                              <Checkbox
                                checked={isActive}
                                disabled
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {permission.label}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
