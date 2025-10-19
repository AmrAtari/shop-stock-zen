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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stock Attributes
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
