// ---------------------------------------------------------------------
// Configuration.tsx
// ---------------------------------------------------------------------
import React, { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Switch,
  Badge,
} from "@/components/ui"; // Adjust import paths
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Save,
  DollarSign,
  Package,
  Lock,
  Factory,
  GitPullRequest,
  Building,
  Shield,
  Briefcase,
  Wrench,
  MonitorOff,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useAuth } from "@/hooks/useAuth";
import { UserPermissionsDialog } from "./UserPermissionsDialog";
import { AddUserDialog } from "./AddUserDialog";
import { DatabaseAdminPanel } from "./DatabaseAdminPanel";
import { ATTRIBUTE_ICONS } from "@/constants/icons";
import OrganizationalStructure from "./OrganizationalStructure";
import WorkflowRules from "./WorkflowRules";

// ---------------------------------------------------------------------
// 6. Add Attribute Dialog
// ---------------------------------------------------------------------
const AddAttributeDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, label: string, icon: string) => Promise<void>;
  isAdmin: boolean;
}> = ({ open, onOpenChange, onSave, isAdmin }) => {
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
            <label htmlFor="attr-label">Display Label (e.g., Color)</label>
            <Input
              id="attr-label"
              placeholder="Enter display label"
              value={newAttrLabel}
              onChange={(e) => setNewAttrLabel(e.target.value)}
              disabled={loadingAttribute || !isAdmin}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="attr-name">Table Name (e.g., colors)</label>
            <Input
              id="attr-name"
              placeholder="Enter unique table name (lowercase, no spaces)"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              disabled={loadingAttribute || !isAdmin}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="attr-icon">Icon</label>
            <Select value={newAttrIcon} onValueChange={setNewAttrIcon} disabled={loadingAttribute || !isAdmin}>
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
// Catalog Management Dialog
// ---------------------------------------------------------------------
const CatalogManagementDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCatalog: AttributeType | null;
  isAdmin: boolean;
  loadData: (tableName: string, pageNum: number, search: string) => Promise<void>;
  catalogItems: CatalogItem[];
  page: number;
  totalPages: number;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  setPage: (p: number) => void;
  handleExport: () => void;
  handleAdd: () => void;
  handleDelete: (itemId: string) => void;
  handleEdit: (item: CatalogItem) => void;
  newValue: string;
  setNewValue: (s: string) => void;
}> = ({
  open,
  onOpenChange,
  activeCatalog,
  isAdmin,
  loadData,
  catalogItems,
  page,
  totalPages,
  searchTerm,
  setSearchTerm,
  setPage,
  handleExport,
  handleAdd,
  handleDelete,
  handleEdit,
  newValue,
  setNewValue,
}) => {
  if (!activeCatalog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage {activeCatalog?.label}</DialogTitle>
          <DialogDescription>Add, edit, or remove entries for {activeCatalog?.label.toLowerCase()}.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              placeholder={`Search ${activeCatalog.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData(activeCatalog.table_name, 1, searchTerm)}
            />
            <Button onClick={() => loadData(activeCatalog.table_name, 1, searchTerm)}>
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
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)} disabled={!isAdmin}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} disabled={!isAdmin}>
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

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                setPage(page - 1);
                loadData(activeCatalog.table_name, page - 1, searchTerm);
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
                loadData(activeCatalog.table_name, page + 1, searchTerm);
              }}
            >
              Next
            </Button>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Input
            placeholder={`Add new ${activeCatalog.label.toLowerCase()}...`}
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
// Edit Catalog Item Dialog
// ---------------------------------------------------------------------
const EditCatalogItemDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItem | null;
  activeCatalog: AttributeType | null;
  onSave: (itemId: string, newName: string) => Promise<void>;
}> = ({ open, onOpenChange, item, activeCatalog, onSave }) => {
  const [newName, setNewName] = useState(item?.name || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => setNewName(item?.name || ""), [item]);

  const handleSave = async () => {
    if (!item || !newName.trim()) return;
    setLoading(true);
    await onSave(item.id, newName.trim());
    setLoading(false);
    onOpenChange(false);
  };

  if (!item || !activeCatalog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit {activeCatalog.label}</DialogTitle>
          <DialogDescription>Update the name of the selected item.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------
// MAIN CONFIGURATION COMPONENT
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

  // ---------------- USERS ----------------
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const { data, error: edgeError } = await supabase.functions.invoke("admin-list-users");
      if (edgeError) throw edgeError;
      setUsers(data?.users || []);
    } catch (err: any) {
      console.error(err);
      setErrorUsers("Failed to load user list.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, role: newRole, action: "update" },
      });
      if (error) throw error;
      toast({ title: "Success", description: `Role updated to ${newRole}.` });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Role Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const deleteUserRole = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage-user-role", {
        body: { userId, action: "delete" },
      });
      if (error) throw error;
      toast({ title: "Success", description: `Role removed.` });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Role Removal Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleEditPermissions = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  // ---------------- ATTRIBUTES ----------------
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<AttributeType | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [newValue, setNewValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 10;

  const [editCatalogItem, setEditCatalogItem] = useState<CatalogItem | null>(null);
  const [showEditCatalogDialog, setShowEditCatalogDialog] = useState(false);

  const loadAttributeTypes = useCallback(async () => {
    const { data, error } = await supabase.from("attribute_types").select("*").order("label", { ascending: true });
    if (error) toast({ title: "Error", description: "Failed to load attribute types.", variant: "destructive" });
    setAttributeTypes(data || []);
  }, []);

  useEffect(() => {
    loadAttributeTypes();
  }, [loadAttributeTypes]);

  const handleAttributeTypeSave = async (name: string, label: string, icon: string) => {
    try {
      const tableName = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error } = await supabase.rpc("create_attribute_table", {
        p_table_name: tableName,
        p_label: label.trim(),
        p_icon: icon || "Tags",
      });
      if (error) throw error;
      toast({ title: "Success", description: `Attribute type '${label}' created.` });
      loadAttributeTypes();
      reloadDynamicLists();
    } catch (err: any) {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    }
  };

  const loadCatalogData = useCallback(async (tableName: string, pageNum: number, search: string) => {
    const from = (pageNum - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    let query = supabase.from(tableName).select("*", { count: "exact" });
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error, count } = await query.order("name", { ascending: true }).range(from, to);
    if (error) {
      setCatalogItems([]);
      setTotalPages(1);
      toast({ title: "DB Error", description: `Failed to load catalog for ${tableName}.`, variant: "destructive" });
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
    loadCatalogData(attr.table_name, 1, "");
  };

  const handleAddCatalogItem = async () => {
    if (!newValue || !activeCatalog) return;
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can add catalog items.",
        variant: "destructive",
      });
    const { error } = await supabase.from(activeCatalog.table_name).insert({ name: newValue.trim() });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Success", description: `Added '${newValue}'.` });
      setNewValue("");
      loadCatalogData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleDeleteCatalogItem = async (itemId: string) => {
    if (!activeCatalog) return;
    if (!isAdmin)
      return toast({
        title: "Permission Denied",
        description: "Only admins can delete catalog items.",
        variant: "destructive",
      });
    const { error } = await supabase.from(activeCatalog.table_name).delete().eq("id", itemId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted", description: "Item removed." });
      loadCatalogData(activeCatalog.table_name, page, searchTerm);
    }
  };

  const handleEditCatalogItem = (item: CatalogItem) => {
    setEditCatalogItem(item);
    setShowEditCatalogDialog(true);
  };

  const handleSaveEditedCatalogItem = async (itemId: string, newName: string) => {
    if (!activeCatalog) return;
    const { error } = await supabase.from(activeCatalog.table_name).update({ name: newName }).eq("id", itemId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Success", description: `Item updated to '${newName}'.` });
      loadCatalogData(activeCatalog.table_name, page, searchTerm);
    }
  };

  return (
    <div className="space-y-8">
      {/* USERS SECTION */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage system users and roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
              <Plus className="w-4 h-4 mr-1" /> Add User
            </Button>
          </div>
          {/* Users Table */}
        </CardContent>
      </Card>

      {/* ATTRIBUTE TYPES */}
      <Card>
        <CardHeader>
          <CardTitle>Attributes</CardTitle>
          <CardDescription>Manage stock item categories (e.g., Brand, Material).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {attributeTypes.map((attr) => (
              <Badge key={attr.id} onClick={() => handleOpenCatalog(attr)} className="cursor-pointer">
                {attr.label}
              </Badge>
            ))}
            <Button variant="outline" size="sm" onClick={() => setOpenAttributeDialog(true)} disabled={!isAdmin}>
              Add Attribute Type
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CATALOG MANAGEMENT DIALOG */}
      <CatalogManagementDialog
        open={openCatalogDialog}
        onOpenChange={setOpenCatalogDialog}
        activeCatalog={activeCatalog}
        isAdmin={isAdmin}
        loadData={loadCatalogData}
        catalogItems={catalogItems}
        page={page}
        totalPages={totalPages}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setPage={setPage}
        handleExport={() => toast({ title: "Export", description: "Export to Excel not implemented yet." })}
        handleAdd={handleAddCatalogItem}
        handleDelete={handleDeleteCatalogItem}
        handleEdit={handleEditCatalogItem}
        newValue={newValue}
        setNewValue={setNewValue}
      />

      {/* EDIT CATALOG ITEM DIALOG */}
      <EditCatalogItemDialog
        open={showEditCatalogDialog}
        onOpenChange={setShowEditCatalogDialog}
        item={editCatalogItem}
        activeCatalog={activeCatalog}
        onSave={handleSaveEditedCatalogItem}
      />

      {/* ADD ATTRIBUTE DIALOG */}
      <AddAttributeDialog
        open={openAttributeDialog}
        onOpenChange={setOpenAttributeDialog}
        onSave={handleAttributeTypeSave}
        isAdmin={isAdmin}
      />

      {/* USER PERMISSIONS DIALOG */}
      {selectedUser && (
        <UserPermissionsDialog
          open={showPermissionsDialog}
          onOpenChange={setShowPermissionsDialog}
          user={selectedUser}
          updateUserRole={updateUserRole}
          deleteUserRole={deleteUserRole}
        />
      )}

      {/* ADD USER DIALOG */}
      <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} onUserAdded={loadUsers} />
    </div>
  );
};

export default Configuration;
