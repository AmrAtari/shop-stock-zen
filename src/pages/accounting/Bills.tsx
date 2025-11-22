import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileText, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  balance: number;
  status: 'Awaiting Payment' | 'Partially Paid' | 'Paid' | 'Void';
  currency_code: string;
  suppliers: { // Joining from the 'suppliers' table
    name: string;
    vendor_code: string | null;
  };
}

const Bills = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const baseCurrency = settings?.currency || "USD";
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: bills,
    isLoading,
    error,
  } = useQuery<Bill[]>({
    queryKey: ["vendor_bills", searchTerm],
    queryFn: async () => {
      // Fetch bills and join with the supplier name
      let query = supabase.from("vendor_bills").select(`
        *,
        suppliers (name, vendor_code)
      `);

      if (searchTerm) {
        query = query.or(`bill_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("due_date", { ascending: true });

      if (error) {
        throw error;
      }
      return data as Bill[];
    },
  });

  const getStatusVariant = (status: Bill['status']) => {
    switch (status) {
      case 'Awaiting Payment':
        return 'destructive';
      case 'Partially Paid':
        return 'yellow'; // Assuming you have a custom yellow variant
      case 'Paid':
        return 'default';
      case 'Void':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getDueDateClass = (dueDate: string, status: Bill['status']) => {
    const now = new Date().getTime();
    const due = new Date(dueDate).getTime();
    if (status === 'Awaiting Payment' && due < now) {
      return "text-red-600 font-semibold";
    }
    return "";
  };


  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return <div className="text-destructive">Error loading bills: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" /> Vendor Bills
        </h1>
        <Button onClick={() => navigate("/accounting/bills/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Enter New Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts Payable Overview</CardTitle>
          <CardDescription>All received vendor bills and their payment status.</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bill number or vendor name..."
                className="pl-9 max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No vendor bills found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id} onClick={() => navigate(`/accounting/bills/${bill.id}`)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                    <TableCell>{bill.suppliers.name}</TableCell>
                    <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                    <TableCell className={getDueDateClass(bill.due_date, bill.status)}>
                        {new Date(bill.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bill.total_amount, bill.currency_code)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(bill.balance, bill.currency_code)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(bill.status)}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/accounting/bills/${bill.id}`); }}
                      >
                          <FileText className="w-4 h-4" />
                      </Button>
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

export default Bills;
