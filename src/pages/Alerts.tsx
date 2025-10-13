import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertsData } from "@/hooks/useAlertsData";

const Alerts = () => {
  const { outOfStock, lowStock, restockRecommendations, isLoading } = useAlertsData();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stock Alerts</h1>
        <p className="text-muted-foreground mt-1">Monitor items requiring attention</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : outOfStock.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No items out of stock</p>
            ) : (
              <div className="space-y-3">
                {outOfStock.map(item => (
                  <div key={item.id} className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku} • {item.category}</p>
                        <p className="text-sm text-muted-foreground mt-1">Location: {item.location || 'N/A'}</p>
                      </div>
                      <Badge variant="destructive">0 {item.unit}</Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-destructive/20">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Supplier:</span> {item.supplier || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <TrendingDown className="w-5 h-5" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : lowStock.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No low stock items</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map(item => (
                  <div key={item.id} className="p-4 border border-warning/20 rounded-lg bg-warning/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku} • {item.category}</p>
                        <p className="text-sm text-muted-foreground mt-1">Location: {item.location || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="warning">{item.quantity} {item.unit}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Min: {item.minStock}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-warning/20">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Supplier:</span> {item.supplier || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Restock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : restockRecommendations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No restock recommendations</p>
          ) : (
            <div className="space-y-4">
              {restockRecommendations.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {item.quantity} {item.unit} | Min Stock: {item.minStock} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      Order {item.recommendedOrder} {item.unit}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Est. Cost: ${item.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Alerts;
