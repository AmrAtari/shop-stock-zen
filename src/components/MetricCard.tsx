import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "success" | "info";
  subtitle?: string;
  onClick?: () => void;
}

const MetricCard = ({ title, value, icon, trend, variant = "default", subtitle, onClick }: MetricCardProps) => {
  const variantStyles = {
    default: {
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      gradient: "from-primary/5 to-transparent",
    },
    warning: {
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      gradient: "from-warning/5 to-transparent",
    },
    success: {
      iconBg: "bg-success/10",
      iconColor: "text-success",
      gradient: "from-success/5 to-transparent",
    },
    info: {
      iconBg: "bg-accent/10",
      iconColor: "text-accent-foreground",
      gradient: "from-accent/5 to-transparent",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Subtle gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", styles.gradient)} />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                  trend.isPositive 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {trend.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          <div className={cn(
            "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
            styles.iconBg,
            styles.iconColor
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
