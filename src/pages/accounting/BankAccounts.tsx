import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BankAccounts = () => {
  const navigate = useNavigate();

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
    </div>
  );
};

export default BankAccounts;
