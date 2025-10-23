import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AttributeType {
  id: string;
  name: string;
  table_name: string;
  label: string;
  icon: string;
  created_at: string;
}

export interface AttributeValue {
  id: string;
  name: string;
}

export const useAttributeTypes = () => {
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttributeTypes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("attribute_types")
        .select("*")
        .order("label");

      if (error) throw error;
      setAttributeTypes(data || []);
    } catch (error: any) {
      console.error("Error fetching attribute types:", error);
      toast.error("Failed to load attribute types");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributeTypes();

    // Set up real-time subscription
    const subscription = supabase
      .channel("attribute_types_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attribute_types" }, () => {
        fetchAttributeTypes();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createAttributeType = async (tableName: string, label: string, icon: string = "Tag") => {
    try {
      const { data, error } = await supabase.rpc("create_attribute_table", {
        p_table_name: tableName,
        p_label: label,
        p_icon: icon,
      });

      if (error) throw error;

      toast.success("Attribute type created successfully");
      await fetchAttributeTypes();
      return { success: true, data };
    } catch (error: any) {
      console.error("Error creating attribute type:", error);
      toast.error(error.message || "Failed to create attribute type");
      return { success: false, error };
    }
  };

  const fetchAttributeValues = async (tableName: string): Promise<AttributeValue[]> => {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("id, name")
        .order("name");

      if (error) throw error;
      return (data || []) as unknown as AttributeValue[];
    } catch (error: any) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }
  };

  const fetchAllAttributeValues = async () => {
    const attributeData: Record<string, AttributeValue[]> = {};

    for (const type of attributeTypes) {
      attributeData[type.table_name] = await fetchAttributeValues(type.table_name);
    }

    return attributeData;
  };

  return {
    attributeTypes,
    isLoading,
    createAttributeType,
    fetchAttributeValues,
    fetchAllAttributeValues,
    refetch: fetchAttributeTypes,
  };
};
