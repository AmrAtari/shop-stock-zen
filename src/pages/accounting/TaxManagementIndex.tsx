import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MapPin, Settings, ArrowLeft, FileText } from "lucide-react";
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
        Configure tax rates, manage jurisdictional rules, and define the global policy for your ERP system.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Tax Rates & Configuration (Links to /accounting/tax/rates) */}
        <Link to="/accounting/tax/rates">
          <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
            <CardHeader>
              <FileText className="w-8 h-8 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <CardTitle className="text-xl mb-1">Tax Rates</CardTitle>
              <CardDescription>
                Define, edit, and manage all your tax percentages, types (Sales, VAT, etc.), and their associated GL
                accounts.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Tax Jurisdictions (Links to /accounting/tax/jurisdictions) */}
        <Link to="/accounting/tax/jurisdictions">
          <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
            <CardHeader>
              <MapPin className="w-8 h-8 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <CardTitle className="text-xl mb-1">Tax Jurisdictions</CardTitle>
              <CardDescription>
                Set up location-specific tax rules (State/Province/City taxes) and link them to defined Tax Rates.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Global Tax Settings (NEW: Links to /accounting/tax/settings) */}
        <Link to="/accounting/tax/settings">
          <Card className="hover:bg-accent cursor-pointer transition-colors h-full">
            <CardHeader>
              <Settings className="w-8 h-8 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <CardTitle className="text-xl mb-1">Global Settings</CardTitle>
              <CardDescription>
                Configure the Tax Determination Policy (Origin/Destination), fallback rates, and legal tax labels.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default TaxManagementIndex;
