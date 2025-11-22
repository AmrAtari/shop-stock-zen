import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// --- Interface Definitions (Must match the unified 'suppliers' table structure) ---
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
  status: "Active" | "Inactive";
  billing_address: Address | null;
  shipping_address: Address | null;
  created_at: string;
}

const VendorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Vendor Data
  const {
    data: vendor,
    isLoading,
    error,
  } = useQuery<VendorDetail>({
    queryKey: ["vendor", id],
    queryFn: async () => {
      if (!id) throw new Error("Vendor ID is missing.");

      const { data, error } = await supabase
        .from("suppliers") // --- CRITICAL FIX: Querying the unified 'suppliers' table ---
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as VendorDetail;
    },
    enabled: !!id,
  });

  // 2. Delete Handler
  const handleDelete = async () => {
    if (!vendor) return;

    if (!confirm(`Are you sure you want to delete the vendor "${vendor.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id); // --- CRITICAL FIX: Querying the unified 'suppliers' table ---

      if (error) {
        throw error;
      }

      toast({
        title: "Vendor Deleted",
        description: `${vendor.name} has been permanently removed.`,
      });

      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      navigate("/accounting/vendors");
    } catch (error: any) {
      console.error("Error deleting vendor:", error);
      toast({
        title: "Error deleting vendor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 3. Loading and Error States
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 col-span-2" />
          <Skeleton className="h-48" />
        </div>
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
          <h1 className="text-3xl font-bold">Error</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error?.message || "Vendor not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to safely extract address text
  const getAddressText = (addr: Address | null) => addr?.full_address || "N/A";

  // 4. Main Component Rendering
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/vendors")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{vendor.name}</h1>
            <Badge variant={vendor.status === "Active" ? "default" : "secondary"}>{vendor.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/accounting/vendors/${vendor.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Core and Contact Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Core Details</CardTitle>
            <CardDescription>Basic identification and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendor Code */}
              <div>
                <p className="text-sm text-muted-foreground">Vendor Code</p>
                <p className="font-medium">{vendor.vendor_code || "N/A"}</p>
              </div>

              {/* Tax ID */}
              <div>
                <p className="text-sm text-muted-foreground">Tax ID / VAT Number</p>
                <p className="font-medium">{vendor.tax_id || "N/A"}</p>
              </div>

              {/* Contact Person */}
              {vendor.contact_person && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/70" /> {vendor.contact_person}
                  </p>
                </div>
              )}

              {/* Phone */}
              {vendor.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary/70" /> {vendor.phone}
                  </p>
                </div>
              )}

              {/* Email */}
              {vendor.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary/70" /> {vendor.email}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Financial Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Default Currency</p>
              <Badge className="text-lg px-3 py-1 font-semibold">{vendor.currency_code}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <p className="font-medium">{vendor.payment_terms}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creation Date</p>
              <p className="font-medium">{new Date(vendor.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 3: Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billing Address */}
            <div>
              <p className="text-sm text-muted-foreground">Billing Address</p>
              <pre className="font-mono whitespace-pre-wrap bg-secondary/30 p-3 rounded text-sm">
                {getAddressText(vendor.billing_address)}
              </pre>
            </div>
            {/* Shipping Address */}
            <div>
              <p className="text-sm text-muted-foreground">Shipping Address</p>
              <pre className="font-mono whitespace-pre-wrap bg-secondary/30 p-3 rounded text-sm">
                {getAddressText(vendor.shipping_address)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Bills/Transactions related to this Vendor */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Bills & Activity</CardTitle>
          <CardDescription>Summary of outstanding Accounts Payable and historical purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-muted-foreground italic">
            (Future feature: List of Bills and Payments here)
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorDetail;
