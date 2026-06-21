import { useState, useEffect, useCallback, useRef } from 'react';
import { PromoCode } from '../types';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';


export const usePromoCodes = (vendorId?: string) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPromoCodes = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      setPromoCodes(data || []);
      setError(null);
    } catch (err) {
      console.error('usePromoCodes error:', err);
      setError(err as Error);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, [vendorId]);

  // Realtime
  const fetchRef = useRef(fetchPromoCodes);
  fetchRef.current = fetchPromoCodes;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'promo_codes',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: vendorId ? `vendor_id=eq.${vendorId}` : undefined,
    channelName: `rt-promo-codes-${vendorId || 'all'}`,
    onEvent: handleEvent,
  });

  const refreshPromoCodes = async () => {
    await fetchPromoCodes();
  };

  return { promoCodes, isLoading, error, refreshPromoCodes };
};

// Settings cache (module-level, shared across instances)
const SETTINGS_CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: Record<string, any> | null;
  timestamp: number;
}

const settingsCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Record<string, any> | null>>();
const subscribers = new Map<string, Set<(data: Record<string, any> | null) => void>>();

async function fetchSettingFromDB(settingId: string): Promise<Record<string, any> | null> {
  const { data, error: dbErr } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('key', settingId)
    .limit(1);

  if (dbErr) throw dbErr;
  if (!data || data.length === 0) return null;
  return data[0]?.value || null;
}

async function fetchSettingCached(settingId: string): Promise<Record<string, any> | null> {
  // Deduplicate concurrent requests
  const existing = inflight.get(settingId);
  if (existing) return existing;

  const promise = fetchSettingFromDB(settingId)
    .then(result => {
      settingsCache.set(settingId, { data: result, timestamp: Date.now() });

      subscribers.get(settingId)?.forEach(cb => cb(result));
      return result;
    })
    .finally(() => {
      inflight.delete(settingId);
    });

  inflight.set(settingId, promise);
  return promise;
}

export const useGlobalSettings = (settingId: string) => {
  const cached = settingsCache.get(settingId);
  const [setting, setSetting] = useState<Record<string, any> | null>(cached?.data ?? null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Subscribe to cache updates
    if (!subscribers.has(settingId)) subscribers.set(settingId, new Set());
    const sub = (data: Record<string, any> | null) => {
      if (mounted) setSetting(data);
    };
    subscribers.get(settingId)!.add(sub);

    const cachedEntry = settingsCache.get(settingId);
    const isFresh = cachedEntry && (Date.now() - cachedEntry.timestamp < SETTINGS_CACHE_TTL);

    if (cachedEntry) {
      setSetting(cachedEntry.data);
      setIsLoading(false);

      if (!isFresh) {
        // Stale — background revalidate
        fetchSettingCached(settingId).catch(err => {
          if (mounted) setError(err as Error);
        });
      }
    } else {
      setIsLoading(true);
      fetchSettingCached(settingId)
        .then(result => {
          if (mounted) {
            setSetting(result);
            setError(null);
          }
        })
        .catch(err => {
          if (mounted) setError(err as Error);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    }

    return () => {
      mounted = false;
      subscribers.get(settingId)?.delete(sub);
    };
  }, [settingId]);
  // Realtime invalidation
  const handleRealtimeEvent = useCallback((payload: any) => {
    if (payload.new && payload.new.value !== undefined) {
      settingsCache.set(settingId, { data: payload.new.value, timestamp: Date.now() });
      setSetting(payload.new.value);
      subscribers.get(settingId)?.forEach(cb => cb(payload.new.value));
    } else {
      settingsCache.delete(settingId);
      fetchSettingCached(settingId).catch(err => console.error('Settings RT refresh error:', err));
    }
  }, [settingId]);

  useRealtimeSubscription({
    table: 'platform_settings',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: `key=eq.${settingId}`,
    channelName: `rt-settings-${settingId}`,
    onEvent: handleRealtimeEvent,
  });

  const updateSetting = async (value: Record<string, any>) => {
    try {

      settingsCache.set(settingId, { data: value, timestamp: Date.now() });
      setSetting(value);
      subscribers.get(settingId)?.forEach(cb => cb(value));

      const { error: dbErr } = await supabase
        .from('platform_settings')
        .upsert(
          { key: settingId, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (dbErr) throw dbErr;
      return true;
    } catch (err) {
      console.error('updateSetting error:', err);

      fetchSettingCached(settingId).catch(() => {});
      return false;
    }
  };

  return { setting, isLoading, error, updateSetting };
};
