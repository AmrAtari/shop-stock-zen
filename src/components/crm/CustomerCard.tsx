import { Customer } from "@/hooks/useCustomers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2 } from "lucide-react";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
}

const CustomerCard = ({ customer, onClick }: CustomerCardProps) => {
  const { formatCurrency } = useSystemSettings();

  return (
    <Card
      className={`transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{customer.name}</h3>
            {customer.company_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {customer.company_name}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="capitalize text-xs">
              {customer.customer_type}
            </Badge>
            <Badge
              variant={customer.status === "active" ? "default" : "secondary"}
              className="capitalize text-xs"
            >
              {customer.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-3 h-3" />
              {customer.email}
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              {customer.phone}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Credit Limit</p>
            <p className="font-medium">{formatCurrency(customer.credit_limit)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p
              className={`font-medium ${
                customer.outstanding_balance > 0 ? "text-warning" : "text-success"
              }`}
            >
              {formatCurrency(customer.outstanding_balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
