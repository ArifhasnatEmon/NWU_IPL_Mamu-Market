import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface SubscriptionConfig {
  table: string;
  events?: PostgresEvent[];
  filter?: string;
  onEvent: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
  channelName: string;
}

/**
 * Throttle wrapper – fires at most once every `delay` ms.
 * The trailing call is always invoked so the latest event is never lost.
 */
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;

  const throttled = (...args: any[]) => {
    lastArgs = args;
    if (timer) return;               // already scheduled
    fn(...args);                      // fire immediately
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);  // trailing edge
      lastArgs = null;
    }, delay);
  };

  return throttled as unknown as T;
}

export function useRealtimeSubscription(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const onEventRef = useRef(config.onEvent);
  onEventRef.current = config.onEvent;

  // Throttle the callback so rapid-fire events (e.g. bulk inserts) don't
  // cause an avalanche of re-fetches that starve the connection pool.
  const stableCallback = useCallback(
    throttle(
      (payload: RealtimePostgresChangesPayload<any>) => onEventRef.current(payload),
      2000,  // at most one re-fetch every 2 seconds per channel
    ),
    [],
  );

  useEffect(() => {
    if (config.enabled === false) return;

    // Remove any pre-existing channel with this name to avoid
    // "cannot add postgres_changes callbacks after subscribe()" errors.
    // Supabase caches channels by name, so re-mounts (React Strict Mode,
    // error recovery) would otherwise get back the already-subscribed instance.
    const existing = supabase.getChannels().find(ch => ch.topic === `realtime:${config.channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const events: PostgresEvent[] = config.events || ['INSERT', 'UPDATE', 'DELETE'];

    let channel = supabase.channel(config.channelName);

    for (const event of events) {
      const opts: Record<string, string> = {
        event,
        schema: 'public',
        table: config.table,
      };
      if (config.filter) opts.filter = config.filter;

      channel = channel.on('postgres_changes', opts as any, stableCallback);
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.debug(`[Realtime] Subscribed: ${config.channelName}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [config.table, config.filter, config.enabled, config.channelName, stableCallback]);
}
