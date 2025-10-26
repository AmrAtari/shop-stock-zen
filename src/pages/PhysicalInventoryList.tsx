import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InventorySession {
  id: string;
  session_number: string;
  store_name: string;
  status: "Draft" | "Counting" | "Completed";
  created_at: string;
  responsible_person: string;
  stores?: { name: string }[]; // ✅ handle array structure
}

export default function PhysicalInventoryList() {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fetchInventorySessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("physical_inventory_sessions")
        .select(
          `
          id,
          session_number,
          status,
          created_at,
          responsible_person,
          stores ( name )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData =
        data?.map((session: any) => ({
          id: session.id,
          session_number: session.session_number,
          store_name: Array.isArray(session.stores) ? session.stores[0]?.name || "N/A" : session.stores?.name || "N/A", // ✅ Fix
          status: session.status,
          created_at: session.created_at,
          responsible_person: session.responsible_person,
        })) || [];

      setSessions(formattedData);
    } catch (error) {
      console.error("Error fetching inventory sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventorySessions();
  }, []);

  const filteredSessions = sessions.filter(
    (s) =>
      s.session_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.store_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Physical Inventory Sessions</h1>
        <Button onClick={() => navigate("/physical-inventory/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Session
        </Button>
      </div>

      <div className="flex items-center mb-4">
        <Search className="mr-2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search by session number or store name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin mr-2 h-5 w-5" />
          Loading sessions...
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/physical-inventory/${session.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Session #{session.session_number}</h2>
                    <p className="text-sm text-gray-500">Store: {session.store_name}</p>
                    <p className="text-sm text-gray-500">Responsible: {session.responsible_person}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        session.status === "Completed"
                          ? "text-green-600"
                          : session.status === "Counting"
                            ? "text-blue-600"
                            : "text-gray-600"
                      }`}
                    >
                      {session.status}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(session.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-gray-500 text-center py-10">No sessions found.</p>
          )}
        </div>
      )}
    </div>
  );
}
