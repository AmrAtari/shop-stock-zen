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

// --- Schema Definition (using Zod for validation) ---
const JurisdictionSchema = z.object({
  name: z.string().min(2, "Jurisdiction name must be at least 2 characters."),
  jurisdiction_type: z.enum(["State", "Province", "City", "County", "District", "Other"], {
    errorMap: () => ({ message: "Please select a valid jurisdiction type." }),
  }),
  country_code: z.string().length(2, "Country code must be 2 characters (ISO 3166-1 alpha-2)."),
  tax_rate_id: z.string().uuid("Please select a valid tax rate."),
  is_active: z.boolean().default(true),
});

type JurisdictionFormValues = z.infer<typeof JurisdictionSchema>;

// --- Fetch Functions ---
const fetchTaxRates = async (): Promise<TaxRate[]> => {
  const { data, error } = await supabase
    .from("tax_rates")
    .select("id, name, rate_percentage")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  // FIX (Data Layer): Filter out rates where ID is null, undefined, or an empty string ("")
  return (data as TaxRate[]).filter((rate) => rate.id && rate.id.length > 0);
};

const NewTaxJurisdiction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available tax rates for the dropdown
  const { data: taxRates, isLoading: isLoadingRates } = useQuery<TaxRate[]>({
    queryKey: ["taxRatesList"],
    queryFn: fetchTaxRates,
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<JurisdictionFormValues>({
    resolver: zodResolver(JurisdictionSchema),
    defaultValues: {
      name: "",
      jurisdiction_type: "State",
      country_code: "",
      tax_rate_id: "",
      is_active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: JurisdictionFormValues) => {
      const { error } = await supabase.from("tax_jurisdictions").insert([data]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Tax jurisdiction created successfully." });
      queryClient.invalidateQueries({ queryKey: ["taxJurisdictions"] });
      navigate("/accounting/tax/jurisdictions");
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create jurisdiction: ${error.message}`, variant: "destructive" });
    },
  });

  const onSubmit = (data: JurisdictionFormValues) => {
    createMutation.mutate(data);
  };

  if (isLoadingRates) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax/jurisdictions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">New Tax Jurisdiction</h1>
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
                        // FIX (Render Layer): Final safeguard to ensure the ID is a non-empty string
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
