import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Edit2, Plus, RotateCcw } from "lucide-react";

import { AddUserDialog } from "../dialogs/AddUserDialog";
import { UserPermissionsDialog } from "../dialogs/UserPermissionsDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export default function UserRolesSection({ isAdmin }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await supabase.functions.invoke("admin-list-users");
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

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <div>
          <CardTitle>System Users</CardTitle>
          <CardDescription>Manage users and roles</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUsers} disabled={loadingUsers}>
            <RotateCcw className={`w-4 h-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => setShowAddUserDialog(true)} disabled={!isAdmin}>
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Store</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <span className="capitalize">{user.role?.replace('_', ' ')}</span>
                </TableCell>
                <TableCell>
                  {user.store_name ? (
                    <div className="text-sm">
                      <div>{user.store_name}</div>
                      {user.store_location && (
                        <div className="text-muted-foreground">{user.store_location}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No store assigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => handleEditPermissions(user)} disabled={!isAdmin}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} onUserAdded={loadUsers} />
      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onSave={() => {}}
        onDelete={() => {}}
      />
    </Card>
  );
}
