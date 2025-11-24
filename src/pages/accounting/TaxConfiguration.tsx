import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Define the structure for a Tax Rate object
interface TaxRate {
  id: string;
  name: string;
  rate_percentage: number; // Stored as a decimal, e.g., 0.15 for 15%
  is_active: boolean;
  tax_type: string; // e.g., Sales, Purchase, Withholding
  country_code: string;
  created_at: string;
}

const TaxConfiguration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Data Fetching using React Query
  const {
    data: taxRates,
    isLoading,
    error,
  } = useQuery<TaxRate[]>({
    queryKey: ["tax-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tax_rates").select("*").order("name", { ascending: true });

      if (error) {
        console.error("Error fetching tax rates:", error);
        throw error;
      }
      return data as TaxRate[];
    },
  });

  // 2. Delete Handler
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tax rate "${name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("tax_rates").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Tax Rate Deleted",
        description: `${name} has been deleted successfully.`,
      });

      // Invalidate the query cache to refetch the list
      queryClient.invalidateQueries({ queryKey: ["tax-rates"] });
    } catch (error: any) {
      console.error("Error deleting tax rate:", error);
      toast({
        title: "Error deleting tax rate",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 3. Filtering Logic
  const filteredTaxRates = taxRates?.filter(
    (rate) =>
      rate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.country_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.tax_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 4. Error State Rendering
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tax Rates Configuration</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error loading tax rates: {error.message}</p>
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
          {/* Button to navigate back to the main tax page (Added for good UX) */}
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tax Rates Configuration</h1>
            <p className="text-muted-foreground">Configure and manage tax rates for your ERP.</p>
          </div>
        </div>
        {/* === FIXED LINK: Added /rates/ === */}
        <Button onClick={() => navigate("/accounting/tax/rates/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Tax Rate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Rates ({filteredTaxRates?.length || 0})</CardTitle>
          <CardDescription>All active and inactive tax configurations</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by tax name, type, or country code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading tax configurations...</p>
            </div>
          ) : filteredTaxRates?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No tax rates found matching your search." : "No tax rates configured yet."}
              </p>
              {/* === FIXED LINK: Added /rates/ === */}
              {!searchTerm && (
                <Button variant="outline" className="mt-4" onClick={() => navigate("/accounting/tax/rates/new")}>
                  Configure Your First Tax Rate
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaxRates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.name}</TableCell>
                    <TableCell className="font-semibold text-lg">
                      {/* Convert decimal (e.g., 0.15) to percentage (15.00%) */}
                      {(rate.rate_percentage * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {rate.tax_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{rate.country_code}</TableCell>
                    <TableCell>
                      <Badge variant={rate.is_active ? "default" : "secondary"}>
                        {rate.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          // === FIXED LINK: Added /rates/ ===
                          onClick={() => navigate(`/accounting/tax/rates/${rate.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rate.id, rate.name)}
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

export default TaxConfiguration;
