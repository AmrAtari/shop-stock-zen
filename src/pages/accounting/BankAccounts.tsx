import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Edit, Trash2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const BankAccounts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bank-accounts"],
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
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bank accounts:", error);
        throw error;
      }
      return data;
    },
  });

  const handleDelete = async (id: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast({
        title: "Bank account deleted",
        description: `${accountName} has been deleted successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    } catch (error: any) {
      console.error("Error deleting bank account:", error);
      toast({
        title: "Error deleting bank account",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAccounts = accounts?.filter(
    (account) =>
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_number.includes(searchTerm),
  );

  if (error) {
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
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Error loading bank accounts: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle>Bank Accounts ({filteredAccounts?.length || 0})</CardTitle>
          <CardDescription>Your connected bank accounts</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by account name, bank name, or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading bank accounts...</p>
            </div>
          ) : filteredAccounts?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No bank accounts found matching your search." : "No bank accounts found."}
              </p>
              {!searchTerm && (
                <Button variant="outline" className="mt-4" onClick={() => navigate("/accounting/bank-accounts/new")}>
                  Add Your First Bank Account
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>{account.bank_name}</TableCell>
                    <TableCell>{account.account_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {account.account_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(parseFloat(account.current_balance), currency)}</TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/accounting/bank-accounts/${account.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/accounting/bank-accounts/${account.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(account.id, account.account_name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccounts;
