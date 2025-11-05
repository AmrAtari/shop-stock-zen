import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ChartOfAccounts = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });

  const getAccountTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      asset: "default",
      liability: "destructive",
      equity: "secondary",
      revenue: "success",
      expense: "warning",
      cogs: "outline",
    };
    return variants[type] || "default";
  };

  const filteredAccounts = accounts?.filter(
    (account) =>
      account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredAccounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No accounts found</TableCell>
                </TableRow>
              ) : (
                filteredAccounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-semibold">{account.account_code}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>
                      <Badge variant={getAccountTypeBadge(account.account_type) as any}>
                        {account.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">$0.00</TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? "default" : "secondary"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={account.is_system_account}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartOfAccounts;
