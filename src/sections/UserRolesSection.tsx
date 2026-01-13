import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, RotateCcw, Shield, Store, User } from "lucide-react";

import { AddUserDialog } from "../dialogs/AddUserDialog";
import { UserPermissionsDialog } from "../dialogs/UserPermissionsDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const ROLE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  admin: { label: "Admin", variant: "destructive" },
  supervisor: { label: "Supervisor", variant: "default" },
  inventory_man: { label: "Inventory Manager", variant: "secondary" },
  cashier: { label: "Cashier", variant: "outline" },
};

export default function UserRolesSection({ isAdmin }: { isAdmin: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEditPermissions = (user: any) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const handleSaveUser = async (userId: string, role: string, storeId: string | null) => {
    // Update role
    const { error: roleError } = await supabase.functions.invoke("admin-manage-user-role", {
      body: { userId, role, action: "update" }
    });
    
    if (roleError) throw roleError;

    // Update store assignment (only update, don't upsert as username is required)
    const { error: storeError } = await supabase
      .from("user_profiles")
      .update({ store_id: storeId })
      .eq("user_id", userId);
    
    if (storeError) throw storeError;
    
    await loadUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId }
    });
    
    if (error) throw error;
    await loadUsers();
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return <Badge variant="outline">No Role</Badge>;
    const badge = ROLE_BADGES[role] || { label: role, variant: "outline" as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Users
          </CardTitle>
          <CardDescription>Manage users, roles, and store assignments</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loadingUsers}>
            <RotateCcw className={`w-4 h-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username / ID
                  </div>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Assigned Store
                  </div>
                </TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      {user.store_name ? (
                        <div className="text-sm">
                          <div className="font-medium">{user.store_name}</div>
                          {user.store_location && (
                            <div className="text-xs text-muted-foreground">{user.store_location}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">All Stores</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : "Never"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditPermissions(user)} 
                        disabled={!isAdmin}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <AddUserDialog 
        open={showAddUserDialog} 
        onOpenChange={setShowAddUserDialog} 
        onUserAdded={loadUsers} 
      />
      
      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onSave={handleSaveUser}
        onDelete={handleDeleteUser}
      />
    </Card>
  );
}
