import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { usePhysicalInventorySessions } from "@/hooks/usePhysicalInventorySessions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";

const PhysicalInventory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: sessions = [], isLoading } = usePhysicalInventorySessions();

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.session_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.stores?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.responsible_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string, sessionNumber: string) => {
    if (!confirm(`Are you sure you want to delete session ${sessionNumber}?`)) return;

    try {
      // Delete counts first
      await supabase
        .from("physical_inventory_counts")
        .delete()
        .eq("session_id", id);

      // Delete session
      const { error } = await supabase
        .from("physical_inventory_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: queryKeys.physicalInventory.all });
      toast.success(`Session ${sessionNumber} deleted`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete session");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCountTypeBadge = (type: string) => {
    const labels = {
      full: "Full Count",
      partial: "Partial Count",
      cycle: "Cycle Count",
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Physical Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage physical inventory count sessions</p>
        </div>
        <Button onClick={() => navigate("/inventory/physical/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Physical Count
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>View and manage all physical inventory sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by session number, store, or person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sessions Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sessions found</p>
              <Button
                variant="link"
                onClick={() => navigate("/inventory/physical/new")}
                className="mt-2"
              >
                Create your first physical count session
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session #</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Count Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.session_number}</TableCell>
                      <TableCell>{session.stores?.name || "—"}</TableCell>
                      <TableCell>{format(new Date(session.count_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{getCountTypeBadge(session.count_type)}</TableCell>
                      <TableCell>{session.responsible_person || "—"}</TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/inventory/physical/${session.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {session.status !== "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(session.id, session.session_number)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PhysicalInventory;
