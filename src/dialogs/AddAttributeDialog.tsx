import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ATTRIBUTE_ICONS } from "@/constants/icons";

interface AddAttributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, label: string, icon: string) => void;
}

export function AddAttributeDialog({ open, onOpenChange, onSave }: AddAttributeDialogProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Tags");

  const handleSubmit = () => {
    if (!name || !label) return;
    onSave(name, label, icon);
    setName("");
    setLabel("");
    setIcon("Tags");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Attribute Type</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., material"
            />
          </div>
          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Material"
            />
          </div>
          <div>
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_ICONS.map((iconItem) => {
                  const IconComponent = iconItem.icon;
                  return (
                    <SelectItem key={iconItem.value} value={iconItem.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        {iconItem.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
