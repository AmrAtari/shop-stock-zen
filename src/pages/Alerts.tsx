import { useMemo } from "react";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockInventory } from "@/lib/mockData";

const Alerts = () => {
  const alerts = useMemo(() => {
    const outOfStock = mockInventory.filter(item => item.quantity === 0);
    const lowStock = mockInventory.filter(item => item.quantity > 0 && item.quantity <= item.minStock);
    
    return { outOfStock, lowStock };
  }, []);

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
            {alerts.outOfStock.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No items out of stock</p>
            ) : (
              <div className="space-y-3">
                {alerts.outOfStock.map(item => (
                  <div key={item.id} className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku} • {item.category}</p>
                        <p className="text-sm text-muted-foreground mt-1">Location: {item.location}</p>
                      </div>
                      <Badge variant="destructive">0 {item.unit}</Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-destructive/20">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Supplier:</span> {item.supplier}
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
            {alerts.lowStock.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No low stock items</p>
            ) : (
              <div className="space-y-3">
                {alerts.lowStock.map(item => (
                  <div key={item.id} className="p-4 border border-warning/20 rounded-lg bg-warning/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku} • {item.category}</p>
                        <p className="text-sm text-muted-foreground mt-1">Location: {item.location}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="warning">{item.quantity} {item.unit}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Min: {item.minStock}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-warning/20">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Supplier:</span> {item.supplier}
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
          <div className="space-y-4">
            {[...alerts.outOfStock, ...alerts.lowStock]
              .sort((a, b) => a.quantity - b.quantity)
              .map(item => {
                const recommendedOrder = Math.max(item.minStock * 2 - item.quantity, 0);
                const estimatedCost = recommendedOrder * item.costPrice;
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {item.quantity} {item.unit} | Min Stock: {item.minStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        Order {recommendedOrder} {item.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Est. Cost: ${estimatedCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Alerts;
