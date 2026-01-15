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
  Key,
  Eye,
  EyeOff,
  Percent,
  Receipt,
  History,
  CreditCard,
  DollarSign,
  RotateCcw,
  Ban,
  Clock,
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
  onSave: (userId: string, role: string, storeId: string | null, username?: string) => Promise<void>;
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
      { id: "pos.view_previous", label: "View Previous Vouchers", description: "Access and view past transaction receipts" },
      { id: "pos.reprint", label: "Reprint Receipts", description: "Reprint previous transaction receipts" },
      { id: "pos.price_override", label: "Price Override", description: "Override item prices during sale" },
      { id: "pos.hold_recall", label: "Hold & Recall", description: "Hold transactions and recall them later" },
      { id: "pos.cash_drawer", label: "Open Cash Drawer", description: "Manually open the cash drawer" },
      { id: "pos.end_of_day", label: "End of Day", description: "Perform end of day closing procedures" },
    ],
  },
  {
    id: "pos_limits",
    label: "POS Limits & Controls",
    icon: Percent,
    color: "text-amber-500",
    permissions: [
      { id: "pos.discount_5", label: "Discount up to 5%", description: "Apply discounts up to 5% of item price" },
      { id: "pos.discount_10", label: "Discount up to 10%", description: "Apply discounts up to 10% of item price" },
      { id: "pos.discount_15", label: "Discount up to 15%", description: "Apply discounts up to 15% of item price" },
      { id: "pos.discount_20", label: "Discount up to 20%", description: "Apply discounts up to 20% of item price" },
      { id: "pos.discount_unlimited", label: "Unlimited Discount", description: "No discount percentage limit" },
      { id: "pos.refund_limit_100", label: "Refund up to 100", description: "Process refunds up to 100 value" },
      { id: "pos.refund_limit_500", label: "Refund up to 500", description: "Process refunds up to 500 value" },
      { id: "pos.refund_unlimited", label: "Unlimited Refunds", description: "No refund value limit" },
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
      { id: "users.reset_password", label: "Reset Passwords", description: "Reset other users' passwords" },
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
    "pos.view_previous", "pos.reprint", "pos.price_override", "pos.hold_recall", "pos.cash_drawer", "pos.end_of_day",
    "pos.discount_unlimited", "pos.refund_unlimited",
    "alerts.view", "alerts.manage",
    "config.attributes", "config.stores", "config.suppliers", "config.system",
    "users.view", "users.create", "users.roles", "users.delete", "users.reset_password",
  ],
  supervisor: [
    // Full inventory, transfers, and PI access, view-only for POs
    "inventory.view", "inventory.create", "inventory.update", "inventory.adjust",
    "po.view", "po.receive",
    "transfer.view", "transfer.create", "transfer.update", "transfer.approve", "transfer.receive",
    "pi.view", "pi.create", "pi.count", "pi.approve", "pi.finalize",
    "reports.view", "reports.export", "reports.dashboard",
    "pos.access", "pos.refund", "pos.discount", "pos.reports",
    "pos.view_previous", "pos.reprint", "pos.price_override", "pos.hold_recall", "pos.cash_drawer", "pos.end_of_day",
    "pos.discount_20", "pos.refund_limit_500",
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
    "pos.view_previous", "pos.hold_recall",
    "pos.discount_10", "pos.refund_limit_100",
    "alerts.view",
  ],
  cashier: [
    // POS and view-only access with configurable limits
    "inventory.view",
    "reports.view",
    "pos.access",
    "pos.hold_recall",
    "pos.discount_5",
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
  
  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role || "cashier");
      setSelectedStoreId(user.store_id || "");
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadStores();
      // Reset password fields when dialog opens
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
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
      await onSave(user.id, selectedRole, selectedStoreId === "none" ? null : selectedStoreId || null, user.username || user.email?.split('@')[0]);
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

  const handleResetPassword = async () => {
    if (!user) return;
    
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId: user.id, newPassword }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Password has been reset successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
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

  // Group POS-related permissions for better display
  const getPOSLimitSummary = () => {
    const discountLimit = activePermissions.find(p => p.startsWith("pos.discount_"));
    const refundLimit = activePermissions.find(p => p.startsWith("pos.refund_"));
    
    let discount = "None";
    let refund = "None";
    
    if (discountLimit) {
      if (discountLimit === "pos.discount_unlimited") discount = "Unlimited";
      else discount = discountLimit.replace("pos.discount_", "") + "%";
    }
    
    if (refundLimit) {
      if (refundLimit === "pos.refund_unlimited") refund = "Unlimited";
      else refund = "Up to " + refundLimit.replace("pos.refund_limit_", "");
    }
    
    return { discount, refund };
  };

  const posLimits = getPOSLimitSummary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5" />
            User Management
          </DialogTitle>
          <DialogDescription>
            Manage user profile, role, security, and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Security
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
                  <SelectItem value="none">No Store Assigned</SelectItem>
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

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Reset Password</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Set a new password for this user. The user will need to use this new password to log in.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={resettingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={resettingPassword}
                  />
                </div>
                
                <Button 
                  onClick={handleResetPassword} 
                  disabled={resettingPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {resettingPassword ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Account Status
              </h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Role:</span>
                  <span className="font-medium">{ROLE_DESCRIPTIONS[user?.role || "cashier"]?.title}</span>
                </div>
              </div>
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

            {/* POS Limits Summary for roles */}
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Store className="w-4 h-4" />
                POS Limits for {ROLE_DESCRIPTIONS[selectedRole]?.title}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Percent className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Max Discount</p>
                    <p className="font-semibold">{posLimits.discount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <RotateCcw className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Refund Limit</p>
                    <p className="font-semibold">{posLimits.refund}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {activePermissions.includes("pos.view_previous") ? (
                    <Badge variant="outline" className="text-green-600 bg-green-500/10">
                      <Receipt className="w-3 h-3 mr-1" />
                      View Vouchers
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Ban className="w-3 h-3 mr-1" />
                      No Vouchers
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activePermissions.includes("pos.void") ? (
                    <Badge variant="outline" className="text-green-600 bg-green-500/10">
                      <Ban className="w-3 h-3 mr-1" />
                      Void Sales
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Ban className="w-3 h-3 mr-1" />
                      No Void
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activePermissions.includes("pos.price_override") ? (
                    <Badge variant="outline" className="text-green-600 bg-green-500/10">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Price Override
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Ban className="w-3 h-3 mr-1" />
                      No Override
                    </Badge>
                  )}
                </div>
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
