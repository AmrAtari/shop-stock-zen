import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  | "stores";

interface Attribute {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

const Configuration = () => {
  const { isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<{ key: AttributeTable; label: string } | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newValue, setNewValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
    }
  }, [isAdmin, isLoading, navigate]);

  const loadData = async (table: AttributeTable, currentPage = 1, term = "") => {
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from(table as any)
        .select("*", { count: "exact" })
        .order("name")
        .range(from, to);

      if (term.trim()) query = query.ilike("name", `%${term.trim()}%`);

      const { data, count, error } = await query;
      if (error) throw error;

      setAttributes(data || []);
      setTotal(count || 0);
    } catch (err: any) {
      toast.error(err.message || "Error loading data");
    }
  };

  const handleOpen = async (catalog: { key: AttributeTable; label: string }) => {
    setActiveCatalog(catalog);
    setPage(1);
    await loadData(catalog.key, 1);
    setOpen(true);
    setSearchTerm("");
  };

  const handleAdd = async () => {
    if (!activeCatalog || !newValue.trim()) return toast.error("Please enter a value");
    try {
      const { error } = await supabase.from(activeCatalog.key as any).insert({ name: newValue.trim() });
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const catalogs = [
    { key: "categories", label: "Item Catalog", icon: Boxes },
    { key: "units", label: "UOM Catalog", icon: Ruler },
    { key: "colors", label: "Attributes Catalog", icon: Tags },
    { key: "genders", label: "Gender Catalog", icon: User },
    { key: "departments", label: "Department Catalog", icon: Building },
    { key: "suppliers", label: "Supplier Catalog", icon: Package },
    { key: "seasons", label: "Season", icon: CloudSun },
    { key: "locations", label: "Location Catalog", icon: MapPin },
    { key: "sizes", label: "Size Catalog", icon: Ruler },
    { key: "stores", label: "Store Catalog", icon: Warehouse },
  ] as { key: AttributeTable; label: string; icon: any }[];

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">System Catalogs</h1>

      {/* Catalog Buttons */}
      <div className="flex flex-wrap gap-2">
        {catalogs.map((cat) => (
          <Button
            key={cat.key}
            onClick={() => handleOpen(cat)}
            variant="outline"
            className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100 ${
              activeCatalog?.key === cat.key ? "bg-indigo-500 text-white hover:bg-indigo-600" : "text-gray-700"
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeCatalog?.label}</DialogTitle>
          </DialogHeader>

          {/* Search */}
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

          {/* List */}
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

          {/* Pagination */}
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

          {/* Add new */}
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
