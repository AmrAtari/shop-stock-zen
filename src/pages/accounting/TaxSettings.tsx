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
  id: string;
  determination_policy: "Origin" | "Destination";
  default_tax_rate_id: string | null;
  tax_number_label: string | null;
}

// --- Schema Definition for Validation ---
const TaxSettingsSchema = z.object({
  determination_policy: z.enum(["Origin", "Destination"]),
  // Ensure the schema accepts either a UUID or the empty string for the placeholder option
  default_tax_rate_id: z.union([z.string().uuid("Please select a valid default tax rate."), z.literal("")]),
  tax_number_label: z.string().max(50, "Label cannot exceed 50 characters.").nullable().optional(),
});

type TaxSettingsFormValues = z.infer<typeof TaxSettingsSchema>;

// --- Fetch Functions ---

// 1. Fetch Tax Rates for the dropdown
const fetchTaxRates = async (): Promise<TaxRate[]> => {
  const { data, error } = await supabase
    .from("tax_rates")
    .select("id, name, rate_percentage")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  // Filter out rates where ID is null, undefined, or an empty string ("")
  return data.filter((rate) => rate.id && rate.id.length > 0) as TaxRate[];
};

// 2. Fetch the Single Tax Settings Row
const fetchTaxSettings = async (): Promise<SettingsRow> => {
  const { data, error } = await supabase.from("tax_settings").select("*").limit(1).single();

  if (error && error.code === "PGRST116") {
    return {
      id: "placeholder",
      determination_policy: "Destination",
      default_tax_rate_id: null,
      tax_number_label: "VAT ID",
    };
  }
  if (error) throw error;

  return data as SettingsRow;
};

const TaxSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rates for the dropdown
  const { data: taxRates, isLoading: isLoadingRates } = useQuery<TaxRate[]>({
    queryKey: ["taxRatesList"],
    queryFn: fetchTaxRates,
  });

  // Fetch current settings
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery<SettingsRow>({
    queryKey: ["taxSettings"],
    queryFn: fetchTaxSettings,
  });

  // Form setup
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(TaxSettingsSchema),
    // Initialize default_tax_rate_id to "" to match the placeholder item value
    defaultValues: {
      determination_policy: "Destination",
      default_tax_rate_id: "",
      tax_number_label: "VAT ID",
    },
  });

  // Reset form once settings are loaded
  useEffect(() => {
    if (currentSettings && !isLoadingSettings) {
      reset({
        determination_policy: currentSettings.determination_policy || "Destination",
        // Convert null from DB to "" for the Select component to show placeholder
        default_tax_rate_id: currentSettings.default_tax_rate_id || "",
        tax_number_label: currentSettings.tax_number_label || "VAT ID",
      });
    }
  }, [currentSettings, isLoadingSettings, reset]);

  // Mutation for saving settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: TaxSettingsFormValues) => {
      const payload = {
        determination_policy: data.determination_policy,
        // Convert empty string from Select component back to null for DB
        default_tax_rate_id: data.default_tax_rate_id === "" ? null : data.default_tax_rate_id,
        tax_number_label: data.tax_number_label || null,
      };

      let result;
      if (currentSettings?.id && currentSettings.id !== "placeholder") {
        // Update existing row
        result = await supabase.from("tax_settings").update(payload).eq("id", currentSettings.id);
      } else {
        // Insert new row
        result = await supabase.from("tax_settings").insert(payload);
      }

      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Tax settings saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["taxSettings"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to save settings: ${error.message}`, variant: "destructive" });
    },
  });

  const onSubmit = (data: TaxSettingsFormValues) => {
    saveSettingsMutation.mutate(data);
  };

  // State for loading/skeleton
  if (isLoadingRates || isLoadingSettings || !currentSettings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-32 ml-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tax Global Settings</h1>
            <p className="text-muted-foreground">Configure global policies that affect all tax calculations.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tax Policy Card */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Determination Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Determination Policy */}
            <div className="space-y-2">
              <Label htmlFor="determination_policy">Policy Type</Label>
              <Controller
                name="determination_policy"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="determination_policy">
                      <SelectValue placeholder="Select tax policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Origin">Origin-Based (Seller's Location)</SelectItem>
                      <SelectItem value="Destination">Destination-Based (Customer's Location)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground">
                Determines whether tax is calculated based on the seller's location (Origin) or the customer's location
                (Destination).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Rate & Labels Card */}
        <Card>
          <CardHeader>
            <CardTitle>Default Rates and Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="default_tax_rate_id">Global Default Tax Rate</Label>
              <Controller
                name="default_tax_rate_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    // Ensures the Select value is either a UUID string or ""
                    value={field.value || ""}
                  >
                    <SelectTrigger id="default_tax_rate_id">
                      <SelectValue placeholder="Select a default rate (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Placeholder option for no default rate. Must have an empty string value. */}
                      <SelectItem value="">No Default Rate</SelectItem>
                      {/* Iterate over fetched rates */}
                      {taxRates?.map((rate) => {
                        // FINAL FIX: Add a component-level guard to ensure rate.id is never "" at render time
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
                This rate is used if no specific jurisdiction rule is matched (e.g., an international sale) or if
                jurisdictions are disabled.
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
          <Button type="submit" disabled={isSubmitting || saveSettingsMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaxSettings;
