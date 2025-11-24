import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, DollarSign, Calendar, Clock } from "lucide-react";
import {
  useAccountsPayable,
  useCreateBill,
  useUpdateBill,
  useRecordPayment,
  useBillPayments,
  VendorBill,
} from "@/hooks/useAccountsPayable";
import { BillDialog } from "@/components/accounting/BillDialog";
import { PaymentDialog } from "@/components/accounting/PaymentDialog";
import { VendorAgingReport } from "@/components/accounting/VendorAgingReport";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { format } from "date-fns";

const AccountsPayable = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const { formatCurrency } = useSystemSettings();

  const { data: bills, isLoading } = useAccountsPayable(statusFilter);
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const recordPayment = useRecordPayment();

  const filteredBills = bills?.filter((bill) =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateBill = (data: Partial<VendorBill>) => {
    createBill.mutate(data);
  };

  const handleUpdateBill = (data: Partial<VendorBill>) => {
    if (selectedBill) {
      updateBill.mutate({ id: selectedBill.id, updates: data });
    }
  };

  const handleRecordPayment = (data: any) => {
    recordPayment.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      approved: "default",
      partial: "secondary",
      paid: "default",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const summary = {
    total: bills?.reduce((sum, bill) => sum + bill.balance, 0) || 0,
    overdue: bills?.filter((b) => b.status === "overdue").reduce((sum, bill) => sum + bill.balance, 0) || 0,
    dueThisWeek: bills?.filter((b) => {
      const dueDate = new Date(b.due_date);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate <= weekFromNow && b.status !== "paid";
    }).reduce((sum, bill) => sum + bill.balance, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounts Payable</h1>
        <Button onClick={() => { setSelectedBill(null); setBillDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.overdue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.dueThisWeek)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">All Bills</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="partial">Partial</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value={statusFilter} className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Bill Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills?.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                        <TableCell>{bill.supplier?.name}</TableCell>
                        <TableCell>{format(new Date(bill.bill_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(bill.due_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bill.total_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bill.paid_amount)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(bill.balance)}</TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBill(bill);
                                setBillDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            {bill.balance > 0 && bill.status !== "paid" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentDialogOpen(true);
                                }}
                              >
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!isLoading && filteredBills?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No bills found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <VendorAgingReport />

      <BillDialog
        open={billDialogOpen}
        onOpenChange={setBillDialogOpen}
        bill={selectedBill}
        onSubmit={selectedBill ? handleUpdateBill : handleCreateBill}
      />

      {selectedBill && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          bill={selectedBill}
          onSubmit={handleRecordPayment}
        />
      )}
    </div>
  );
};

export default AccountsPayable;
