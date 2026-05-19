import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { mapProduct } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    if (!vendorId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      setProducts((data || []).map(mapProduct));
      setError(null);
    } catch (err) {
      console.error('useVendorProducts error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [vendorId]);

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
