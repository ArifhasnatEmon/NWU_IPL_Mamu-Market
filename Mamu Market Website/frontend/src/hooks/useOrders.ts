import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Order } from '../types';
import { supabase } from '../lib/supabase';
import { mapOrder } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';

const CACHE_TTL_MS = 30_000; // 30 seconds

function isCacheValid(tsKey: string): boolean {
  try {
    const ts = localStorage.getItem(tsKey);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

export function useOrders(user?: User | null) {
  const cacheKey = `mm_orders_${user?.id}`;
  const tsKey    = `mm_orders_${user?.id}_ts`;

  // Only seed from cache when the TTL is still valid — prevents cross-session
  // stale flash when a different user logs in after logout.
  const cacheValid = user?.id ? isCacheValid(tsKey) : false;

  const [orders, setOrders] = useState<Order[]>(() => {
    if (!user?.id || !cacheValid) return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  // Always show loading when there is no valid cache so the UI never
  // silently displays stale data while a background fetch is in flight.
  const [loading, setLoading] = useState<boolean>(
    !!user?.id && !cacheValid
  );

  const [error, setError] = useState<Error | null>(null);

  // abortedRef prevents a response from a superseded fetch (e.g. fired
  // just before logout) from writing into localStorage after keys were cleared.
  const abortedRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    abortedRef.current = false;

    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Role-based filter
      if (user.role === 'admin') {
        // no filter — fetch all
      } else if (user.role === 'vendor') {
        query = query.or(`vendor_id.eq.${user.id},user_id.eq.${user.id}`);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error: dbErr } = await query;

      if (dbErr) throw dbErr;

      const mapped = (data || []).map(mapOrder);

      if (!abortedRef.current) {
        setOrders(mapped);
        // Write back to cache only while still active (not post-logout)
        try {
          localStorage.setItem(cacheKey, JSON.stringify(mapped));
          localStorage.setItem(tsKey, String(Date.now()));
        } catch {}
        setError(null);
      }
    } catch (err) {
      console.error('useOrders error:', err);
      if (!abortedRef.current) setError(err as Error);
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [user?.id, user?.role, cacheKey, tsKey]);

  useEffect(() => {
    abortedRef.current = false;
    fetchOrders();

    return () => {
      // Mark any in-flight fetch as aborted so it won't write to state or storage
      abortedRef.current = true;
    };
  }, [fetchOrders]);

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

  return { orders, loading, error, refreshOrders: fetchOrders };
}
