import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface CatalogManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: any;
  items: any[];
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function CatalogManagementDialog({
  open,
  onOpenChange,
  catalog,
  items,
  newValue,
  onNewValueChange,
  onAdd,
  onDelete,
}: CatalogManagementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage {catalog?.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => onNewValueChange(e.target.value)}
              placeholder={`Add new ${catalog?.label?.toLowerCase()}`}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
            />
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <span>{item.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
