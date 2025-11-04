import React, { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { UserPermissionsDialog } from "../dialogs/UserPermissionsDialog";
import { AddUserDialog } from "../dialogs/AddUserDialog";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export default function UserRolesSection() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const { data, error: edgeError } = await supabase.functions.invoke("admin-list-users");
      if (edgeError) throw edgeError;

      const { users: fetchedUsers } = data;
      setUsers(fetchedUsers || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setErrorUsers("Failed to load user list. Check Edge Function logs.");
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>System Users</CardTitle>
          <CardDescription>View and manage user accounts and their assigned system roles.</CardDescription>
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
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : errorUsers ? (
          <p className="text-red-500">{errorUsers}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Sign-in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role || "None"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditPermissions(user)} disabled={!isAdmin}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        user={selectedUser}
        onSave={() => {}}
        onDelete={() => {}}
      />
      <AddUserDialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog} onUserAdded={loadUsers} />
    </Card>
  );
}
