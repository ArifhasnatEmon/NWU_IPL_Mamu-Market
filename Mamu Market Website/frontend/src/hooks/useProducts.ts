import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { mapProduct } from '../lib/dbMappers';
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

export function useApprovedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      const dbProducts = (data || []).map(mapProduct);
      setProducts(dbProducts);
      setError(null);
    } catch (err) {
      console.error('useApprovedProducts error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Realtime
  const fetchRef = useRef(fetchProducts);
  fetchRef.current = fetchProducts;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'products',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    channelName: 'rt-products-approved',
    onEvent: handleEvent,
  });

  return { products, loading, error };
}

export function usePendingProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      setProducts((data || []).map(mapProduct));
      setError(null);
    } catch (err) {
      console.error('usePendingProducts error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Realtime
  const fetchRef = useRef(fetchProducts);
  fetchRef.current = fetchProducts;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'products',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    channelName: 'rt-products-pending',
    onEvent: handleEvent,
  });

  return { products, loading, error };
}

export function useProduct(id?: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProduct = async () => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (dbErr) throw dbErr;

      setProduct(data ? mapProduct(data) : null);
      setError(null);
    } catch (err) {
      console.error('useProduct error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Realtime
  const fetchRef = useRef(fetchProduct);
  fetchRef.current = fetchProduct;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'products',
    events: ['UPDATE'],
    filter: id ? `id=eq.${id}` : undefined,
    enabled: !!id,
    channelName: `rt-product-${id}`,
    onEvent: handleEvent,
  });

  return { product, loading, error };
}

export function useVendorProducts(vendorId?: string) {
  const cacheKey = `mm_vp_${vendorId}`;
  const tsKey   = `mm_vp_${vendorId}_ts`;

  // Only seed from cache when the TTL is still valid — otherwise start empty
  // so the page shows a proper loading state instead of stale data.
  const cacheValid = vendorId ? isCacheValid(tsKey) : false;

  const [products, setProducts] = useState<Product[]>(() => {
    if (!vendorId || !cacheValid) return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  // loading = true on mount whenever there is no valid cache, so the UI
  // always shows a spinner rather than stale data from a previous session.
  const [loading, setLoading] = useState<boolean>(
    !!vendorId && !cacheValid
  );

  const [error, setError] = useState<Error | null>(null);

  // abortedRef lets in-flight fetches detect they've been superseded
  // (vendorId changed or component unmounted) and skip the localStorage write.
  const abortedRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    if (!vendorId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    abortedRef.current = false;

    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      const mapped = (data || []).map(mapProduct);

      if (!abortedRef.current) {
        setProducts(mapped);
        // Write back to cache only while the session is still valid
        try {
          localStorage.setItem(cacheKey, JSON.stringify(mapped));
          localStorage.setItem(tsKey, String(Date.now()));
        } catch {}
        setError(null);
      }
    } catch (err) {
      console.error('useVendorProducts error:', err);
      if (!abortedRef.current) setError(err as Error);
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [vendorId, cacheKey, tsKey]);

  useEffect(() => {
    abortedRef.current = false;
    fetchProducts();

    return () => {
      // Mark any in-flight fetch as aborted so it won't touch state or storage
      abortedRef.current = true;
    };
  }, [fetchProducts]);

  // Realtime
  const fetchRef = useRef(fetchProducts);
  fetchRef.current = fetchProducts;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'products',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: vendorId ? `vendor_id=eq.${vendorId}` : undefined,
    enabled: !!vendorId,
    channelName: `rt-products-vendor-${vendorId}`,
    onEvent: handleEvent,
  });

  return { products, loading, error };
}
