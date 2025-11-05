import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AccountsPayable = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounts Payable</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Accounts Payable management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsPayable;
