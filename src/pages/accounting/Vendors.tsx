import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Edit, Trash2, Search, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// --- Interface Definition ---
interface Vendor {
  id: string;
  name: string;
  vendor_code: string;
  status: 'Active' | 'Inactive';
  contact_person: string;
  email: string;
  phone: string;
  currency_code: string;
  payment_terms: string;
}

const Vendors = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Data Fetching
  const {
    data: vendors,
    isLoading,
    error,
  } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching vendors:", error);
        throw error;
      }
      return data as Vendor[];
    },
  });

  // 2. Delete Handler (Similar to BankAccounts.tsx)
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the vendor "${name}"? Deleting a vendor will not delete associated bills.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("vendors").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Vendor Deleted",
        description: `${name} has been deleted successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      toast({
        title: "Error deleting vendor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 3. Filtering Logic
  const filteredVendors = vendors?.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.vendor_code && vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 4. Error State Rendering
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error loading vendors: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 5. Main Component Rendering
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Manage your suppliers and track Accounts Payable.</p>
        </div>
        <Button onClick={() => navigate("/accounting/vendors/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor List ({filteredVendors?.length || 0})</CardTitle>
          <CardDescription>Suppliers for your retail shops.</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading vendors...</p>
            </div>
          ) : filteredVendors?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No vendors found matching your search." : "No vendors configured yet."}
              </p>
              {!searchTerm && (
                <Button variant="outline" className="mt-4" onClick={() => navigate("/accounting/vendors/new")}>
                  Add Your First Vendor
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors?.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.vendor_code || "N/A"}</TableCell>
                    <TableCell>{vendor.contact_person || "N/A"}</TableCell>
                    <TableCell>{vendor.payment_terms || "N/A"}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">{vendor.currency_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.status === 'Active' ? "default" : "secondary"}>
                        {vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(vendor.id, vendor.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
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
