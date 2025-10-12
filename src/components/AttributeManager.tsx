import { useState, useEffect } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Attribute {
  id: string;
  name: string;
}

interface AttributeManagerProps {
  table: string;
  title: string;
}

const AttributeManager = ({ table, title }: AttributeManagerProps) => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAttributes();
  }, [table]);

  const fetchAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .order("name");

      if (error) throw error;
      setAttributes((data as unknown as Attribute[]) || []);
    } catch (error: any) {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from(table as any)
        .insert({ name: newName.trim() });

      if (error) throw error;
      
      toast.success(`${title.slice(0, -1)} added successfully`);
      setNewName("");
      fetchAttributes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from(table as any)
        .update({ name: editingName.trim() })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`${title.slice(0, -1)} updated successfully`);
      setEditingId(null);
      setEditingName("");
      fetchAttributes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${title.slice(0, -1).toLowerCase()}?`)) return;

    try {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`${title.slice(0, -1)} deleted successfully`);
      fetchAttributes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Manage your {title.toLowerCase()} options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Add new ${title.slice(0, -1).toLowerCase()}...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAdd()}
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
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell>
                    {editingId === attr.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleUpdate(attr.id)}
                        autoFocus
                      />
                    ) : (
                      attr.name
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === attr.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdate(attr.id)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(attr.id);
                              setEditingName(attr.name);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(attr.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {attributes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No {title.toLowerCase()} yet. Add one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttributeManager;
