import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";

// --- Schema Definition for Validation ---
const TaxSettingsSchema = z.object({
  determination_policy: z.enum(["Origin", "Destination"]),
  default_tax_rate_id: z.string().uuid("Please select a valid default tax rate.").nullable().optional(),
  tax_number_label: z.string().max(50, "Label cannot exceed 50 characters.").optional(),
});

type TaxSettingsFormValues = z.infer<typeof TaxSettingsSchema>;

// --- Fetch Functions ---

// 1. Fetch Tax Rates for the dropdown
const fetchTaxRates = async () => {
  const { data, error } = await supabase.from("tax_rates").select("id, name, rate_percentage").eq("is_active", true);
  if (error) throw new Error(error.message);
  return data;
};

// 2. Fetch current Tax Settings
const fetchTaxSettings = async () => {
  const { data, error } = await supabase.from("tax_settings").select("*").limit(1).single();
  // If no settings exist (first time), return a default structure
  if (error && error.code === 'PGRST116') return { id: 1, determination_policy: 'Destination', tax_number_label: 'Tax ID' };
  if (error) throw new Error(error.message);
  return data;
};


const TaxSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load available tax rates
  const { data: taxRates, isLoading: isLoadingRates } = useQuery({
    queryKey: ["taxRatesList"],
    queryFn: fetchTaxRates,
  });

  // Load current settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["taxSettings"],
    queryFn: fetchTaxSettings,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(TaxSettingsSchema),
    defaultValues: {
        determination_policy: 'Destination', // Default until data loads
        default_tax_rate_id: undefined,
        tax_number_label: 'Tax ID'
    },
  });

  // Reset form with fetched data
  useEffect(() => {
    if (settingsData) {
      reset({
        determination_policy: settingsData.determination_policy || 'Destination',
        default_tax_rate_id: settingsData.default_tax_rate_id,
        tax_number_label: settingsData.tax_number_label || 'Tax ID'
      });
    }
  }, [settingsData, reset]);


  // Mutation to update settings (upsert is used for the single-row table)
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: TaxSettingsFormValues) => {
        // Enforce the single-row nature of tax_settings by always setting id to 1
        const payload = {
            id: 1,
            ...data,
            default_tax_rate_id: data.default_tax_rate_id || null, // Ensure empty string becomes null
        };
        const { error } = await supabase.from("tax_settings").upsert(payload);
        if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tax settings updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["taxSettings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaxSettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoadingRates || isLoadingSettings) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Settings className="w-8 h-8 mr-3 text-primary" />
          Global Tax Settings
        </h1>
        <Button variant="outline" onClick={() => navigate("/accounting/tax")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tax Management
        </Button>
      </div>
      <p className="text-lg text-muted-foreground">
        Define the overall tax policy and fallback rules for your ERP system.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax Determination Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tax Determination Policy */}
            <div className="space-y-2">
              <Label htmlFor="determination_policy">Tax Calculation Basis</Label>
              <Controller
                name="determination_policy"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="determination_policy">
                      <SelectValue placeholder="Select a policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Destination">
                        Destination-Based (Most common for retail/e-commerce: Tax is based on the customer's location)
                      </SelectItem>
                      <SelectItem value="Origin">
                        Origin-Based (Tax is based on your shop/warehouse location)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground">
                **Crucial ERP Policy:** Determines whether the customer's address or your business's address dictates the tax rule.
              </p>
            </div>

            {/* Default Tax Rate ID */}
            <div className="space-y-2">
              <Label htmlFor="default_tax_rate_id">Fallback/Default Tax Rate (Optional)</Label>
              <Controller
                name="default_tax_rate_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""} >
                    <SelectTrigger id="default_tax_rate_id">
                      <SelectValue placeholder="No default rate selected (Use 0% if nothing is matched)" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Empty option for optional setting */}
                      <SelectItem value="">-- No Fallback Rate --</SelectItem> 
                      {taxRates?.map((rate: any) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} ({(rate.rate_percentage * 100).toFixed(2)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground">
                This rate is used if no specific jurisdiction rule is matched (e.g., an international sale).
              </p>
            </div>

            {/* Tax Number Label */}
            <div className="space-y-2">
              <Label htmlFor="tax_number_label">Tax Identification Number Label</Label>
              <Controller
                name="tax_number_label"
                control={control}
                render={({ field }) => (
                  <Input 
                    id="tax_number_label" 
                    placeholder="e.g., VAT ID, GST No., Tax ID" 
                    value={field.value || ""} 
                    onChange={field.onChange} 
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">
                The name used for the legal tax identification number on invoices (e.g., VAT ID for European customers).
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaxSettings;
