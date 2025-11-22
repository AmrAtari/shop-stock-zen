import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemSettings } from "@/contexts/SystemSettingsContext"; // ✅ Imported

// --- Interface Definitions (Must match the new 'suppliers' table structure) ---
interface Address {
  full_address?: string;
}

interface VendorData {
  id: string;
  name: string;
  vendor_code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  currency_code: string;
  payment_terms: string;
  status: "Active" | "Inactive";
  billing_address: Address | null;
  shipping_address: Address | null;
}

const EditVendor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings(); // ✅ Used (Available for context/validation)

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<VendorData | null>(null);

  // 1. Fetch existing data
  const {
    data: vendor,
    isLoading,
    error,
  } = useQuery<VendorData>({
    queryKey: ["vendor", id],
    queryFn: async () => {
      if (!id) throw new Error("Vendor ID is missing.");

      const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();

      if (error) throw error;
      return data as VendorData;
    },
    enabled: !!id,
  });

  // 2. Initialize form data once vendor data is fetched
  useEffect(() => {
    if (vendor) {
      setFormData({
        ...vendor,
        // Ensure null addresses are represented as empty objects for form state
        billing_address: vendor.billing_address || { full_address: "" },
        shipping_address: vendor.shipping_address || { full_address: "" },
      } as VendorData);
    }
  }, [vendor]);

  // Helper to safely extract address text
  const getAddressText = (addr: Address | null) => addr?.full_address || "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null));
  };

  const handleSelectChange = (id: keyof VendorData, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null));
  };

  const handleAddressChange = (type: "billing_address" | "shipping_address", value: string) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [type]: { full_address: value },
          }
        : null,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !id) return;
    setIsSubmitting(true);

    try {
      // Prepare data for Supabase update, removing the internal ID
      const { id: _, ...updateData } = formData;

      const { error } = await supabase
        .from("suppliers")
        .update({
          ...updateData,
          vendor_code: formData.vendor_code || null,
          tax_id: formData.tax_id || null,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Invalidate queries to refresh the list and detail pages
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });

      toast({
        title: "Vendor Updated",
        description: `${formData.name} details have been successfully modified.`,
      });

      navigate(`/accounting/vendors/${id}`);
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      toast({
        title: "Error updating vendor",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/accounting/vendors/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Vendor: {formData.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Core Details</CardTitle>
            <CardDescription>Basic identification and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_code">Vendor Code</Label>
              <Input id="vendor_code" value={formData.vendor_code || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" value={formData.contact_person || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
              <Input id="tax_id" value={formData.tax_id || ""} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency_code">Default Currency *</Label>
              <Select
                value={formData.currency_code}
                onValueChange={(value) => handleSelectChange("currency_code", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={settings?.currency || "USD"}>
                    {settings?.currency || "USD"} (System Default)
                  </SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms *</Label>
              <Select
                value={formData.payment_terms}
                onValueChange={(value) => handleSelectChange("payment_terms", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value as "Active" | "Inactive")}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_address">Billing Address</Label>
              <Textarea
                id="billing_address"
                value={getAddressText(formData.billing_address)}
                onChange={(e) => handleAddressChange("billing_address", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_address">Shipping Address</Label>
              <Textarea
                id="shipping_address"
                value={getAddressText(formData.shipping_address)}
                onChange={(e) => handleAddressChange("shipping_address", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditVendor;
