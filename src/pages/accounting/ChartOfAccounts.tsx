import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ChartOfAccounts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset",
    parent_account_id: null as string | null,
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("account_code");

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
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header and New Account Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* Search and Accounts Table */}
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
                  <TableCell colSpan={6} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredAccounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-semibold">{account.account_code}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>
                      <Badge variant={getAccountTypeBadge(account.account_type) as any}>{account.account_type}</Badge>
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

      {/* New Account Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Account Code"
              value={newAccount.account_code}
              onChange={(e) => setNewAccount({ ...newAccount, account_code: e.target.value })}
            />
            <Input
              placeholder="Account Name"
              value={newAccount.account_name}
              onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
            />
            <Select
              value={newAccount.account_type}
              onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Account Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="cogs">COGS</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Description"
              value={newAccount.description}
              onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
            />
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const { data, error } = await supabase.from("accounts").insert([newAccount]);
                if (error) {
                  alert("Error creating account: " + error.message);
                } else {
                  setIsOpen(false);
                  setNewAccount({
                    account_code: "",
                    account_name: "",
                    account_type: "asset",
                    parent_account_id: null,
                    description: "",
                  });
                  queryClient.invalidateQueries(["accounts"] as any);
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChartOfAccounts;
