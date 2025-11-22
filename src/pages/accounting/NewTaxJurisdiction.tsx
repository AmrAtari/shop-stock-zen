import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
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

const NewTaxJurisdiction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- 1. Fetching Tax Rates (to populate the selector) ---
  const { data: taxRates, isLoading: isLoadingRates } = useQuery<TaxRate[]>({
    queryKey: ["tax-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_rates")
        .select("id, name, rate_percentage")
        .eq("is_active", true) // Only show active rates for assignment
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching tax rates:", error);
        throw error;
      }
      return data as TaxRate[];
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<JurisdictionFormValues>({
    resolver: zodResolver(JurisdictionSchema),
    defaultValues: {
      name: "",
      jurisdiction_type: "State",
      country_code: "US", 
      tax_rate_id: undefined,
      is_active: true,
    },
  });

  const onSubmit = async (values: JurisdictionFormValues) => {
    try {
      const { error } = await supabase
        .from("tax_jurisdictions")
        .insert(values)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Jurisdiction Created",
        description: `Tax jurisdiction "${values.name}" has been successfully added.`,
      });

      // Invalidate the jurisdiction list query cache
      queryClient.invalidateQueries({ queryKey: ["tax-jurisdictions"] });
      
      // Navigate back to the jurisdiction list
      navigate("/accounting/tax/jurisdictions"); 
    } catch (error: any) {
      console.error("Error creating jurisdiction:", error);
      toast({
        title: "Error Creating Jurisdiction",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };
  
  // Handle Loading State for Tax Rates
  if (isLoadingRates) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-10 w-80" />
              <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
      );
  }

  // Handle Error/No Rates State
  if (!taxRates || taxRates.length === 0) {
      return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Add New Tax Jurisdiction</h1>
            <Card>
                <CardContent className="pt-6 text-center">
                    <p className="text-destructive">
                        Cannot create a jurisdiction. Please create at least one <a href="/accounting/tax" className="underline">Active Tax Rate</a> first.
                    </p>
                    <Button onClick={() => navigate("/accounting/tax/new")} className="mt-4">
                        Create Tax Rate
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax/jurisdictions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Tax Jurisdiction</h1>
          <p className="text-muted-foreground">Define a geographical area and assign a default tax rate.</p>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            {isSubmitting ? "Saving..." : "Save Jurisdiction"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTaxJurisdiction;
