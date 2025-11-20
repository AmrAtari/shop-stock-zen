import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";

// Function to get bank accounts from storage
const getBankAccounts = () => {
  return JSON.parse(localStorage.getItem("bankAccounts") || "[]");
};

const BankAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  useEffect(() => {
    // Load accounts when component mounts
    const loadedAccounts = getBankAccounts();
    setAccounts(loadedAccounts);
  }, []);

  const handleViewAccount = (accountId: string) => {
    navigate(`/accounting/bank-accounts/${accountId}`);
  };

  const handleEditAccount = (accountId: string) => {
    navigate(`/accounting/bank-accounts/${accountId}/edit`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage your bank accounts and transactions</p>
        </div>
        <Button onClick={() => navigate("/accounting/bank-accounts/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Bank Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>Your connected bank accounts will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bank accounts found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/accounting/bank-accounts/new")}>
                Add Your First Bank Account
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts ({accounts.length})</CardTitle>
            <CardDescription>Your connected bank accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">B</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{account.bankName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {account.accountType} ••••{account.accountNumber.slice(-4)}
                      </p>
                      <p className="text-sm">Balance: {formatCurrency(parseFloat(account.currentBalance), currency)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{account.accountType}</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleViewAccount(account.id)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditAccount(account.id)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccounts;
