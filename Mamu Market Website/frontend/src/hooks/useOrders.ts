import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Order } from '../types';
import { supabase } from '../lib/supabase';
import { mapOrder } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export function useOrders(user?: User | null) {
  const cacheKey = `mm_orders_${user?.id}`;
  const [orders, setOrders] = useState<Order[]>(() => {
    if (!user?.id) return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (!user?.id) return false;
    return !localStorage.getItem(cacheKey);
  });
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = async () => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    if (orders.length === 0) setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      // Role-based filter
      if (user.role === 'admin') {
      } else if (user.role === 'vendor') {
        query = query.or(`vendor_id.eq.${user.id},user_id.eq.${user.id}`);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error: dbErr } = await query;

      if (dbErr) throw dbErr;

      const mapped = (data || []).map(mapOrder);
      setOrders(mapped);
      localStorage.setItem(cacheKey, JSON.stringify(mapped));
      setError(null);
    } catch (err) {
      console.error('useOrders error:', err);
      setError(err as Error);

    } finally {
      setLoading(false);
    }
  };

  // Realtime
  const fetchRef = useRef(fetchOrders);
  fetchRef.current = fetchOrders;

  const handleRealtimeEvent = useCallback(() => {
    fetchRef.current();
  }, []);

  const rtFilter =
    user?.role === 'customer' ? `user_id=eq.${user.id}` : undefined;

  useRealtimeSubscription({
    table: 'orders',
    events: ['INSERT', 'UPDATE'],
    filter: rtFilter,
    enabled: !!user?.id,
    channelName: `rt-orders-${user?.id}-${user?.role}`,
    onEvent: handleRealtimeEvent,
  });

  useEffect(() => {
    fetchOrders();
  }, [user?.id, user?.role]);

  return { orders, loading, error, refreshOrders: fetchOrders };
}
