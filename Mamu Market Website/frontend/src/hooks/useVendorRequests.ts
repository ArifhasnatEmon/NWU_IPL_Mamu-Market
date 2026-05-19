import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { VendorRequest } from '../types';
import { supabase } from '../lib/supabase';
import { mapVendorRequest } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';


export function useVendorRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = async () => {
    if (!user?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('vendor_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Role-based filter
      if (user.role !== 'admin') {
        query = query.eq('vendor_id', user.id);
      }

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      setRequests((data || []).map(mapVendorRequest));
      setError(null);
    } catch (err) {
      console.error('useVendorRequests error:', err);
      setError(err as Error);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user?.id, user?.role]);

  // Realtime
  const fetchRef = useRef(fetchRequests);
  fetchRef.current = fetchRequests;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);


  const rtFilter = user && user.role !== 'admin' ? `vendor_id=eq.${user.id}` : undefined;

  useRealtimeSubscription({
    table: 'vendor_requests',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: rtFilter,
    enabled: !!user,
    channelName: `rt-vendor-requests-${user?.id}-${user?.role}`,
    onEvent: handleEvent,
  });

  const submitRequest = async (type: string, currentValue?: string, requestedValue?: string, reason?: string) => {
    if (!user) return false;
    try {
      const { error: dbErr } = await supabase
        .from('vendor_requests')
        .insert({
          vendor_id: user.id,
          vendor_name: user.storeName || user.name || '',
          request_type: type,
          current_value: currentValue || '',
          requested_value: requestedValue || '',
          reason: reason || '',
          status: 'pending',
        });

      if (dbErr) throw dbErr;
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('submitRequest error:', err);
      return false;
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const { error: dbErr } = await supabase
        .from('vendor_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (dbErr) throw dbErr;
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('updateRequestStatus error:', err);
      return false;
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const { error: dbErr } = await supabase
        .from('vendor_requests')
        .delete()
        .eq('id', id);

      if (dbErr) throw dbErr;
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('deleteRequest error:', err);
      return false;
    }
  };

  return {
    requests,
    loading,
    error,
    refresh: fetchRequests,
    submitRequest,
    updateRequestStatus,
    deleteRequest
  };
}
