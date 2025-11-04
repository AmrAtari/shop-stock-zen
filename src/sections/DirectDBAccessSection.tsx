import React from "react";
import DatabaseAdminPanel from "@/components/DatabaseAdminPanel";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorOff } from "lucide-react";

export default function DirectDBAccessSection({ isAdmin }) {
  if (!isAdmin) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="py-6 flex items-center">
          <MonitorOff className="w-6 h-6 mr-3 text-red-600" />
          <p className="text-red-700 font-medium">Access Denied: System Admins only</p>
        </CardContent>
      </Card>
    );
  }
  return <DatabaseAdminPanel />;
}

