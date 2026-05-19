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

export function useRealtimeSubscription(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);


  const onEventRef = useRef(config.onEvent);
  onEventRef.current = config.onEvent;

  const stableCallback = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => onEventRef.current(payload),
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
