// src/hooks/useNotifications.ts

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
    try {
      setIsLoading(true);
      
      // First, check and create low stock notifications
      try {
        await supabase.rpc('check_low_stock_notifications');
      } catch (error) {
        console.log("Could not check low stock notifications:", error);
      }

      // Fetch notifications from the database
      const { data: notificationData, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (notificationsError) {
        console.error("Error fetching notifications:", notificationsError);
        setNotifications([]);
        setPendingCount(0);
        return;
      }

      const mappedNotifications: Notification[] = (notificationData || []).map((item: any) => ({
        id: String(item.id),
        type: item.type as Notification["type"],
        title: item.title,
        description: item.message,
        link: item.link,
        created_at: item.created_at,
        is_read: item.is_read,
      }));

      setNotifications(mappedNotifications);
      setPendingCount(mappedNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setPendingCount(0);
    } finally {
      setIsLoading(false);
    }
  };


  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    notifications,
    pendingCount,
    isLoading,
    markAsRead,
    refreshNotifications: fetchNotifications,
  };
};
