import React, { useState, useEffect } from "react";
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
  const [categories, setCategories] = useState<any[]>([]);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);
  const [allowedAccountTypes, setAllowedAccountTypes] = useState<string[]>([]);

  // Fetch categories, GL accounts, and check constraint on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch bank account categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("bank_account_categories")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (categoriesError) {
          console.error("Error fetching categories:", categoriesError);
        } else {
          setCategories(categoriesData || []);
        }

        // Fetch GL accounts for mapping
        const { data: accountsData, error: accountsError } = await supabase
          .from("accounts")
          .select("id, account_code, account_name")
          .eq("is_active", true)
          .order("account_code");

        if (accountsError) {
          console.error("Error fetching GL accounts:", accountsError);
        } else {
          setGlAccounts(accountsData || []);
        }

        // Try to get the check constraint values by querying the information schema
        const { data: constraintData, error: constraintError } = await supabase
          .from("information_schema.check_constraints")
          .select("check_clause")
          .ilike("constraint_name", "%bank_accounts_account_type_check%");

        if (!constraintError && constraintData && constraintData.length > 0) {
          console.log("Check constraint found:", constraintData[0].check_clause);
          // Parse the constraint to extract allowed values
          const constraint = constraintData[0].check_clause;
          const matches = constraint.match(/'([^']+)'/g);
          if (matches) {
            const allowedTypes = matches.map((match) => match.replace(/'/g, ""));
            setAllowedAccountTypes(allowedTypes);
            console.log("Allowed account types:", allowedTypes);
          }
        }

        // If we can't get the constraint, try common values
        if (allowedAccountTypes.length === 0) {
          console.log("Could not determine allowed account types from constraint, using common values");
          setAllowedAccountTypes(["checking", "savings", "current", "business", "money_market"]);
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
      }
    };

    fetchData();
  }, []);

  const [formData, setFormData] = useState({
    // Basic Information (from your original table)
    account_name: "",
    bank_name: "",
    account_number: "",
    account_type: "",

    // New professional fields (from extended table)
    iban: "",
    swift_code: "",
    routing_number: "",
    branch_name: "",
    branch_code: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    credit_limit: "0.00",
    overdraft_limit: "0.00",
    minimum_balance: "0.00",
    interest_rate: "0.00",

    // Account balances
    opening_balance: "0.00",
    current_balance: "0.00",
    available_balance: "0.00",
    ledger_balance: "0.00",

    // Foreign keys - make these optional for now
    currency_id: null,
    gl_account_id: "",
    category_id: "",

    // Status & Notes
    is_active: true,
    notes: "",
  });

  const handleInputChange = (field: string, value: string | boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.account_name || !formData.bank_name || !formData.account_number || !formData.account_type) {
      toast({
        title: "Missing required fields",
        description: "Please fill in Account Name, Bank Name, Account Number, and Account Type.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Prepare data for database insertion
      const bankAccountData = {
        // Required fields from your table
        account_name: formData.account_name,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_type: formData.account_type.toLowerCase(), // Try lowercase

        // Optional fields - only include if they have values
        ...(formData.iban && { iban: formData.iban }),
        ...(formData.swift_code && { swift_code: formData.swift_code }),
        ...(formData.routing_number && { routing_number: formData.routing_number }),
        ...(formData.branch_name && { branch_name: formData.branch_name }),
        ...(formData.branch_code && { branch_code: formData.branch_code }),
        ...(formData.contact_person && { contact_person: formData.contact_person }),
        ...(formData.phone && { phone: formData.phone }),
        ...(formData.email && { email: formData.email }),
        ...(formData.address && { address: formData.address }),

        // Numeric fields with defaults
        credit_limit: parseFloat(formData.credit_limit) || 0,
        overdraft_limit: parseFloat(formData.overdraft_limit) || 0,
        minimum_balance: parseFloat(formData.minimum_balance) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        current_balance: parseFloat(formData.current_balance) || 0,
        available_balance: parseFloat(formData.available_balance) || 0,
        ledger_balance: parseFloat(formData.ledger_balance) || 0,

        // Foreign keys - only include if selected
        ...(formData.gl_account_id && { gl_account_id: formData.gl_account_id }),
        ...(formData.category_id && { category_id: formData.category_id }),

        // Status & Notes
        is_active: formData.is_active,
        ...(formData.notes && { notes: formData.notes }),
      };

      console.log("Creating bank account with data:", bankAccountData);
      console.log("Account type being sent:", bankAccountData.account_type);

      // Insert into database
      const { data, error } = await supabase.from("bank_accounts").insert([bankAccountData]).select();

      if (error) {
        console.error("Supabase error details:", error);

        // If it's a constraint error, try different casing
        if (error.code === "23514") {
          console.log("Trying different account type casing...");

          // Try uppercase
          const bankAccountDataUpper = {
            ...bankAccountData,
            account_type: formData.account_type.toUpperCase(),
          };

          const { data: dataUpper, error: errorUpper } = await supabase
            .from("bank_accounts")
            .insert([bankAccountDataUpper])
            .select();

          if (!errorUpper) {
            console.log("Success with uppercase account type!");
            toast({
              title: "Bank account created successfully!",
              description: `${formData.account_name} has been added to your accounts.`,
            });
            queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
            navigate("/accounting/bank-accounts");
            return;
          }

          // Try title case
          const bankAccountDataTitle = {
            ...bankAccountData,
            account_type: formData.account_type.charAt(0).toUpperCase() + formData.account_type.slice(1).toLowerCase(),
          };

          const { data: dataTitle, error: errorTitle } = await supabase
            .from("bank_accounts")
            .insert([bankAccountDataTitle])
            .select();

          if (!errorTitle) {
            console.log("Success with title case account type!");
            toast({
              title: "Bank account created successfully!",
              description: `${formData.account_name} has been added to your accounts.`,
            });
            queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
            navigate("/accounting/bank-accounts");
            return;
          }

          throw new Error(
            `Database error: Check constraint violation. Tried multiple cases but none worked. Please check the allowed account types in your database.`,
          );
        }

        throw new Error(`Database error: ${error.message}`);
      }

      console.log("Bank account created successfully:", data);

      toast({
        title: "Bank account created successfully!",
        description: `${formData.account_name} has been added to your accounts.`,
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });

      // Navigate back to bank accounts list
      navigate("/accounting/bank-accounts");
    } catch (error: any) {
      console.error("Error creating bank account:", error);
      toast({
        title: "Error creating bank account",
        description: error.message || "Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 min-h-screen">
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
                  <Label htmlFor="account_name">Account Name *</Label>
                  <Input
                    id="account_name"
                    placeholder="e.g., Main Business Account"
                    value={formData.account_name}
                    onChange={(e) => handleInputChange("account_name", e.target.value)}
                    required
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {/* Try lowercase first since that's most common */}
                      <SelectItem value="checking">Checking Account</SelectItem>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="business">Business Account</SelectItem>
                      <SelectItem value="current">Current Account</SelectItem>
                      <SelectItem value="money_market">Money Market Account</SelectItem>
                      <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Account Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => handleInputChange("category_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gl_account_id">GL Account Mapping</Label>
                  <Select
                    value={formData.gl_account_id}
                    onValueChange={(value) => handleInputChange("gl_account_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GL account" />
                    </SelectTrigger>
                    <SelectContent>
                      {glAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rest of your form sections remain the same */}
            {/* International Banking Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">International Banking</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="routing_number">Routing Number</Label>
                  <Input
                    id="routing_number"
                    placeholder="e.g., 021000021"
                    value={formData.routing_number}
                    onChange={(e) => handleInputChange("routing_number", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Account Balances Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Balances</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance ({currency})</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.opening_balance}
                    onChange={(e) => handleInputChange("opening_balance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_balance">Current Balance ({currency})</Label>
                  <Input
                    id="current_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.current_balance}
                    onChange={(e) => handleInputChange("current_balance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="available_balance">Available Balance ({currency})</Label>
                  <Input
                    id="available_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.available_balance}
                    onChange={(e) => handleInputChange("available_balance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ledger_balance">Ledger Balance ({currency})</Label>
                  <Input
                    id="ledger_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.ledger_balance}
                    onChange={(e) => handleInputChange("ledger_balance", e.target.value)}
                  />
                </div>
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

            {/* Status & Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Status & Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="is_active">Account Status</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) => handleInputChange("is_active", value === "active")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this bank account"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                />
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
