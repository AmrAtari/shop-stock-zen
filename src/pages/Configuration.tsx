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
  Users,
  Briefcase,
  FileText,
  Warehouse,
  Plus,
  Trash2,
  Search,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  | "user_groups"
  | "employees"
  | "Sizes"
  | "stores";

interface Attribute {
  id: string;
  name: string;
}

const Configuration = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [activeTable, setActiveTable] = useState<AttributeTable | null>("categories");
  const [newValue, setNewValue] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (activeTable && isAdmin) {
      loadTableData();
    }
  }, [activeTable, page, search, isAdmin]);

  const loadTableData = async () => {
    if (!activeTable) return;
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from(activeTable).select("*").order("name").range(from, to);

      if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAttributes(data || []);
    } catch (err: any) {
      toast.error(err.message || "Error loading data");
    }
  };

  const handleAdd = async () => {
    if (!activeTable || !newValue.trim()) return toast.error("Please enter a value");
    try {
      const { error } = await supabase.from(activeTable).insert({ name: newValue.trim() });
      if (error) throw error;
      toast.success("Added successfully");
      setNewValue("");
      loadTableData();
    } catch (err: any) {
      toast.error(err.message || "Error adding item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeTable) return;
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase.from(activeTable).delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted successfully");
      loadTableData();
    } catch (err: any) {
      toast.error(err.message || "Error deleting item");
    }
  };

  const handleEditStart = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleEditSave = async (id: string) => {
    if (!activeTable || !editValue.trim()) return toast.error("Please enter a name");
    try {
      const { error } = await supabase.from(activeTable).update({ name: editValue.trim() }).eq("id", id);
      if (error) throw error;
      toast.success("Updated successfully");
      setEditingId(null);
      setEditValue("");
      loadTableData();
    } catch (err: any) {
      toast.error(err.message || "Error updating item");
    }
  };

  const catalogs = [
    { key: "categories", label: "Item Catalog", icon: Boxes },
    { key: "units", label: "UOM Catalog", icon: Ruler },
    { key: "colors", label: "Attributes Catalog", icon: Tags },
    { key: "genders", label: "Gender Catalog", icon: User },
    { key: "departments", label: "Department Catalog", icon: Building },
    { key: "suppliers", label: "Supplier Catalog", icon: Package },
    { key: "seasons", label: "Season", icon: CloudSun },
    { key: "locations", label: "Location Catalog", icon: MapPin },
    { key: "user_groups", label: "User Groups", icon: Users },
    { key: "employees", label: "Employee Catalog", icon: Briefcase },
    { key: "Sizes", label: "Size Catalog", icon: Ruler },
    { key: "stores", label: "Store Catalog", icon: Warehouse },
  ] as { key: AttributeTable; label: string; icon: any }[];

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">System Catalogs</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        {catalogs.map((cat) => (
          <Button
            key={cat.key}
            variant={activeTable === cat.key ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              activeTable === cat.key ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => {
              setActiveTable(cat.key);
              setPage(1);
              setSearch("");
            }}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Selected Catalog Table */}
      {activeTable && (
        <div className="space-y-4 mt-6">
          {/* Add new item */}
          <div className="flex gap-2">
            <Input
              placeholder={`Add new ${activeTable.slice(0, -1)}...`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>

          {/* Search + Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="w-64"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.length > 0 ? (
                  attributes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full" />
                        ) : (
                          item.name
                        )}
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        {editingId === item.id ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => handleEditSave(item.id)}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleEditCancel}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => handleEditStart(item.id, item.name)}>
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuration;
