import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Store {
  id: string;
  name: string;
  location: string;
}

export const AddUserDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}> = ({ open, onOpenChange, onUserAdded }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("cashier");
  const [storeId, setStoreId] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadStores();
    }
  }, [open]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, location")
        .order("name");
      
      if (error) throw error;
      setStores(data || []);
    } catch (err: any) {
      console.error("Error loading stores:", err);
    }
  };

  const handleAddUser = async () => {
    if (!username || !password || !role) {
      return toast({ 
        title: "Error", 
        description: "Username, password, and role are required.", 
        variant: "destructive" 
      });
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user-password", {
        body: { username, password, role, storeId: storeId === "none" ? null : storeId || null }
      });

      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: "User created successfully.", 
        variant: "default" 
      });
      
      setUsername("");
      setPassword("");
      setRole("cashier");
      setStoreId("");
      onUserAdded();
      onOpenChange(false);
    } catch (err: any) {
      toast({ 
        title: "Failed", 
        description: err.message || "Failed to create user", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user with username and password authentication.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              placeholder="Enter password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="inventory_man">Inventory Manager</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store">Assigned Store</Label>
            <Select value={storeId} onValueChange={setStoreId} disabled={loading}>
              <SelectTrigger id="store">
                <SelectValue placeholder="Select store (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Store</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} {store.location ? `- ${store.location}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAddUser} disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
