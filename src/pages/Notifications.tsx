// src/pages/Notifications.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, MailOpen, Check } from "lucide-react";

interface Notification {
  id: string;
  type: "purchase_order" | "transfer" | "low_stock" | "system";
  title: string;
  description: string;
  link: string;
  created_at: string;
  is_read: boolean;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_approvals" as any)
        .select(`id, user_id, type, title, message, is_read, created_at, reference_id`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB data to the strict Notification interface with proper type handling
      const mappedNotifications: Notification[] = ((data || []) as any[]).map((item) => {
        let linkPath = "";

        // Safely cast the 'type: string' from DB to the strict union type
        const notificationType: Notification["type"] =
          item.type === "purchase_order" || item.type === "transfer" || item.type === "low_stock"
            ? (item.type as Notification["type"])
            : "system";

        switch (notificationType) {
          case "purchase_order":
            linkPath = `/purchase-orders/${item.reference_id}/edit`;
            break;
          case "transfer":
            linkPath = `/transfers/${item.reference_id}`;
            break;
          case "low_stock":
            linkPath = `/alerts?item=${item.reference_id}`;
            break;
          default:
            linkPath = "/approvals";
        }

        return {
          id: String(item.id),
          type: notificationType,
          title: item.title,
          description: item.message, // Use 'message' from DB for 'description'
          link: linkPath,
          created_at: item.created_at,
          is_read: item.is_read,
        };
      });

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error("Error fetching notification list:", error);
      toast.error("Failed to load full notifications list.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("inventory_approvals" as any)
        .update({ is_read: true } as any)
        .eq("id", id);

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Failed to mark notification as read.");
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    navigate(notif.link);
  };

  useEffect(() => {
    fetchAllNotifications();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Pending Approvals & Notifications</h1>
      <p className="text-muted-foreground">Actionable items and alerts requiring your attention.</p>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({notifications.length} Total)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No current approvals or notifications.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    notif.is_read ? "bg-muted/30 text-muted-foreground" : "bg-card hover:bg-muted/50 cursor-pointer"
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {notif.type === "low_stock" && <AlertTriangle className="w-4 h-4 text-warning" />}
                      <p
                        className={`font-semibold text-base truncate ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}
                      >
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-sm">{notif.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {!notif.is_read ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                      >
                        <MailOpen className="w-4 h-4 mr-1" /> Mark Read
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>
                        <Check className="w-4 h-4 mr-1 text-success" /> Read
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="ml-2">
                      View <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
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

export default Notifications;
