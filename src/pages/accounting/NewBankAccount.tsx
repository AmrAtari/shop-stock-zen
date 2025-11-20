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

// Create a simple storage for bank accounts (in real app, this would be an API)
const createBankAccount = (accountData: any) => {
  const accounts = JSON.parse(localStorage.getItem("bankAccounts") || "[]");
  const newAccount = {
    id: Date.now().toString(),
    ...accountData,
    createdAt: new Date().toISOString(),
    currentBalance: parseFloat(accountData.initialBalance) || 0,
    availableBalance: parseFloat(accountData.initialBalance) || 0,
    ledgerBalance: parseFloat(accountData.initialBalance) || 0,
    status: accountData.status || "active",
    lastReconciliation: null,
    isReconciled: false,
    creditLimit: parseFloat(accountData.creditLimit) || 0,
    overdraftLimit: parseFloat(accountData.overdraftLimit) || 0,
    minimumBalance: parseFloat(accountData.minimumBalance) || 0,
    interestRate: parseFloat(accountData.interestRate) || 0,
  };
  accounts.push(newAccount);
  localStorage.setItem("bankAccounts", JSON.stringify(accounts));
  return newAccount;
};

const NewBankAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Information
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountType: "",

    // International Banking
    iban: "",
    swiftCode: "",

    // Account Details
    currency: settings?.currency || "USD",
    openingDate: new Date().toISOString().split("T")[0],
    initialBalance: "0.00",
    description: "",

    // Branch Information
    branchName: "",
    branchCode: "",

    // Contact Information
    contactPerson: "",
    phone: "",
    email: "",
    address: "",

    // Account Limits
    creditLimit: "0.00",
    overdraftLimit: "0.00",
    minimumBalance: "0.00",
    interestRate: "0.00",

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
    if (!formData.bankName || !formData.accountNumber || !formData.routingNumber || !formData.accountType) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create the bank account
      createBankAccount(formData);

      toast({
        title: "Bank account created successfully!",
        description: `${formData.bankName} account has been added to your accounts.`,
      });

      // Navigate back to bank accounts list
      navigate("/accounting/bank-accounts");
    } catch (error) {
      toast({
        title: "Error creating bank account",
        description: "Please try again.",
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
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    placeholder="e.g., Bank Of Palestine"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange("bankName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    placeholder="e.g., 682591"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number *</Label>
                  <Input
                    id="routingNumber"
                    placeholder="e.g., PALIPSAEXXX"
                    value={formData.routingNumber}
                    onChange={(e) => handleInputChange("routingNumber", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type *</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value) => handleInputChange("accountType", value)}
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
                  <Label htmlFor="swiftCode">SWIFT/BIC Code</Label>
                  <Input
                    id="swiftCode"
                    placeholder="e.g., PALIPSAEXXX"
                    value={formData.swiftCode}
                    onChange={(e) => handleInputChange("swiftCode", e.target.value)}
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
                  <Label htmlFor="openingDate">Opening Date</Label>
                  <Input
                    id="openingDate"
                    type="date"
                    value={formData.openingDate}
                    onChange={(e) => handleInputChange("openingDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Initial Balance ({currency})</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.initialBalance}
                    onChange={(e) => handleInputChange("initialBalance", e.target.value)}
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
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    placeholder="Main Branch"
                    value={formData.branchName}
                    onChange={(e) => handleInputChange("branchName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Branch Code</Label>
                  <Input
                    id="branchCode"
                    placeholder="e.g., 001"
                    value={formData.branchCode}
                    onChange={(e) => handleInputChange("branchCode", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Bank manager or contact person"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
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
                  <Label htmlFor="creditLimit">Credit Limit ({currency})</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.creditLimit}
                    onChange={(e) => handleInputChange("creditLimit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overdraftLimit">Overdraft Limit ({currency})</Label>
                  <Input
                    id="overdraftLimit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.overdraftLimit}
                    onChange={(e) => handleInputChange("overdraftLimit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumBalance">Minimum Balance ({currency})</Label>
                  <Input
                    id="minimumBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.minimumBalance}
                    onChange={(e) => handleInputChange("minimumBalance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.interestRate}
                    onChange={(e) => handleInputChange("interestRate", e.target.value)}
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
