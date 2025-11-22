import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";

// --- Schema Definition (using Zod for validation) ---
const TaxRateSchema = z.object({
  name: z.string().min(2, "Tax name must be at least 2 characters."),
  rate_percentage: z.number().min(0, "Rate cannot be negative.").max(100, "Rate cannot exceed 100%."),
  tax_type: z.enum(["Sales", "Purchase", "VAT", "GST", "Withholding", "Other"], {
    errorMap: () => ({ message: "Please select a valid tax type." }),
  }),
  country_code: z.string().length(2, "Country code must be 2 characters (ISO 3166-1).").toUpperCase(),
  is_active: z.boolean().default(true),
  is_compound: z.boolean().default(false),
  description: z.string().optional(),
});

type TaxRateFormValues = z.infer<typeof TaxRateSchema>;

const EditTaxRate = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Data Fetching
  const {
    data: taxRate,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tax-rate", id],
    queryFn: async () => {
      if (!id) throw new Error("Tax rate ID is missing.");
      
      const { data, error } = await supabase
        .from("tax_rates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Convert the decimal rate (0.0 - 1.0) from the database back to a percentage (0-100) for the form
      return {
        ...data,
        rate_percentage: data.rate_percentage * 100, 
      };
    },
    enabled: !!id, // Only run the query if the ID exists
  });

  // 2. Form Setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaxRateFormValues>({
    resolver: zodResolver(TaxRateSchema),
    // We will set default values using useEffect after data loads
  });

  // Load fetched data into the form once it's available
  useEffect(() => {
    if (taxRate) {
      reset(taxRate);
    }
  }, [taxRate, reset]);


  // 3. Submission Handler (Update Logic)
  const onSubmit = async (values: TaxRateFormValues) => {
    if (!id) return;
    
    try {
      // Supabase stores the rate as a decimal (0.00 - 1.00), so we must convert the percentage input (0-100)
      const rateAsDecimal = values.rate_percentage / 100;
      
      const { error } = await supabase
        .from("tax_rates")
        .update({
          ...values,
          rate_percentage: rateAsDecimal, // Use the converted decimal rate
          // Note: created_at and id should not be updated
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Tax Rate Updated",
        description: `Tax rate "${values.name}" has been successfully updated.`,
      });

      // Invalidate the list and detail query cache to show the updated rate immediately
      queryClient.invalidateQueries({ queryKey: ["tax-rates"] });
      queryClient.invalidateQueries({ queryKey: ["tax-rate", id] });
      
      // Navigate back to the main tax list
      navigate("/accounting/tax"); 
    } catch (error: any) {
      console.error("Error updating tax rate:", error);
      toast({
        title: "Error Updating Tax Rate",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };


  // 4. Loading and Error States
  if (isLoading) {
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

  if (error || !taxRate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Error Loading Tax Rate</h1>
            <p className="text-muted-foreground">{error?.message || "The requested tax rate could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }

  // 5. Main Component Rendering
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/tax")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Tax Rate: {taxRate.name}</h1>
          <p className="text-muted-foreground">Modify the configuration for this existing tax rate.</p>
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
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., Standard VAT, State Sales Tax (CA)"
                />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                <Input
                  id="country_code"
                  maxLength={2}
                  {...register("country_code")}
                  placeholder="e.g., US, DE, CA"
                />
                {errors.country_code && <p className="text-sm text-destructive">{errors.country_code.message}</p>}
              </div>
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
              {/* Is Active */}
              <div className="flex items-center space-x-2">
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

              {/* Is Compound */}
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_compound"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="is_compound"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_compound" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
            <Edit className="w-4 h-4 mr-2" />
            {isSubmitting ? "Updating..." : "Update Tax Rate"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTaxRate;
