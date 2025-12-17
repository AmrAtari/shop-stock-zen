import { FileText, Image, FileSpreadsheet, Trash2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAttachments, useDeleteAttachment } from "@/hooks/useAttachments";
import { format } from "date-fns";

interface AttachmentListProps {
  entityType: string;
  entityId: string;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return FileText;
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return FileSpreadsheet;
  return FileText;
};

export function AttachmentList({ entityType, entityId }: AttachmentListProps) {
  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const deleteAttachment = useDeleteAttachment();

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading attachments...</div>;
  }

  if (!attachments?.length) {
    return <div className="text-center py-4 text-muted-foreground">No attachments yet</div>;
  }

  const handleDelete = (id: string, filePath: string) => {
    deleteAttachment.mutate({ id, filePath, entityType, entityId });
  };

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => {
        const Icon = getFileIcon(attachment.file_type);
        return (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{attachment.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {attachment.file_size
                    ? `${(attachment.file_size / 1024).toFixed(1)} KB`
                    : "Unknown size"}
                  {attachment.created_at &&
                    ` • ${format(new Date(attachment.created_at), "MMM dd, yyyy")}`}
                </p>
                {attachment.description && (
                  <p className="text-sm text-muted-foreground">{attachment.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a href={attachment.file_path} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a href={attachment.file_path} download={attachment.file_name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{attachment.file_name}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(attachment.id, attachment.file_path)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
