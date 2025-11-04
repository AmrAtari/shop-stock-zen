import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export const UserPermissionsDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  onSave: (userId: string, role: string) => void;
  onDelete: (userId: string) => void;
}> = ({ open, onOpenChange, user, onSave, onDelete }) => {
  const [role, setRole] = useState(user?.role || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>Update or remove user permissions.</DialogDescription>
        </DialogHeader>

        {user && (
          <div className="grid gap-4 py-4">
            <p>Email: {user.email}</p>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="inventory_man">Inventory Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={() => user && onDelete(user.id)}>Delete</Button>
          <Button onClick={() => user && onSave(user.id, role)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
