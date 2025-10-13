import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";

type AttributeTable = "categories" | "sizes" | "colors" | "genders" | "seasons" | "suppliers" | "locations" | "units" | "departments" | "main_groups" | "origins" | "themes";

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
  const [activeTab, setActiveTab] = useState<AttributeTable>("categories");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllAttributes();
    }
  }, [isAdmin]);

  const fetchAllAttributes = async () => {
    const tables: AttributeTable[] = ["categories", "sizes", "colors", "genders", "seasons", "suppliers", "locations", "units", "departments", "main_groups", "origins", "themes"];
    
    const promises = tables.map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("name");
      
      return { table, data: data || [] };
    });

    const results = await Promise.all(promises);
    const newAttributes = results.reduce((acc, { table, data }) => {
      acc[table] = data;
      return acc;
    }, {} as Record<AttributeTable, Attribute[]>);

    setAttributes(newAttributes);
  };

  const handleAdd = async () => {
    if (!newValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    try {
      const { error } = await supabase
        .from(activeTab)
        .insert({ name: newValue.trim() });

      if (error) throw error;

      toast.success("Added successfully");
      setNewValue("");
      fetchAllAttributes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Deleted successfully");
      fetchAllAttributes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Manage your inventory attributes and database structure
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AttributeTable)}>
        <TabsList className="flex flex-wrap w-full gap-1">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="main_groups">Main Groups</TabsTrigger>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="genders">Genders</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="origins">Origins</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
        </TabsList>

        {(["categories", "departments", "main_groups", "sizes", "colors", "genders", "seasons", "origins", "themes", "suppliers", "locations", "units"] as AttributeTable[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={`Add new ${tab.slice(0, -1)}...`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add
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
                  {attributes[tab].map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {attributes[tab].length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No {tab} defined yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Configuration;
