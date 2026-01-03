import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Package, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StoreMetrics {
  storeId?: string;
  storeName: string;
  totalItems: number;
  inventoryValue: number;
  lowStockCount: number;
}

interface StoreOverviewCardProps {
  stores: StoreMetrics[];
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}

const StoreOverviewCard = ({ stores, isLoading, formatCurrency }: StoreOverviewCardProps) => {
  const navigate = useNavigate();

  // Filter out unspecified stores for display, show top 4
  const displayStores = stores
    .filter(s => s.storeName !== "(Non-Specified Store)")
    .slice(0, 4);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Store Performance
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/stores")}
            className="text-xs"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayStores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No stores found</p>
          </div>
        ) : (
          displayStores.map((store, idx) => (
            <div
              key={store.storeId || idx}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
              onClick={() => navigate(`/stores`)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                  idx === 0 && "bg-primary/10 text-primary",
                  idx === 1 && "bg-success/10 text-success",
                  idx === 2 && "bg-warning/10 text-warning",
                  idx >= 3 && "bg-muted text-muted-foreground"
                )}>
                  {store.storeName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{store.storeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {store.totalItems.toLocaleString()} items
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{formatCurrency(store.inventoryValue)}</p>
                {store.lowStockCount > 0 && (
                  <p className="text-xs text-warning flex items-center justify-end gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {store.lowStockCount} low
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default StoreOverviewCard;