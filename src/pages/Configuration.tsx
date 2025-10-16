import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";

type AttributeTable =
  | "categories"
  | "sizes"
  | "colors"
  | "genders"
  | "seasons"
  | "suppliers"
  | "locations"
  | "units"
  | "departments"
  | "main_groups"
  | "origins"
  | "themes";

interface Attribute {
  id: string;
  name: string;
}

const Configuration = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [attributes, setAttributes] = useState<Record<AttributeTable, Attribute[]>>({
    categories: [],
    sizes: [],
    colors: [],
    genders: [],
    seasons: [],
    suppliers: [],
    locations: [],
    units: [],
    departments: [],
    main_groups: [],
    origins: [],
    themes: [],
  });

  const [newValue, setNewValue] = useState("");
  const [activeTable, setActiveTable] = useState<AttributeTable | null>(null);

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
    const tables: AttributeTable[] = [
      "categories",
      "sizes",
      "colors",
      "genders",
      "seasons",
      "suppliers",
      "locations",
      "units",
      "departments",
      "main_groups",
      "origins",
      "themes",
    ];

    const promises = tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      return { table, data: data || [] };
    });

    const results = await Promise.all(promises);
    const newAttributes = results.reduce(
      (acc, { table, data }) => {
        acc[table as AttributeTable] = data as Attribute[];
        return acc;
      },
      {} as Record<AttributeTable, Attribute[]>,
    );

    setAttributes((prev) => ({ ...prev, ...newAttributes }));
  };

  const handleAdd = async () => {
    if (!activeTable) return toast.error("Select a catalog first");
    if (!newValue.trim()) return toast.error("Please enter a value");

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
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase.from(activeTable).delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted successfully");
      fetchAllAttributes();
    } catch (err: any) {
      toast.error(err.message || "Error deleting item");
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  // These will appear as the catalog buttons
  const catalogs = [
    { name: "Categories", key: "categories" },
    { name: "Sizes", key: "sizes" },
    { name: "Colors", key: "colors" },
    { name: "Genders", key: "genders" },
    { name: "Seasons", key: "seasons" },
    { name: "Suppliers", key: "suppliers" },
    { name: "Locations", key: "locations" },
    { name: "Units", key: "units" },
    { name: "Departments", key: "departments" },
    { name: "Main Groups", key: "main_groups" },
    { name: "Origins", key: "origins" },
    { name: "Themes", key: "themes" },
  ] as { name: string; key: AttributeTable }[];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">System Catalogs</h1>
      <p className="text-gray-500">Select a catalog to manage its values</p>

      {/* Grid of Catalog Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {catalogs.map((cat) => (
          <div
            key={cat.key}
            onClick={() => setActiveTable(cat.key)}
            className={`p-6 rounded-lg border text-center shadow-sm cursor-pointer transition ${
              activeTable === cat.key ? "bg-blue-100 border-blue-500" : "hover:bg-gray-100"
            }`}
          >
            <h2 className="text-lg font-semibold text-gray-800">{cat.name}</h2>
          </div>
        ))}
      </div>

      {/* Display the selected catalog table */}
      {activeTable && (
        <div className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold text-gray-700">
            Manage: {activeTable.charAt(0).toUpperCase() + activeTable.slice(1)}
          </h2>

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
                      No data yet
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
