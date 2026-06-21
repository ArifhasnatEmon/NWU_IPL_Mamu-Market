import { useState, useEffect, useCallback, useRef } from 'react';
import { Review } from '../types';
import { supabase } from '../lib/supabase';
import { mapReview } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface ReviewFilters {
  productId?: string;
  vendorId?: string;
  reportedOnly?: boolean;
}

export function useReviews(filters?: ReviewFilters) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }


      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      let mapped = (data || []).map(r => mapReview(r as any));


      if (filters?.vendorId && !filters?.productId) {
        const { data: vendorProducts } = await supabase
          .from('products')
          .select('id')
          .eq('vendor_id', filters.vendorId);

        const vendorProductIds = new Set((vendorProducts || []).map(p => p.id));
        mapped = mapped.filter(r => r.productId && vendorProductIds.has(r.productId));
      }

      // Enrich reviews with latest user profiles (name & avatar)
      const uniqueUserIds = Array.from(new Set(mapped.map(r => r.userId).filter(Boolean)));
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar')
          .in('id', uniqueUserIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          mapped = mapped.map(r => {
            const profile = profileMap.get(r.userId);
            if (profile) {
              return {
                ...r,
                userName: (profile as any).name || r.userName || '',
                userAvatar: (profile as any).avatar || r.userAvatar || '',
              };
            }
            return r;
          });
        }
      }

      setReviews(mapped);
      setError(null);
    } catch (err) {
      console.error('useReviews error:', err);
      setError(err as Error);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters?.productId, filters?.vendorId, filters?.reportedOnly]);

  // Realtime
  const fetchRef = useRef(fetchReviews);
  fetchRef.current = fetchReviews;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);


  const rtFilter = filters?.productId ? `product_id=eq.${filters.productId}` : undefined;

  useRealtimeSubscription({
    table: 'reviews',
    events: ['INSERT', 'UPDATE', 'DELETE'] as ('INSERT' | 'UPDATE' | 'DELETE')[],
    filter: rtFilter,
    channelName: `rt-reviews-${filters?.productId || filters?.vendorId || 'all'}`,
    onEvent: handleEvent,
  });

  return { reviews, loading, error, refreshReviews: fetchReviews };
}
