import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// --- Interface Definitions ---
interface AddressForm {
  full_address: string;
}

interface VendorForm {
  name: string;
  vendor_code: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  currency_code: string;
  payment_terms: string;
  status: "Active" | "Inactive";
  billing_address: AddressForm;
  shipping_address: AddressForm;
}

const NewVendor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<VendorForm>({
    name: "",
    vendor_code: "",
    contact_person: "",
    email: "",
    phone: "",
    tax_id: "",
    currency_code: "USD",
    payment_terms: "Net 30",
    status: "Active",
    billing_address: { full_address: "" },
    shipping_address: { full_address: "" },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSelectChange = (id: keyof VendorForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleAddressChange = (type: "billing_address" | "shipping_address", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { full_address: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("suppliers") // --- CRITICAL FIX: Querying the unified 'suppliers' table ---
        .insert([
          {
            ...formData,
            // Ensure empty strings for codes/IDs become null in DB if necessary
            vendor_code: formData.vendor_code || null,
            tax_id: formData.tax_id || null,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Vendor Created",
        description: `${formData.name} has been added to the master file.`,
      });

      // Navigate to the detail page or the list
      navigate(`/accounting/vendors/${data.id}`);
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      toast({
        title: "Error creating vendor",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/vendors")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">New Vendor</h1>
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
              <Input
                id="vendor_code"
                value={formData.vendor_code}
                onChange={handleChange}
                placeholder="Optional, unique identifier"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" value={formData.contact_person} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
              <Input id="tax_id" value={formData.tax_id} onChange={handleChange} />
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
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  {/* Add more currencies as needed */}
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
                  <SelectItem value="Net 15">Net 15</SelectItem>
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
            <CardDescription>Enter the full addresses for billing and shipping.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_address">Billing Address</Label>
              <Textarea
                id="billing_address"
                value={formData.billing_address.full_address}
                onChange={(e) => handleAddressChange("billing_address", e.target.value)}
                rows={4}
                placeholder="Full billing address (street, city, state, zip, country)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_address">Shipping Address (Optional)</Label>
              <Textarea
                id="shipping_address"
                value={formData.shipping_address.full_address}
                onChange={(e) => handleAddressChange("shipping_address", e.target.value)}
                rows={4}
                placeholder="Full shipping address if different from billing"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Create Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewVendor;
