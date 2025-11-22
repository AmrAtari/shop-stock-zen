import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@/components/ui/skeleton";

// --- Constants (Reused from NewVendor.tsx) ---
const PAYMENT_TERMS_OPTIONS = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 60"];
const CURRENCY_OPTIONS = ["ILS", "USD", "JOD", "EUR"]; 

// --- Interface Definitions ---
interface Address {
    full_address?: string;
}

interface VendorDetail {
  id: string;
  name: string;
  vendor_code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  currency_code: string;
  payment_terms: string;
  status: 'Active' | 'Inactive';
  billing_address: Address | null;
  shipping_address: Address | null;
}

// --- Zod Schema Definition (Reused and Extended for Form Fields) ---
const VendorSchema = z.object({
  name: z.string().min(2, "Vendor name is required."),
  vendor_code: z.string().optional().or(z.literal('')),
  contact_person: z.string().optional().or(z.literal('')),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  tax_id: z.string().optional().or(z.literal('')),
  
  // Financial Defaults
  currency_code: z.string().min(3, "Currency code is required."),
  payment_terms: z.string().min(1, "Payment terms are required."),
  status: z.enum(["Active", "Inactive"]).default('Active'),

  // Address fields (simple text areas for complex JSONB storage)
  billing_address_text: z.string().optional().or(z.literal('')),
  shipping_address_text: z.string().optional().or(z.literal('')),
});

type VendorFormValues = z.infer<typeof VendorSchema>;

const EditVendor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Existing Vendor Data
  const {
    data: vendor,
    isLoading,
    error,
  } = useQuery<VendorDetail>({
    queryKey: ["vendor", id],
    queryFn: async () => {
      if (!id) throw new Error("Vendor ID is missing.");
      
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as VendorDetail;
    },
    enabled: !!id,
  });

  // 2. Form Setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(VendorSchema),
    // No default values here; rely on useEffect to populate
  });

  // 3. Populate form on data load
  useEffect(() => {
    if (vendor) {
      // Convert JSONB address objects back into simple text strings for the form
      const billingText = vendor.billing_address?.full_address || "";
      const shippingText = vendor.shipping_address?.full_address || "";
      
      const resetValues: VendorFormValues = {
        name: vendor.name,
        vendor_code: vendor.vendor_code || '',
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        tax_id: vendor.tax_id || '',
        currency_code: vendor.currency_code,
        payment_terms: vendor.payment_terms,
        status: vendor.status,
        billing_address_text: billingText,
        shipping_address_text: shippingText,
      };
      
      reset(resetValues);
    }
  }, [vendor, reset]);

  const isSameAddress = watch("shipping_address_text") === watch("billing_address_text");

  // 4. Submission Handler (Update Logic)
  const onSubmit = async (values: VendorFormValues) => {
    if (!id) return;

    // Reconstruct the JSONB objects for the addresses
    const billingAddressJson = values.billing_address_text 
      ? { full_address: values.billing_address_text }
      : null;
      
    const shippingAddressJson = values.shipping_address_text 
      ? { full_address: values.shipping_address_text }
      : billingAddressJson; 

    const vendorToUpdate = {
      name: values.name,
      vendor_code: values.vendor_code || null,
      contact_person: values.contact_person || null,
      email: values.email || null,
      phone: values.phone || null,
      tax_id: values.tax_id || null,
      currency_code: values.currency_code,
      payment_terms: values.payment_terms,
      status: values.status,
      billing_address: billingAddressJson,
      shipping_address: shippingAddressJson,
    };
    
    try {
      const { error } = await supabase
        .from("vendors")
        .update(vendorToUpdate)
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Vendor Updated",
        description: `Vendor "${values.name}" has been successfully updated.`,
      });

      // Invalidate the cache for the list and the detail view
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      
      // Navigate back to the detail view (or list)
      navigate(`/accounting/vendors/${id}`); 
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      toast({
        title: "Error Updating Vendor",
        description: error.message || "An unexpected error occurred. Check if the vendor code is unique.",
        variant: "destructive",
      });
    }
  };

  // 5. Loading and Error States
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

  if (error || !vendor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/vendors")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Error Loading Vendor</h1>
            <p className="text-muted-foreground">{error?.message || "The requested vendor could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }


  // 6. Main Component Rendering
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/accounting/vendors/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Vendor: {vendor.name}</h1>
          <p className="text-muted-foreground">Modify details for this supplier.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Core Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Core Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendor Name (Required) */}
              <div className="space-y-2">
                <Label htmlFor="name">Vendor Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., Hebron Glass Supplier"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              {/* Vendor Code (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="vendor_code">Vendor Code (Optional)</Label>
                <Input
                  id="vendor_code"
                  {...register("vendor_code")}
                  placeholder="e.g., VG001"
                />
                {errors.vendor_code && <p className="text-sm text-destructive">{errors.vendor_code.message}</p>}
              </div>
              
              {/* Contact Person */}
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  {...register("contact_person")}
                  placeholder="e.g., Ahmad Omar"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="+970 59-xxxxxxx"
                />
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  {...register("email")}
                  placeholder="accounts@supplier.com"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Financial and Address Card */}
        <Card>
          <CardHeader>
            <CardTitle>Financial & Default Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Currency Code */}
                <div className="space-y-2">
                    <Label htmlFor="currency_code">Default Currency</Label>
                    <Controller
                        name="currency_code"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCY_OPTIONS.map(code => (
                                        <SelectItem key={code} value={code}>{code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.currency_code && <p className="text-sm text-destructive">{errors.currency_code.message}</p>}
                </div>

                {/* Payment Terms */}
                <div className="space-y-2">
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <Controller
                        name="payment_terms"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select terms" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_TERMS_OPTIONS.map(term => (
                                        <SelectItem key={term} value={term}>{term}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.payment_terms && <p className="text-sm text-destructive">{errors.payment_terms.message}</p>}
                </div>

                {/* Tax ID / VAT */}
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                  <Input
                    id="tax_id"
                    {...register("tax_id")}
                    placeholder="e.g., 555-12345"
                  />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Billing Address */}
                <div className="space-y-2">
                    <Label htmlFor="billing_address_text">Billing Address (Full)</Label>
                    <Textarea
                        id="billing_address_text"
                        {...register("billing_address_text")}
                        placeholder="Street, City, Postal Code, Country"
                        rows={3}
                    />
                </div>

                {/* Shipping Address */}
                <div className="space-y-2">
                    <Label htmlFor="shipping_address_text">Shipping Address (Full)</Label>
                    <Textarea
                        id="shipping_address_text"
                        {...register("shipping_address_text")}
                        placeholder="Street, City, Postal Code, Country"
                        rows={3}
                        disabled={isSameAddress && !!watch("billing_address_text")} 
                    />
                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                            id="same_address"
                            checked={isSameAddress}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setValue("shipping_address_text", watch("billing_address_text"), { shouldValidate: true });
                                } else if (!checked && isSameAddress) {
                                    setValue("shipping_address_text", "", { shouldValidate: true });
                                }
                            }}
                        />
                        <Label htmlFor="same_address" className="text-sm">
                            Same as Billing Address
                        </Label>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              {/* Status Checkbox */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="status"
                    checked={field.value === 'Active'}
                    onCheckedChange={(checked) => field.onChange(checked ? 'Active' : 'Inactive')}
                  />
                )}
              />
              <Label htmlFor="status" className="text-sm font-medium leading-none">
                Active Vendor
              </Label>
            </div>
            
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Updating..." : "Update Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditVendor;
