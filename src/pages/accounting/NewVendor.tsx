import React from "react";
import { useNavigate } from "react-router-dom";
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
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// --- Constants (for dropdowns) ---
const PAYMENT_TERMS_OPTIONS = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 60"];
// Based on Palestine's common trade currencies
const CURRENCY_OPTIONS = ["ILS", "USD", "JOD", "EUR"]; 

// --- Zod Schema Definition ---
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

const NewVendor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(VendorSchema),
    defaultValues: {
      name: "",
      vendor_code: "",
      currency_code: "USD", // Default to USD or common currency
      payment_terms: "Net 30",
      status: "Active",
      billing_address_text: "",
      shipping_address_text: "",
    },
  });

  const isSameAddress = watch("shipping_address_text") === watch("billing_address_text");

  const onSubmit = async (values: VendorFormValues) => {
    // Construct the JSONB objects for the addresses from the text areas
    // In a real ERP, you'd have structured inputs (street, city, etc.)
    const billingAddressJson = values.billing_address_text 
      ? { full_address: values.billing_address_text }
      : null;
      
    const shippingAddressJson = values.shipping_address_text 
      ? { full_address: values.shipping_address_text }
      : billingAddressJson; // If shipping is empty, default to billing address logic

    const vendorToInsert = {
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
        .insert(vendorToInsert);

      if (error) {
        throw error;
      }

      toast({
        title: "Vendor Created",
        description: `Vendor "${values.name}" has been successfully added.`,
      });

      // Invalidate the vendor list query cache
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      
      // Navigate back to the vendor list
      navigate("/accounting/vendors"); 
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      toast({
        title: "Error Creating Vendor",
        description: error.message || "An unexpected error occurred. Check if the vendor code is unique.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/vendors")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Vendor</h1>
          <p className="text-muted-foreground">Define a new supplier for your Accounts Payable ledger.</p>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        // Disable if the user wants to copy billing address
                        disabled={isSameAddress && !!watch("billing_address_text")} 
                    />
                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                            id="same_address"
                            checked={isSameAddress}
                            onCheckedChange={(checked) => {
                                // Simple logic: if checked, copy billing address text to shipping address text
                                if (checked) {
                                    setValue("shipping_address_text", watch("billing_address_text"), { shouldValidate: true });
                                } else if (!checked && isSameAddress) {
                                    // Only clear if it was copied and the user unchecks it
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
            {isSubmitting ? "Saving..." : "Save Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVendor;
