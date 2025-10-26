import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/hooks/queryKeys";

interface InventorySession {
  id: string;
  session_number: string;
  store_name: string;
  status: "Draft" | "Counting" | "Completed";
  created_at: string;
  responsible_person: string;
}

const fetchInventorySessions = async (): Promise<InventorySession[]> => {
  const { data, error } = await supabase
    .from("physical_inventory_sessions")
    .select("id, session_number, status, created_at, responsible_person, stores(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((session: any) => ({
    id: session.id,
    session_number: session.session_number,
    status: session.status,
    created_at: new Date(session.created_at).toLocaleDateString(),
    responsible_person: session.responsible_person,
    store_name: session.stores?.name || "N/A",
  }));
};

const useInventorySessionsQuery = () => {
  return useQuery<InventorySession[]>({
    queryKey: queryKeys.physicalInventory.all,
    queryFn: fetchInventorySessions,
  });
};

const PhysicalInventoryList: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessions, isLoading, error } = useInventorySessionsQuery();

  const getStatusVariant = (status: InventorySession["status"]) => {
    switch (status) {
      case "Draft":
        return "secondary";
      case "Counting":
        return "default";
      case "Completed":
        return "outline";
      default:
        return "outline";
    }
  };

  if (isLoading) return <div className="p-8">Loading physical inventory sessions...</div>;
  if (error) return <div className="p-8 text-red-500">Error loading sessions.</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" /> Physical Inventory Sessions
        </h1>
        <Button onClick={() => navigate("/inventory/physical/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Count Session
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Session #</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsible Person</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  No inventory sessions found.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/inventory/physical/${session.id}`)}
                >
                  <TableCell className="font-mono text-sm">{session.session_number}</TableCell>
                  <TableCell>{session.store_name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(session.status)}>{session.status}</Badge>
                  </TableCell>
                  <TableCell>{session.responsible_person}</TableCell>
                  <TableCell>{session.created_at}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/inventory/physical/${session.id}`);
                      }}
                    >
                      <Clock className="w-4 h-4 mr-1" /> Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PhysicalInventoryList;
