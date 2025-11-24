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

// --- Interface Definitions ---
interface TaxRate {
  id: string;
  name: string;
  rate_percentage: number;
}
interface SettingsRow {
  id: number;
  determination_policy: "Origin" | "Destination";
  default_tax_rate_id: string | null;
  tax_number_label: string | null;
}

// --- Schema Definition for Validation ---
const TaxSettingsSchema = z.object({
  determination_policy: z.enum(["Origin", "Destination"]),
  // Allows the Select value to be either a valid UUID or the empty string ("")
  default_tax_rate_id: z.union([z.string().uuid("Please select a valid default tax rate."), z.literal("")]),
  tax_number_label: z.string().max(50, "Label cannot exceed 50 characters.").nullable().optional(),
});

type TaxSettingsFormValues = z.infer<typeof TaxSettingsSchema>;

// --- Fetch Functions ---

// 1. Fetch Tax Rates for the dropdown (includes filter)
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

// 2. Fetch current Tax Settings
const fetchTaxSettings = async (): Promise<SettingsRow> => {
  const { data, error } = await supabase.from("tax_settings").select("*").limit(1).single();
  // If no settings exist (first time), return a default structure
  if (error && error.code === "PGRST116")
    return { id: 1, determination_policy: "Destination", default_tax_rate_id: null, tax_number_label: "Tax ID" };
  if (error) throw new Error(error.message);
  return data as SettingsRow;
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
    formState: { isSubmitting, errors },
  } = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(TaxSettingsSchema),
    defaultValues: {
      determination_policy: "Destination",
      // Initialize as empty string ("") to match the placeholder/default
      default_tax_rate_id: "",
      tax_number_label: "Tax ID",
    },
  });

  // Reset form with fetched data
  useEffect(() => {
    if (settingsData) {
      reset({
        determination_policy: settingsData.determination_policy || "Destination",
        // Convert null from DB to "" for the Select component to show placeholder
        default_tax_rate_id: settingsData.default_tax_rate_id || "",
        tax_number_label: settingsData.tax_number_label || "Tax ID",
      });
    }
  }, [settingsData, reset]);

  // Mutation to update settings (upsert is used for the single-row table)
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: TaxSettingsFormValues) => {
      // Enforce the single-row nature of tax_settings by always setting id to 1 (or current ID)
      const payload = {
        id: settingsData?.id || 1, // Use existing ID or default to 1
        determination_policy: data.determination_policy,
        // Convert empty string ("") from Select component back to null for DB storage
        default_tax_rate_id: data.default_tax_rate_id === "" ? null : data.default_tax_rate_id,
        tax_number_label: data.tax_number_label || null,
      };
      const { error } = await supabase.from("tax_settings").upsert(payload, { onConflict: "id" });
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
                **Crucial ERP Policy:** Determines whether the customer's address or your business's address dictates
                the tax rule.
              </p>
            </div>

            {/* Default Tax Rate ID */}
            <div className="space-y-2">
              <Label htmlFor="default_tax_rate_id">Fallback/Default Tax Rate (Optional)</Label>
              <Controller
                name="default_tax_rate_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    // Use the field value, defaulting to "" if null/undefined
                    value={field.value || ""}
                  >
                    <SelectTrigger id="default_tax_rate_id">
                      <SelectValue placeholder="No default rate selected (Uses 0% if nothing is matched)" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* This is the ONLY SelectItem allowed to have value="" */}
                      <SelectItem value="">-- No Fallback Rate --</SelectItem>
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
              {errors.default_tax_rate_id && (
                <p className="text-sm text-destructive">{errors.default_tax_rate_id.message}</p>
              )}
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
          <Button type="submit" disabled={isSubmitting || updateSettingsMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting || updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaxSettings;
