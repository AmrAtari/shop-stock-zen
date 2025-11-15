import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Download, FileText, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePhysicalInventorySessions } from "@/hooks/usePhysicalInventorySessions";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queryKeys";

const PhysicalInventoryDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = usePhysicalInventorySessions();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Calculate dashboard metrics
  const metrics = useMemo(() => {
    if (!sessions) return { total: 0, inProgress: 0, completed: 0, draft: 0 };
    
    return {
      total: sessions.length,
      inProgress: sessions.filter(s => s.status === "in_progress").length,
      completed: sessions.filter(s => s.status === "completed").length,
      draft: sessions.filter(s => s.status === "draft").length,
    };
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter(session => {
      const matchesSearch = 
        session.session_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.stores?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.responsible_person?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || session.status === statusFilter;
      const matchesType = typeFilter === "all" || session.count_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [sessions, searchTerm, statusFilter, typeFilter]);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "secondary" as const, icon: FileText, label: "Draft" },
      in_progress: { variant: "default" as const, icon: Clock, label: "In Progress" },
      completed: { variant: "outline" as const, icon: CheckCircle2, label: "Completed" },
    };
    
    const config = variants[status as keyof typeof variants] || variants.draft;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory session?")) return;
    
    try {
      const { error } = await supabase
        .from("physical_inventory_sessions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Session deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.physicalInventory.all });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading inventory sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Physical Inventory</h1>
          <p className="text-muted-foreground">Manage and track stock counting sessions</p>
        </div>
        <Button onClick={() => navigate("/inventory/physical/new")} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          New Count Session
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription>Total Sessions</CardDescription>
            <CardTitle className="text-3xl">{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {metrics.inProgress}
              <Clock className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {metrics.completed}
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {metrics.draft}
              <FileText className="w-5 h-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by session number, store, or person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Count Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full">Full Count</SelectItem>
                <SelectItem value="partial">Partial Count</SelectItem>
                <SelectItem value="cycle">Cycle Count</SelectItem>
                <SelectItem value="spot">Spot Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Sessions</CardTitle>
          <CardDescription>
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Session #</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Count Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="space-y-3">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">No inventory sessions found</p>
                        <Button 
                          variant="outline" 
                          onClick={() => navigate("/inventory/physical/new")}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Create First Session
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => (
                    <TableRow
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/inventory/physical/${session.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {session.session_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.stores?.name || "N/A"}</div>
                          {session.stores?.location && (
                            <div className="text-xs text-muted-foreground">{session.stores.location}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {session.count_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.count_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{session.responsible_person || "—"}</TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/inventory/physical/${session.id}`);
                            }}
                          >
                            Open
                          </Button>
                          {session.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(session.id);
                              }}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhysicalInventoryDashboard;
