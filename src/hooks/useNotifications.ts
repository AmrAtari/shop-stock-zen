import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "./useIsAdmin";

export interface Notification {
  id: string;
  type: "purchase_order" | "transfer" | "low_stock" | "system";
  title: string;
  description: string;
  link: string;
  created_at: string;
  is_read?: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useIsAdmin();

  const fetchNotifications = async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Try multiple approaches to get notifications
      const notifications = await fetchFromMultipleSources();
      setNotifications(notifications);
      setPendingCount(notifications.length);
      
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setPendingCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFromMultipleSources = async (): Promise<Notification[]> => {
    const allNotifications: Notification[] = [];

    try {
      // Approach 1: Check if inventory_approvals table exists
      const { data: approvals, error: approvalsError } = await supabase
        .from("inventory_approvals")
        .select("*")
        .eq("status", "pending")
        .limit(10);

      if (!approvalsError && approvals) {
        const mapped = approvals.map((item: any) => ({
          id: item.id,
          type: (item.type as Notification["type"]) || "system",
          title: item.title || `Pending ${item.type}`,
          description: item.description || `Action required for ${item.type}`,
          link: getNotificationLink(item.type, item.reference_id),
          created_at: item.created_at,
          is_read: item.is_read || false,
        }));
        allNotifications.push(...mapped);
      }

      // Approach 2: Check for low stock items directly
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, min_stock")
        .lte("quantity", supabase.raw("min_stock"))
        .limit(5);

      if (!lowStockError && lowStockItems) {
        const lowStockNotifications: Notification[] = lowStockItems.map(item => ({
          id: `low-stock-${item.id}`,
          type: "low_stock",
          title: "Low Stock Alert",
          description: `${item.name} is below minimum stock level`,
          link: `/inventory?item=${item.id}`,
          created_at: new Date().toISOString(),
        }));
        allNotifications.push(...lowStockNotifications);
      }

    } catch (error) {
      console.error("Error in multi-source fetch:", error);
    }

    return allNotifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const getNotificationLink = (type: string, referenceId: string): string => {
    switch (type) {
      case "purchase_order":
        return `/purchase-orders/${referenceId}`;
      case "transfer":
        return `/transfers/${referenceId}`;
      case "low_stock":
        return `/inventory?alert=${referenceId}`;
      default:
        return "/approvals";
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // If it's from inventory_approvals table
      if (!notificationId.startsWith('low-stock-')) {
        await supabase
          .from("inventory_approvals")
          .update({ is_read: true })
          .eq("id", notificationId);
      }
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_approvals' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdmin]);

  return {
    notifications,
    pendingCount,
    isLoading,
    markAsRead,
    refreshNotifications: fetchNotifications,
  };
};
