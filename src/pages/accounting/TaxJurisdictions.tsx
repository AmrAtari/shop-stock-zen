import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Define the structure for a Tax Jurisdiction object (including joined rate data)
interface TaxJurisdiction {
  id: string;
  name: string;
  jurisdiction_type: string; // e.g., State, Province, City
  country_code: string;
  is_active: boolean;
  // Joined Tax Rate details
  tax_rates: {
    name: string;
    rate_percentage: number;
  };
}

const TaxJurisdictions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Data Fetching using React Query
  const {
    data: jurisdictions,
    isLoading,
    error,
  } = useQuery<TaxJurisdiction[]>({
    queryKey: ["tax-jurisdictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_jurisdictions")
        .select(
            `
            *,
            tax_rates(name, rate_percentage)
            `
        )
        .order("country_code", { ascending: true })
        .order("name", { ascending: true }); 

      if (error) {
        console.error("Error fetching tax jurisdictions:", error);
        throw error;
      }
      return data as TaxJurisdiction[];
    },
  });

  // 2. Delete Handler (Placeholder logic)
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tax jurisdiction "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("tax_jurisdictions").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Jurisdiction Deleted",
        description: `${name} has been deleted successfully.`,
      });

      // Invalidate the query cache to refetch the list
      queryClient.invalidateQueries({ queryKey: ["tax-jurisdictions"] });
    } catch (error: any) {
      console.error("Error deleting jurisdiction:", error);
      toast({
        title: "Error deleting jurisdiction",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 3. Filtering Logic
  const filteredJurisdictions = jurisdictions?.filter(
    (jurisdiction) =>
      jurisdiction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jurisdiction.country_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jurisdiction.jurisdiction_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 4. Error State Rendering
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tax Jurisdictions</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error loading tax jurisdictions: {error.message}</p>
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
        <div className="flex items-center gap-4">
            {/* Button to navigate back to the main tax page */}
            <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax")}>
                <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Tax Jurisdictions</h1>
                <p className="text-muted-foreground">Define tax applicability based on location (state, province, etc.).</p>
            </div>
        </div>
        <Button onClick={() => navigate("/accounting/tax/jurisdictions/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Jurisdiction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Jurisdictions ({filteredJurisdictions?.length || 0})</CardTitle>
          <CardDescription>Location-based tax configurations</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by jurisdiction name, type, or country code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading tax jurisdictions...</p>
            </div>
          ) : filteredJurisdictions?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No jurisdictions found matching your search." : "No tax jurisdictions configured yet."}
              </p>
              {!searchTerm && (
                <Button variant="outline" className="mt-4" onClick={() => navigate("/accounting/tax/jurisdictions/new")}>
                  Configure Your First Jurisdiction
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jurisdiction Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Assigned Tax Rate</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJurisdictions?.map((jurisdiction) => (
                  <TableRow key={jurisdiction.id}>
                    <TableCell className="font-medium">{jurisdiction.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {jurisdiction.jurisdiction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{jurisdiction.country_code}</TableCell>
                    <TableCell className="font-semibold">
                       {/* Display the joined tax rate name */}
                       {jurisdiction.tax_rates ? jurisdiction.tax_rates.name : <Badge variant="destructive">Unassigned</Badge>}
                    </TableCell>
                    <TableCell className="font-semibold text-lg">
                      {/* Convert decimal (e.g., 0.15) to percentage (15.00%) */}
                      {jurisdiction.tax_rates ? `${(jurisdiction.tax_rates.rate_percentage * 100).toFixed(2)}%` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={jurisdiction.is_active ? "default" : "secondary"}>
                        {jurisdiction.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/accounting/tax/jurisdictions/${jurisdiction.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(jurisdiction.id, jurisdiction.name)}
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

export default TaxJurisdictions;
