import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
interface Account {
  id: string;
  account_name: string;
  account_code: string;
}

// --- Schema Definition (Updated with liability_account_id) ---
const TaxRateSchema = z.object({
  name: z.string().min(2, "Tax name must be at least 2 characters."),
  rate_percentage: z.number().min(0, "Rate cannot be negative.").max(100, "Rate cannot exceed 100%."),
  tax_type: z.enum(["Sales", "Purchase", "VAT", "GST", "Withholding", "Other"], {
    errorMap: () => ({ message: "Please select a valid tax type." }),
  }),
  country_code: z.string().length(2, "Country code must be 2 characters (ISO 3166-1).").toUpperCase(),
  liability_account_id: z.string().uuid("Please select a valid liability account."), // NEW FIELD
  is_active: z.boolean().default(true),
  is_compound: z.boolean().default(false),
  description: z.string().optional(),
});

type TaxRateFormValues = z.infer<typeof TaxRateSchema>;

const NewTaxRate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- 1. Account Data Fetching ---
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_name, account_code")
        .order("account_code", { ascending: true });

      if (error) {
        console.error("Error fetching accounts:", error);
        throw error;
      }
      return data as Account[];
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaxRateFormValues>({
    resolver: zodResolver(TaxRateSchema),
    defaultValues: {
      name: "",
      rate_percentage: 0,
      tax_type: "Sales",
      country_code: "US",
      liability_account_id: undefined, // Must be set to undefined/empty string initially
      is_active: true,
      is_compound: false,
    },
  });

  const onSubmit = async (values: TaxRateFormValues) => {
    try {
      const rateAsDecimal = values.rate_percentage / 100;

      const { error } = await supabase.from("tax_rates").insert({
        ...values,
        rate_percentage: rateAsDecimal,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Tax Rate Created",
        description: `Tax rate "${values.name}" has been successfully added.`,
      });

      queryClient.invalidateQueries({ queryKey: ["tax-rates"] });
      navigate("/accounting/tax");
    } catch (error: any) {
      console.error("Error creating tax rate:", error);
      toast({
        title: "Error Creating Tax Rate",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Optional: Handle case where accounts are still loading or failed to load
  if (isLoadingAccounts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Tax Rate</h1>
          <p className="text-muted-foreground">Define a new tax configuration for your system.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Tax Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g., Standard VAT, State Sales Tax (CA)" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              {/* Rate Percentage */}
              <div className="space-y-2">
                <Label htmlFor="rate_percentage">Rate Percentage (%)</Label>
                <Input
                  id="rate_percentage"
                  type="number"
                  step="0.01"
                  {...register("rate_percentage", { valueAsNumber: true })}
                  placeholder="e.g., 19.00"
                />
                {errors.rate_percentage && <p className="text-sm text-destructive">{errors.rate_percentage.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax Type */}
              <div className="space-y-2">
                <Label htmlFor="tax_type">Tax Type</Label>
                <Controller
                  name="tax_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales">Sales Tax (AR)</SelectItem>
                        <SelectItem value="Purchase">Purchase Tax (AP)</SelectItem>
                        <SelectItem value="VAT">VAT/GST</SelectItem>
                        <SelectItem value="Withholding">Withholding Tax</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tax_type && <p className="text-sm text-destructive">{errors.tax_type.message}</p>}
              </div>

              {/* Country Code */}
              <div className="space-y-2">
                <Label htmlFor="country_code">Country Code (2-letter ISO)</Label>
                <Input id="country_code" maxLength={2} {...register("country_code")} placeholder="e.g., US, DE, CA" />
                {errors.country_code && <p className="text-sm text-destructive">{errors.country_code.message}</p>}
              </div>
            </div>

            {/* Liability Account Selector (NEW FIELD) */}
            <div className="space-y-2">
              <Label htmlFor="liability_account_id">Liability Account (COA)</Label>
              <Controller
                name="liability_account_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingAccounts} // Disable while loading
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={isLoadingAccounts ? "Loading accounts..." : "Select Liability Account"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.liability_account_id && (
                <p className="text-sm text-destructive">{errors.liability_account_id.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Brief description of the tax rate."
              />
            </div>

            <div className="flex items-center space-x-4 pt-2">
              {/* Is Active and Is Compound Checkboxes */}
              <div className="flex items-center space-x-2">
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

              <div className="flex items-center space-x-2">
                <Controller
                  name="is_compound"
                  control={control}
                  render={({ field }) => (
                    <Checkbox id="is_compound" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <Label
                  htmlFor="is_compound"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Compound Tax
                </Label>
                <span className="text-sm text-muted-foreground">(Applies on top of other taxes)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Tax Rate"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewTaxRate;
