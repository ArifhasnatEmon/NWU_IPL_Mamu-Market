import { useState, useEffect, useCallback, useRef } from 'react';
import { Vendor } from '../types';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export const useVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {

      const { data, error: dbErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendor');



      if (dbErr) {
        console.error('DB Error:', dbErr);
        setError(dbErr as unknown as Error);

        setLoading(false);
        return;
      }

      const dbVendors: Vendor[] = (data || []).map(row => ({
        id: row.id,
        name: row.store_name || row.name || '',
        storeName: row.store_name || '',
        storeDescription: row.store_description || '',
        storeCategory: row.store_category || '',
        storeCity: row.store_city || '',
        avatar: row.avatar || '',
        logo: row.avatar || '',
        banner: row.banner || '',
        verified: row.verified || false,
        email: row.email || '',
        phone: row.phone || '',
        category: row.store_category || '',
        rating: row.rating || 0,
        productsCount: 0,
        totalProducts: 0,
        totalSales: 0,
        joinedDate: row.created_at || '',
        description: row.store_description || '',
        socialFacebook: row.social_facebook || '',
        socialInstagram: row.social_instagram || '',
        socialYoutube: row.social_youtube || '',
        socialWhatsapp: row.social_whatsapp || '',
      }));

      setVendors(dbVendors);
      setError(null);
    } catch (err) {
      console.error('useVendors error:', err);
      setError(err as Error);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Realtime
  const fetchRef = useRef(fetchVendors);
  fetchRef.current = fetchVendors;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'profiles',
    events: ['UPDATE'],
    filter: 'role=eq.vendor',
    channelName: 'rt-vendors-profiles',
    onEvent: handleEvent,
  });

  return { vendors, loading, error, refresh: fetchVendors };
};
