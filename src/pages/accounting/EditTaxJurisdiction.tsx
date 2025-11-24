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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  // FIX for TS2352: Supabase may return single-row joins as an array of one item,
  // or null if the foreign key is null. Defining it as an array (or null) resolves the conflict.
  tax_rates: TaxRate[] | null;
}

// --- Schema Definition ---
const JurisdictionSchema = z.object({
  name: z.string().min(2, "Jurisdiction name must be at least 2 characters."),
  jurisdiction_type: z.enum(["State", "Province", "City", "County", "District", "Other"], {
    errorMap: () => ({ message: "Please select a valid jurisdiction type." }),
  }),
  country_code: z.string().length(2, "Country code must be 2 characters (ISO 3166-1 alpha-2)."),
  tax_rate_id: z.string().uuid("Please select a valid tax rate."),
  is_active: z.boolean(),
});

type JurisdictionFormValues = z.infer<typeof JurisdictionSchema>;

// --- Fetch Functions ---

// 1. Fetch Tax Rates for the dropdown (Includes filter for empty IDs)
const fetchTaxRates = async (): Promise<TaxRate[]> => {
  const { data, error } = await supabase
    .from("tax_rates")
    .select("id, name, rate_percentage")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  // Filter out any rate with a null or empty ID to prevent Radix UI error
  return (data as TaxRate[]).filter((rate) => rate.id && rate.id.length > 0);
};

// 2. Fetch the specific Jurisdiction detail
const fetchJurisdictionDetail = async (id: string): Promise<TaxJurisdictionDetail> => {
  const { data, error } = await supabase
    .from("tax_jurisdictions")
    .select(
      `
      id,
      name,
      jurisdiction_type,
      country_code,
      tax_rate_id,
      is_active,
      tax_rates ( id, name, rate_percentage )
    `,
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as TaxJurisdictionDetail;
};

const EditTaxJurisdiction = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rates
  const { data: taxRates, isLoading: isLoadingRates } = useQuery<TaxRate[]>({
    queryKey: ["taxRatesList"],
    queryFn: fetchTaxRates,
  });

  // Fetch jurisdiction data
  const { data: jurisdictionData, isLoading: isLoadingJurisdiction } = useQuery<TaxJurisdictionDetail>({
    queryKey: ["taxJurisdiction", id],
    queryFn: () => fetchJurisdictionDetail(id!),
    enabled: !!id,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<JurisdictionFormValues>({
    resolver: zodResolver(JurisdictionSchema),
  });

  // Populate form fields once data is loaded
  useEffect(() => {
    if (jurisdictionData) {
      reset({
        name: jurisdictionData.name,
        jurisdiction_type: jurisdictionData.jurisdiction_type as JurisdictionFormValues["jurisdiction_type"],
        country_code: jurisdictionData.country_code,
        tax_rate_id: jurisdictionData.tax_rate_id,
        is_active: jurisdictionData.is_active,
      });
    }
  }, [jurisdictionData, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: JurisdictionFormValues) => {
      const { error } = await supabase.from("tax_jurisdictions").update(data).eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Tax jurisdiction updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["taxJurisdictions"] });
      queryClient.invalidateQueries({ queryKey: ["taxJurisdiction", id] });
      navigate("/accounting/tax/jurisdictions");
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update jurisdiction: ${error.message}`, variant: "destructive" });
    },
  });

  const onSubmit = (data: JurisdictionFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoadingRates || isLoadingJurisdiction || !jurisdictionData) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax/jurisdictions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Tax Jurisdiction: {jurisdictionData.name}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Jurisdiction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" placeholder="e.g., California State Tax" {...field} />}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Jurisdiction Type */}
              <div className="space-y-2">
                <Label htmlFor="jurisdiction_type">Type</Label>
                <Controller
                  name="jurisdiction_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="jurisdiction_type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="State">State</SelectItem>
                        <SelectItem value="Province">Province</SelectItem>
                        <SelectItem value="City">City</SelectItem>
                        <SelectItem value="County">County</SelectItem>
                        <SelectItem value="District">District</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.jurisdiction_type && (
                  <p className="text-sm text-destructive">{errors.jurisdiction_type.message}</p>
                )}
              </div>

              {/* Country Code */}
              <div className="space-y-2">
                <Label htmlFor="country_code">Country Code (ISO 2)</Label>
                <Controller
                  name="country_code"
                  control={control}
                  render={({ field }) => <Input id="country_code" placeholder="e.g., US, CA, PS" {...field} />}
                />
                {errors.country_code && <p className="text-sm text-destructive">{errors.country_code.message}</p>}
              </div>
            </div>

            {/* Tax Rate ID */}
            <div className="space-y-2">
              <Label htmlFor="tax_rate_id">Applicable Tax Rate</Label>
              <Controller
                name="tax_rate_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="tax_rate_id">
                      <SelectValue placeholder="Select the tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Map over tax rates for the dropdown */}
                      {taxRates?.map((rate: TaxRate) => {
                        // Crucial check to prevent the Radix UI Select error
                        if (!rate.id || rate.id === "") return null;
                        return (
                          <SelectItem key={rate.id} value={rate.id}>
                            {rate.name} ({(rate.rate_percentage * 100).toFixed(2)}%)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tax_rate_id && <p className="text-sm text-destructive">{errors.tax_rate_id.message}</p>}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              {/* Is Active Checkbox */}
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Checkbox id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label
                htmlFor="is_active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Updating..." : "Update Jurisdiction"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTaxJurisdiction;
