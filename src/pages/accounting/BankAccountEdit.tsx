import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const BankAccountEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { settings } = useSystemSettings();
  const currency = settings?.currency || "USD";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/accounting/bank-accounts/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Bank Account</h1>
          <p className="text-muted-foreground">Update bank account details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Bank Account</CardTitle>
          <CardDescription>Update the information for this bank account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" defaultValue="Bank Of Palestine" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Input id="accountType" defaultValue="Business Checking" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" defaultValue="Primary business checking account" />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" onClick={() => navigate(`/accounting/bank-accounts/${id}`)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccountEdit;
