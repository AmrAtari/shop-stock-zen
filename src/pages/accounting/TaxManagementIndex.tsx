import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MapPin, Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TaxManagementIndex = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tax Management</h1>
        <Link to="/accounting">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <p className="text-lg text-muted-foreground">
        Configure tax rates, manage jurisdictional rules, and ensure compliance for all transactions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Tax Rates & Configuration */}
        <Link to="/accounting/tax/rates">
          <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
            <CardHeader>
              <Settings className="w-8 h-8 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <CardTitle className="text-xl mb-1">Tax Rates</CardTitle>
              <CardDescription>
                Define, edit, and manage all your tax percentages, types (Sales, VAT, etc.), and their associated rules.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Tax Jurisdictions (Taxes based on location) */}
        <Link to="/accounting/tax/jurisdictions">
          <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
            <CardHeader>
              <MapPin className="w-8 h-8 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <CardTitle className="text-xl mb-1">Tax Jurisdictions</CardTitle>
              <CardDescription>
                Set up location-specific tax rules (e.g., State/Province/City taxes) and link them to defined Tax Rates.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        
        {/* Placeholder for future features like Tax Reporting */}
        <Card className="opacity-60 cursor-not-allowed h-full">
            <CardHeader>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <CardTitle className="text-xl mb-1">Tax Reporting</CardTitle>
              <CardDescription>
                (Coming Soon) Generate required tax reports (e.g., Sales Tax Summary, VAT returns).
              </CardDescription>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default TaxManagementIndex;
