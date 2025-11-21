import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const BankAccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  const {
    data: account,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bank-account", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select(
          `
          *,
          bank_account_categories(name),
          accounts(account_code, account_name)
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
  });

  const handleDelete = async () => {
    if (!account || !confirm(`Are you sure you want to delete "${account.account_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", account.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Bank account deleted",
        description: `${account.account_name} has been deleted successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      navigate("/accounting/bank-accounts");
    } catch (error: any) {
      console.error("Error deleting bank account:", error);
      toast({
        title: "Error deleting bank account",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/bank-accounts")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Loading...</h1>
            <p className="text-muted-foreground">Loading bank account details</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/bank-accounts")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Account Not Found</h1>
            <p className="text-muted-foreground">The requested bank account could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/accounting/bank-accounts")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{account.account_name}</h1>
            <p className="text-muted-foreground">
              {account.account_type.replace("_", " ")} ••••{account.account_number.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/accounting/bank-accounts/${account.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Account
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Bank Name</p>
              <p className="font-medium">{account.bank_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Type</p>
              <p className="font-medium capitalize">{account.account_type.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              <p className="font-mono">••••{account.account_number.slice(-4)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={account.is_active ? "default" : "secondary"}>
                {account.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Balance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(parseFloat(account.current_balance), currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-xl font-semibold">{formatCurrency(parseFloat(account.available_balance), currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Opening Balance</p>
              <p className="font-medium">{formatCurrency(parseFloat(account.opening_balance), currency)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account.iban && (
              <div>
                <p className="text-sm text-muted-foreground">IBAN</p>
                <p className="font-mono text-sm">{account.iban}</p>
              </div>
            )}
            {account.swift_code && (
              <div>
                <p className="text-sm text-muted-foreground">SWIFT Code</p>
                <p className="font-mono">{account.swift_code}</p>
              </div>
            )}
            {account.routing_number && (
              <div>
                <p className="text-sm text-muted-foreground">Routing Number</p>
                <p className="font-mono">{account.routing_number}</p>
              </div>
            )}
            {account.branch_name && (
              <div>
                <p className="text-sm text-muted-foreground">Branch Name</p>
                <p className="font-medium">{account.branch_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Information Card */}
      {(account.contact_person || account.phone || account.email || account.address) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {account.contact_person && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{account.contact_person}</p>
                </div>
              )}
              {account.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{account.phone}</p>
                </div>
              )}
              {account.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{account.email}</p>
                </div>
              )}
              {account.address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{account.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Card */}
      {account.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{account.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccountDetail;
