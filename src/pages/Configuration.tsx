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
  | "certificates"
  | "stores";

interface Attribute {
  id: string;
  name: string;
}

const Configuration = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [attributes, setAttributes] = useState<Record<AttributeTable, Attribute[]>>({
    categories: [],
    units: [],
    colors: [],
    genders: [],
    departments: [],
    suppliers: [],
    seasons: [],
    locations: [],
    user_groups: [],
    employees: [],
    certificates: [],
    stores: [],
  });

  const [newValue, setNewValue] = useState("");
  const [activeTable, setActiveTable] = useState<AttributeTable | null>("categories");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAllAttributes();
  }, [isAdmin]);

  const fetchAllAttributes = async () => {
    const tables: AttributeTable[] = Object.keys(attributes) as AttributeTable[];
    const promises = tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      return { table, data: data || [] };
    });

    const results = await Promise.all(promises);
    const newAttributes = results.reduce(
      (acc, { table, data }) => {
        acc[table] = data as Attribute[];
        return acc;
      },
      {} as Record<AttributeTable, Attribute[]>,
    );
    setAttributes(newAttributes);
  };

  const handleAdd = async () => {
    if (!activeTable) return;
    if (!newValue.trim()) return toast.error("Please enter a name");

    try {
      const { error } = await supabase.from(activeTable).insert({ name: newValue.trim() });
      if (error) throw error;
      toast.success("Added successfully");
      setNewValue("");
      fetchAllAttributes();
    } catch (err: any) {
      toast.error(err.message || "Error adding item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeTable) return;
    if (!confirm("Delete this item?")) return;

    try {
      const { error } = await supabase.from(activeTable).delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted successfully");
      fetchAllAttributes();
    } catch (err: any) {
      toast.error(err.message || "Error deleting item");
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
    { key: "certificates", label: "Certificate Catalog", icon: FileText },
    { key: "stores", label: "Store Catalog", icon: Warehouse },
  ] as { key: AttributeTable; label: string; icon: any }[];

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">System Catalogs</h1>

      {/* === Horizontal Button Bar === */}
      <div className="flex flex-wrap gap-2">
        {catalogs.map((cat) => (
          <Button
            key={cat.key}
            variant={activeTable === cat.key ? "default" : "outline"}
            className={`flex items-center gap-2 ${
              activeTable === cat.key ? "bg-indigo-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTable(cat.key)}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* === Selected Table === */}
      {activeTable && (
        <div className="mt-6 space-y-4">
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

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attributes[activeTable] || []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {(attributes[activeTable] || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No {activeTable} added yet
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
