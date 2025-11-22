import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Edit, Search, Factory } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext"; // ✅ Imported
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Vendor {
  id: string;
  name: string;
  vendor_code: string | null;
  currency_code: string;
  payment_terms: string;
  status: "Active" | "Inactive";
}

const Vendors = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings(); // ✅ Used
  const currency = settings?.currency || "USD"; // Used for context
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: vendors,
    isLoading,
    error,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      let query = supabase.from("suppliers").select(`*`);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,vendor_code.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("name", { ascending: true });

      if (error) {
        throw error;
      }
      return data as Vendor[];
    },
  });

  const filteredVendors = vendors || [];

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return <div className="text-destructive">Error loading vendors: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Factory className="w-6 h-6" /> Vendors
        </h1>
        <Button onClick={() => navigate("/accounting/vendors/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
          <CardDescription>Manage all suppliers who provide goods or services to your company.</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by vendor name or code..."
                className="pl-9 max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vendors found. Start by creating a new one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.vendor_code || "N/A"}</TableCell>
                    <TableCell>{vendor.currency_code}</TableCell>
                    <TableCell>{vendor.payment_terms}</TableCell>
                    <TableCell>
                      <Badge variant={vendor.status === "Active" ? "default" : "secondary"}>{vendor.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/accounting/vendors/${vendor.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/accounting/vendors/${vendor.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendors;
