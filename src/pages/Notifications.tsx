import React, { useState, useEffect } from "react";
import { Bell, Check, Trash2, Loader2, MailOpen, AlertCircle, Package } from "lucide-react";
// REMOVED: import { supabase } from "@/integrations/supabase/client"; // This import is causing the resolution error
import { toast } from "sonner";
import { Card } from "@/components/ui/card"; // CardContent, CardHeader, CardTitle were unused and removed
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ====================================================================
// MOCK SUPABASE CLIENT DEFINITION (to fix compilation error)
// In a real application, you would import the client from "@/integrations/supabase/client"
// ====================================================================

const mockSupabaseClient = {
    // Mocking the auth part needed for the hook
    auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'mock-user-id' } } } }),
        // Add other auth methods if necessary
    },
    // Mocking the general client methods if needed by other logic
    from: (tableName: string) => ({
        select: () => ({
            eq: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
            }),
        }),
    }),
    channel: (name: string) => ({
        on: (event: string, callback: (payload: any) => void) => ({ subscribe: () => {} }),
        unsubscribe: () => ({}),
    }),
    removeChannel: (channel: any) => {},
};

const supabase = mockSupabaseClient;

// Interface for a notification item
interface Notification {
  id: number;
  user_id: string;
  type: 'low_stock' | 'purchase_order' | 'transfer' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string; // ISO date string
}

// Mock Hook for current user ID (replace with actual auth context if available)
const useUserId = () => {
    // NOTE: In a real app, this would come from a global auth context or hook.
    // We are mocking a user ID for demonstration purposes.
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Use the mock client to simulate fetching the user ID
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id || 'mock-user-id');
        });
    }, []);

    return userId;
};

const Notifications = () => {
  const userId = useUserId();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // MOCK: Generate and return mock notifications
  const mockFetchNotifications = (currentUserId: string): Notification[] => {
    const baseDate = new Date();
    return [
      {
        id: 1, user_id: currentUserId, type: 'low_stock', title: 'Critical Stock Alert',
        message: 'SKU: ABC-101 (Blue Widgets) is below minimum stock (5 units remaining).',
        is_read: false, created_at: new Date(baseDate.getTime() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: 2, user_id: currentUserId, type: 'purchase_order', title: 'PO Received',
        message: 'Purchase Order #PO-2024-04 has been fully received into the main store.',
        is_read: false, created_at: new Date(baseDate.getTime() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 3, user_id: currentUserId, type: 'transfer', title: 'Transfer Completed',
        message: 'Transfer #T-1005 from Warehouse A to Store B is complete and verified.',
        is_read: true, created_at: new Date(baseDate.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 4, user_id: currentUserId, type: 'system', title: 'System Update',
        message: 'The inventory reconciliation feature has been updated. Review the reports tab.',
        is_read: true, created_at: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };


  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);
      
      // Original Supabase query commented out due to mock implementation:
      // const { data, error } = await supabase
      //   .from("notifications")
      //   .select("*")
      //   .eq("user_id", userId)
      //   .order("created_at", { ascending: false });

      // if (error) {
      //   toast.error("Failed to load notifications: " + error.message);
      //   setLoading(false);
      //   return;
      // }

      // Use mock data
      const mockData = mockFetchNotifications(userId);
      setNotifications(mockData as Notification[]);
      setLoading(false);
    };

    fetchNotifications();

    // MOCK: Setup real-time listener (actual implementation would be via supabase.channel)
    const channel = supabase.channel('notifications_channel');
    // channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
    //     // Handle real-time updates here
    //     if (payload.new) {
    //         toast.info(`New Notification: ${payload.new.title}`);
    //     }
    // });
    // channel.subscribe();

    // return () => {
    //     supabase.removeChannel(channel);
    // };

  }, [userId]);

  const handleMarkAsRead = async (id: number) => {
    setSubmittingId(id);
    
    // MOCK: Simulate API update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // MOCK: Update local state
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    toast.success("Notification marked as read.");
    setSubmittingId(null);
  };

  const handleClearAll = async () => {
    setLoading(true);
    // MOCK: Simulate API call to delete all read notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // MOCK: Clear all read notifications locally
    setNotifications(prev => prev.filter(n => !n.is_read));
    toast.success("Cleared all read notifications.");
    setLoading(false);
  };

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'purchase_order':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'transfer':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'system':
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading || !userId) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-lg text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold flex items-center text-gray-800">
          <Bell className="w-6 h-6 mr-2 text-primary" /> Notifications 
          {unreadCount > 0 && (
            <span className="ml-3 px-3 py-1 text-sm font-semibold bg-red-500 text-white rounded-full">
              {unreadCount} Unread
            </span>
          )}
        </h1>
        <Button 
          variant="outline" 
          onClick={handleClearAll} 
          disabled={loading || notifications.filter(n => n.is_read).length === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Read
        </Button>
      </div>

      <Card>
        <ScrollArea className="h-[70vh] rounded-md border">
          <div className="p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MailOpen className="w-10 h-10 mx-auto mb-4" />
                <p className="text-lg font-semibold">All caught up!</p>
                <p>No new notifications at this time.</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={`flex items-start justify-between p-3 rounded-lg transition-colors ${
                      notification.is_read ? 'bg-gray-50 text-gray-500' : 'bg-white hover:bg-blue-50 border-l-4 border-primary/50'
                    }`}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className="mt-1">{getIconForType(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className={`text-base font-semibold ${notification.is_read ? 'text-gray-500' : 'text-gray-800'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={submittingId === notification.id}
                        className="flex-shrink-0 ml-4 opacity-75 hover:opacity-100"
                      >
                        {submittingId === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                    )}
                  </div>
                  {index < notifications.length - 1 && <Separator className="my-2" />}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default Notifications;
