import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const getBankAccount = (id: string) => {
  const accounts = JSON.parse(localStorage.getItem("bankAccounts") || "[]");
  return accounts.find((account: any) => account.id === id);
};

const BankAccountDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    if (id) {
      const foundAccount = getBankAccount(id);
      setAccount(foundAccount);
    }
  }, [id]);

  if (!account) {
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
            <h1 className="text-3xl font-bold">{account.bankName}</h1>
            <p className="text-muted-foreground">
              {account.accountType} ••••{account.accountNumber.slice(-4)}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/accounting/bank-accounts/${account.id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Bank Name</p>
              <p className="font-medium">{account.bankName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Type</p>
              <p className="font-medium">{account.accountType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="default">Active</Badge>
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
              <p className="text-2xl font-bold">${parseFloat(account.currentBalance).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-xl font-semibold">${parseFloat(account.availableBalance).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              <p className="font-mono">••••{account.accountNumber.slice(-4)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Routing Number</p>
              <p className="font-mono">{account.routingNumber}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankAccountDetail;
