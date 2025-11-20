import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBankAccount, useBankAccounts } from "@/hooks/useBankAccounts";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const NewBankAccount = () => {
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  const createBankAccount = useCreateBankAccount();
  const { refetch } = useBankAccounts();
  const navigate = useNavigate();

  // Fetch accounts to link to chart of accounts
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, account_code, account_name")
        .eq("account_type", "asset")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const handleCreateAccount = async () => {
    if (!accountName || !bankName || !accountNumber || !selectedAccount) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await createBankAccount.mutateAsync({
        account_name: accountName,
        bank_name: bankName,
        account_number: accountNumber,
        opening_balance: parseFloat(openingBalance) || 0,
        current_balance: parseFloat(openingBalance) || 0,
        account_id: selectedAccount, // CHANGED: from gl_account_id to account_id
        account_type: "checking",
        currency_id: "NIS", // You might need to create currencies table or hardcode for now
        is_active: true,
      });

      toast.success("Bank account created successfully!");
      await refetch();

      // Navigate back to bank accounts list
      navigate("/accounting/bank-accounts");
    } catch (error) {
      toast.error("Failed to create bank account");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/accounting/bank-accounts")}>
          Back to Bank Accounts
        </Button>
        <h1 className="text-3xl font-bold">Create Bank Account</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Primary Business Checking"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name *</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., Bank of Palestine"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g., 123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openingBalance">Opening Balance</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="glAccount">Link to Chart of Account *</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account (1010 for cash)" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreateAccount} disabled={createBankAccount.isPending} className="w-full">
            {createBankAccount.isPending ? "Creating..." : "Create Bank Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewBankAccount;
