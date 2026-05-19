import { useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '../types';
import { supabase } from '../lib/supabase';
import { mapNotification } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export function useNotifications(userId?: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifs = async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      setNotifications((data || []).map(mapNotification));
      setError(null);
    } catch (err) {
      console.error('useNotifications error:', err);
      setError(err as Error);

    } finally {
      setLoading(false);
    }
  };

  // Realtime — optimistic insert, refetch on update/delete
  const fetchRef = useRef(fetchNotifs);
  fetchRef.current = fetchNotifs;

  const handleRealtimeEvent = useCallback(
    (payload: any) => {
      const eventType = payload.eventType as string;

      if (eventType === 'INSERT' && payload.new) {

        setNotifications(prev => [mapNotification(payload.new), ...prev]);
        window.dispatchEvent(new Event('notifRead'));
      } else {

        fetchRef.current();
      }
    },
    [],
  );

  useRealtimeSubscription({
    table: 'notifications',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    channelName: `rt-notifications-${userId}`,
    onEvent: handleRealtimeEvent,
  });

  const markRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(new Event('notifRead'));
    } catch (err) {
      console.error('markRead error:', err);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      window.dispatchEvent(new Event('notifRead'));
    } catch (err) {
      console.error('markAllRead error:', err);
    }
  };

  const clearAll = async () => {
    if (!userId) return;
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      setNotifications([]);
      window.dispatchEvent(new Event('notifRead'));
    } catch (err) {
      console.error('clearAll error:', err);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [userId]);

  return { notifications, loading, error, refreshNotifications: fetchNotifs, markRead, markAllRead, clearAll };
}
