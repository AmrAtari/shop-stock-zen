import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  FileText, 
  Package, 
  ShoppingCart, 
  ArrowRightLeft,
  Users,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const QuickActions = () => {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      label: "New PO",
      icon: <Plus className="w-4 h-4" />,
      path: "/purchase-orders/new",
      color: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
    {
      label: "Inventory",
      icon: <Package className="w-4 h-4" />,
      path: "/inventory",
      color: "bg-success hover:bg-success/90 text-success-foreground",
    },
    {
      label: "POS",
      icon: <ShoppingCart className="w-4 h-4" />,
      path: "/pos",
      color: "bg-accent hover:bg-accent/90 text-accent-foreground",
    },
    {
      label: "Transfers",
      icon: <ArrowRightLeft className="w-4 h-4" />,
      path: "/transfers",
      color: "bg-warning hover:bg-warning/90 text-warning-foreground",
    },
    {
      label: "Customers",
      icon: <Users className="w-4 h-4" />,
      path: "/crm/customers",
      color: "bg-chart-4 hover:bg-chart-4/90 text-white",
    },
    {
      label: "Reports",
      icon: <BarChart3 className="w-4 h-4" />,
      path: "/reports",
      color: "bg-chart-5 hover:bg-chart-5/90 text-white",
    },
  ];

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground mr-2">Quick Actions:</span>
          {actions.map((action) => (
            <Button
              key={action.path}
              size="sm"
              className={`${action.color} shadow-sm gap-1.5 transition-transform hover:scale-105`}
              onClick={() => navigate(action.path)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;