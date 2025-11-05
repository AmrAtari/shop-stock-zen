import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AccountsReceivable = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounts Receivable</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Accounts Receivable management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsReceivable;
