import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

import { AddAttributeDialog } from "../dialogs/AddAttributeDialog";
import { CatalogManagementDialog } from "../dialogs/CatalogManagementDialog";
import { ATTRIBUTE_ICONS } from "@/constants/icons";

export default function StockAttributesSection() {
  const [attributeTypes, setAttributeTypes] = useState<any[]>([]);
  const [openAttributeDialog, setOpenAttributeDialog] = useState(false);
  const [openCatalogDialog, setOpenCatalogDialog] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<any | null>(null);

  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [newValue, setNewValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const loadAttributeTypes = useCallback(async () => {
    const { data, error } = await supabase.from("attribute_types").select("*").order("label", { ascending: true });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
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
        p_label: label,
        p_icon: icon || "Tags",
      });
      if (error) throw error;
      toast({ title: "Success", description: `Attribute type '${label}' created.`, variant: "default" });
      loadAttributeTypes();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleOpenCatalog = (attr: any) => {
    setActiveCatalog(attr);
    setOpenCatalogDialog(true);
  };

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <CardTitle>Stock Attributes</CardTitle>
        <Button onClick={() => setOpenAttributeDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Type
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {attributeTypes.map((attr) => {
          const Icon = ATTRIBUTE_ICONS.find((i) => i.value === attr.icon)?.icon || Tags;
          return (
            <Card key={attr.id} className="cursor-pointer hover:shadow" onClick={() => handleOpenCatalog(attr)}>
              <CardHeader className="flex justify-between">
                <CardTitle className="text-sm">{attr.label}</CardTitle>
                <Icon className="w-5 h-5 text-gray-400" />
              </CardHeader>
            </Card>
          );
        })}
      </CardContent>

      <AddAttributeDialog
        open={openAttributeDialog}
        onOpenChange={setOpenAttributeDialog}
        onSave={handleAttributeTypeSave}
        isAdmin={true}
      />
      <CatalogManagementDialog
        open={openCatalogDialog}
        onOpenChange={setOpenCatalogDialog}
        activeCatalog={activeCatalog}
        isAdmin={true}
        catalogItems={catalogItems}
        newValue={newValue}
        setNewValue={setNewValue}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loadData={async () => {}}
        handleAdd={async () => {}}
        handleDelete={async () => {}}
        handleEdit={() => {}}
        handleExport={() => {}}
      />
    </Card>
  );
}
