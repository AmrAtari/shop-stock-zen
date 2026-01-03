import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  ChevronRight, 
  Package, 
  ArrowRightLeft, 
  FileText,
  ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "purchase_order" | "transfer" | "pos_transaction" | "inventory";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

const RecentActivityCard = () => {
  const navigate = useNavigate();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const results: ActivityItem[] = [];

      // Fetch recent POs
      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("id, po_number, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      pos?.forEach(po => {
        results.push({
          id: po.id,
          type: "purchase_order",
          title: `PO ${po.po_number}`,
          description: po.status || "Created",
          timestamp: po.created_at,
          status: po.status,
        });
      });

      // Fetch recent transfers
      const { data: transfers } = await supabase
        .from("transfers")
        .select("id, transfer_number, status, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      transfers?.forEach(transfer => {
        results.push({
          id: transfer.id,
          type: "transfer",
          title: `Transfer ${transfer.transfer_number}`,
          description: transfer.status || "Created",
          timestamp: transfer.created_at,
          status: transfer.status,
        });
      });

      // Sort by timestamp
      return results.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 5);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "purchase_order":
        return <FileText className="w-4 h-4" />;
      case "transfer":
        return <ArrowRightLeft className="w-4 h-4" />;
      case "pos_transaction":
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "received":
        return "bg-success/10 text-success";
      case "pending":
      case "draft":
        return "bg-warning/10 text-warning";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const handleClick = (activity: ActivityItem) => {
    switch (activity.type) {
      case "purchase_order":
        navigate(`/purchase-orders/${activity.id}`);
        break;
      case "transfer":
        navigate(`/transfers/${activity.id}`);
        break;
      default:
        break;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/audit-log")}
            className="text-xs"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleClick(activity)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(activity.status)}`}>
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(activity.status)}`}>
                {activity.status || "new"}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;