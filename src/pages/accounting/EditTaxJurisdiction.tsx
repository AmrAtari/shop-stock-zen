import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";

// --- Interface Definitions ---
interface TaxRate {
  id: string;
  name: string;
  rate_percentage: number;
}

interface TaxJurisdictionDetail {
  id: string;
  name: string;
  jurisdiction_type: string;
  country_code: string;
  tax_rate_id: string;
  is_active: boolean;
  tax_rates: TaxRate; // To display rate details
}

// --- Schema Definition (using Zod for validation) ---
const JurisdictionSchema = z.object({
  name: z.string().min(2, "Jurisdiction name must be at least 2 characters."),
  jurisdiction_type: z.enum(["State", "Province", "City", "County", "District", "Other"], {
    errorMap: () => ({ message: "Please select a valid jurisdiction type." }),
  }),
  country_code: z.string().length(2, "Country code must be 2 characters (ISO 3166-1).").toUpperCase(),
  tax_rate_id: z.string().uuid("Please select a valid tax rate to apply."), // Foreign Key
  is_active: z.boolean().default(true),
});

type JurisdictionFormValues = z.infer<typeof JurisdictionSchema>;

const EditTaxJurisdiction = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- 1. Fetching Tax Rates (for the dropdown) ---
  const { data: taxRates, isLoading: isLoadingRates } = useQuery<TaxRate[]>({
    queryKey: ["tax-rates-list"], // Different key than the main tax rates query
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_rates")
        .select("id, name, rate_percentage")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as TaxRate[];
    },
  });

  // --- 2. Fetching Existing Jurisdiction Data ---
  const {
    data: jurisdiction,
    isLoading: isLoadingJurisdiction,
    error,
  } = useQuery<TaxJurisdictionDetail>({
    queryKey: ["tax-jurisdiction", id],
    queryFn: async () => {
      if (!id) throw new Error("Jurisdiction ID is missing.");
      
      const { data, error } = await supabase
        .from("tax_jurisdictions")
        .select(
            `
            *,
            tax_rates(name, rate_percentage)
            `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as TaxJurisdictionDetail;
    },
    enabled: !!id,
  });

  // 3. Form Setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JurisdictionFormValues>({
    resolver: zodResolver(JurisdictionSchema),
  });

  // Load fetched data into the form once available
  useEffect(() => {
    if (jurisdiction) {
      reset(jurisdiction);
    }
  }, [jurisdiction, reset]);


  // 4. Submission Handler (Update Logic)
  const onSubmit = async (values: JurisdictionFormValues) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from("tax_jurisdictions")
        .update(values)
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Jurisdiction Updated",
        description: `Tax jurisdiction "${values.name}" has been successfully updated.`,
      });

      // Invalidate the jurisdiction list and detail queries
      queryClient.invalidateQueries({ queryKey: ["tax-jurisdictions"] });
      queryClient.invalidateQueries({ queryKey: ["tax-jurisdiction", id] });
      
      navigate("/accounting/tax/jurisdictions"); 
    } catch (error: any) {
      console.error("Error updating jurisdiction:", error);
      toast({
        title: "Error Updating Jurisdiction",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };


  // 5. Loading and Error States
  if (isLoadingJurisdiction || isLoadingRates) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !jurisdiction) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax/jurisdictions")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Error Loading Jurisdiction</h1>
            <p className="text-muted-foreground">{error?.message || "The requested jurisdiction could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }

  // 6. Main Component Rendering
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax/jurisdictions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Jurisdiction: {jurisdiction.name}</h1>
          <p className="text-muted-foreground">Modify the configuration for this tax jurisdiction.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Jurisdiction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Jurisdiction Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Jurisdiction Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., California, Toronto"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              {/* Country Code */}
              <div className="space-y-2">
                <Label htmlFor="country_code">Country Code (2-letter ISO)</Label>
                <Input
                  id="country_code"
                  maxLength={2}
                  {...register("country_code")}
                  placeholder="e.g., US, CA, DE"
                />
                {errors.country_code && <p className="text-sm text-destructive">{errors.country_code.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Jurisdiction Type */}
              <div className="space-y-2">
                <Label htmlFor="jurisdiction_type">Jurisdiction Type</Label>
                <Controller
                  name="jurisdiction_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="State">State/Province</SelectItem>
                        <SelectItem value="City">City/Municipality</SelectItem>
                        <SelectItem value="County">County/Region</SelectItem>
                        <SelectItem value="District">District</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.jurisdiction_type && <p className="text-sm text-destructive">{errors.jurisdiction_type.message}</p>}
              </div>
              
              {/* Tax Rate Assignment */}
              <div className="space-y-2">
                <Label htmlFor="tax_rate_id">Default Tax Rate</Label>
                <Controller
                    name="tax_rate_id"
                    control={control}
                    render={({ field }) => (
                        <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a Tax Rate" />
                            </SelectTrigger>
                            <SelectContent>
                                {taxRates?.map((rate) => (
                                    <SelectItem key={rate.id} value={rate.id}>
                                        {rate.name} ({(rate.rate_percentage * 100).toFixed(2)}%)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.tax_rate_id && <p className="text-sm text-destructive">{errors.tax_rate_id.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              {/* Is Active Checkbox */}
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="is_active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Active
              </Label>
            </div>
            
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Updating..." : "Update Jurisdiction"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTaxJurisdiction;
