import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string | null;
}

export const useAttachments = (entityType: string, entityId: string) => {
  return useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!entityType && !!entityId,
  });
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      entityType,
      entityId,
      description,
    }: {
      file: File;
      entityType: string;
      entityId: string;
      description?: string;
    }) => {
      // Upload file to storage
      const fileName = `${entityType}/${entityId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // Create attachment record
      const { data, error } = await supabase
        .from("document_attachments")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_path: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", variables.entityType, variables.entityId],
      });
      toast.success("File uploaded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      filePath,
      entityType,
      entityId,
    }: {
      id: string;
      filePath: string;
      entityType: string;
      entityId: string;
    }) => {
      // Extract file name from URL for deletion
      const urlParts = filePath.split("/");
      const storagePath = urlParts.slice(-3).join("/");

      // Delete from storage
      await supabase.storage.from("documents").remove([storagePath]);

      // Delete record
      const { error } = await supabase
        .from("document_attachments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return { entityType, entityId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", data.entityType, data.entityId],
      });
      toast.success("Attachment deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete attachment: ${error.message}`);
    },
  });
};
