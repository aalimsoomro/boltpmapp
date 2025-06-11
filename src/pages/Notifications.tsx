import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  user_id: string; // The user who receives the notification
  message: string;
  read: boolean;
  created_at: string;
  link?: string; // Optional link to related item (e.g., project detail)
}

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications(user.id);
    }
  }, [user, authLoading]);

  const fetchNotifications = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId) // Fetch notifications for the current user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load notifications.',
      });
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));

    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to mark notification as read.',
      });
    }
  };

  const markAllAsRead = async () => {
     if (!user) return;
     try {
       const { data, error } = await supabase
         .from('notifications')
         .update({ read: true })
         .eq('user_id', user.id)
         .eq('read', false); // Only update unread ones

       if (error) throw error;

       // Update local state
       setNotifications(notifications.map(n => ({ ...n, read: true })));

       toast({
         title: 'Success',
         description: 'All notifications marked as read.',
       });

     } catch (error: any) {
       console.error('Error marking all notifications as read:', error);
       toast({
         variant: 'destructive',
         title: 'Error',
         description: error.message || 'Failed to mark all notifications as read.',
       });
     }
   };


  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Notifications</h1>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Your Alerts</CardTitle>
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={notifications.every(n => n.read)}>Mark All as Read</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading notifications...</div>
          ) : (
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground">No notifications yet.</p>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`border rounded-md p-4 ${notification.read ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-950'} flex justify-between items-start`}
                  >
                    <div>
                      <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'font-semibold text-gray-900 dark:text-gray-100'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                       {notification.link && (
                         <Button variant="link" className="p-0 h-auto text-xs mt-1" onClick={() => {
                            markAsRead(notification.id); // Mark as read when clicking link
                            window.location.href = notification.link!; // Navigate
                         }}>
                           View Details
                         </Button>
                       )}
                    </div>
                    {!notification.read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                        Mark as Read
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
