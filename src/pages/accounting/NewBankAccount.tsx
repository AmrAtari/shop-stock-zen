import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const NewBankAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Information
    bank_name: "",
    account_number: "",
    routing_number: "",
    account_type: "",

    // International Banking
    iban: "",
    swift_code: "",

    // Account Details
    currency: settings?.currency || "USD",
    opening_date: new Date().toISOString().split("T")[0],
    initial_balance: "0.00",
    description: "",

    // Branch Information
    branch_name: "",
    branch_code: "",

    // Contact Information
    contact_person: "",
    phone: "",
    email: "",
    address: "",

    // Account Limits
    credit_limit: "0.00",
    overdraft_limit: "0.00",
    minimum_balance: "0.00",
    interest_rate: "0.00",

    // Status
    status: "active",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.bank_name || !formData.account_number || !formData.routing_number || !formData.account_type) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Prepare data for database insertion
      const bankAccountData = {
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        routing_number: formData.routing_number,
        account_type: formData.account_type,
        iban: formData.iban || null,
        swift_code: formData.swift_code || null,
        currency: formData.currency,
        opening_date: formData.opening_date,
        current_balance: parseFloat(formData.initial_balance) || 0,
        available_balance: parseFloat(formData.initial_balance) || 0,
        ledger_balance: parseFloat(formData.initial_balance) || 0,
        description: formData.description || null,
        branch_name: formData.branch_name || null,
        branch_code: formData.branch_code || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        overdraft_limit: parseFloat(formData.overdraft_limit) || 0,
        minimum_balance: parseFloat(formData.minimum_balance) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        status: formData.status,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating bank account with data:", bankAccountData);

      // Insert into database
      const { data, error } = await supabase.from("bank_accounts").insert([bankAccountData]).select().single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Bank account created successfully:", data);

      toast({
        title: "Bank account created successfully!",
        description: `${formData.bank_name} account has been added to your accounts.`,
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });

      // Navigate back to bank accounts list
      navigate("/accounting/bank-accounts");
    } catch (error: any) {
      console.error("Error creating bank account:", error);
      toast({
        title: "Error creating bank account",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/accounting/bank-accounts")} type="button">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Bank Account</h1>
          <p className="text-muted-foreground">Create a new bank account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Bank Account Information</CardTitle>
            <CardDescription>Enter the details for the new bank account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    placeholder="e.g., Bank Of Palestine"
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange("bank_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number *</Label>
                  <Input
                    id="account_number"
                    placeholder="e.g., 682591"
                    value={formData.account_number}
                    onChange={(e) => handleInputChange("account_number", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routing_number">Routing Number *</Label>
                  <Input
                    id="routing_number"
                    placeholder="e.g., PALIPSAEXXX"
                    value={formData.routing_number}
                    onChange={(e) => handleInputChange("routing_number", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type *</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => handleInputChange("account_type", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="business">Business Checking</SelectItem>
                      <SelectItem value="money-market">Money Market</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="loan">Loan Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* International Banking Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">International Banking</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    placeholder="International Bank Account Number"
                    value={formData.iban}
                    onChange={(e) => handleInputChange("iban", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swift_code">SWIFT/BIC Code</Label>
                  <Input
                    id="swift_code"
                    placeholder="e.g., PALIPSAEXXX"
                    value={formData.swift_code}
                    onChange={(e) => handleInputChange("swift_code", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Account Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange("currency", e.target.value)}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_date">Opening Date</Label>
                  <Input
                    id="opening_date"
                    type="date"
                    value={formData.opening_date}
                    onChange={(e) => handleInputChange("opening_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_balance">Initial Balance ({currency})</Label>
                  <Input
                    id="initial_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.initial_balance}
                    onChange={(e) => handleInputChange("initial_balance", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description or notes about this account"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Branch Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Branch Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    placeholder="Main Branch"
                    value={formData.branch_name}
                    onChange={(e) => handleInputChange("branch_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_code">Branch Code</Label>
                  <Input
                    id="branch_code"
                    placeholder="e.g., 001"
                    value={formData.branch_code}
                    onChange={(e) => handleInputChange("branch_code", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    placeholder="Bank manager or contact person"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange("contact_person", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+970 2 123 4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@bank.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Branch Address</Label>
                  <Input
                    id="address"
                    placeholder="Full branch address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Account Limits Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Limits & Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Credit Limit ({currency})</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.credit_limit}
                    onChange={(e) => handleInputChange("credit_limit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overdraft_limit">Overdraft Limit ({currency})</Label>
                  <Input
                    id="overdraft_limit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.overdraft_limit}
                    onChange={(e) => handleInputChange("overdraft_limit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_balance">Minimum Balance ({currency})</Label>
                  <Input
                    id="minimum_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.minimum_balance}
                    onChange={(e) => handleInputChange("minimum_balance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.interest_rate}
                    onChange={(e) => handleInputChange("interest_rate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Bank Account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/accounting/bank-accounts")}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default NewBankAccount;
