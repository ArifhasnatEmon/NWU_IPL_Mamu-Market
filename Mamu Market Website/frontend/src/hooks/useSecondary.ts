import { useState, useEffect, useCallback, useRef } from 'react';
import { SupportTicket, Message, Category } from '../types';
import { CATEGORIES } from '../config';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export const useSupportTickets = (userId?: string) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      setTickets((data || []).map(row => ({
        id: row.id,
        userId: row.user_id || '',
        userName: row.user_name || '',
        userEmail: row.user_email || '',
        userRole: row.user_role || '',
        subject: row.subject || '',
        category: row.category || '',
        priority: row.priority || 'normal',
        status: row.status || 'open',
        description: row.description || '',
        message: row.message || '',
        orderId: row.order_id || '',
        replies: row.replies || [],
        createdAt: row.created_at || '',
      })));
      setError(null);
    } catch (err) {
      console.error('useSupportTickets (secondary) error:', err);
      setError(err as Error);

    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Realtime
  const fetchRef = useRef(fetchTickets);
  fetchRef.current = fetchTickets;

  const handleEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'support_tickets',
    events: ['INSERT', 'UPDATE'],
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: true,
    channelName: `rt-support-tickets-secondary-${userId || 'all'}`,
    onEvent: handleEvent,
  });

  return { tickets, loading, error, refreshTickets: fetchTickets };
};

export const useMessages = (conversationKey?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);


  const fetchMessages = useCallback(() => {
    setMessages([]);
    setLoading(false);
  }, [conversationKey]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, loading, refreshMessages: fetchMessages };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {

      const { data: categories, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (catErr) throw catErr;

      const { data: subcategories, error: subErr } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subErr) throw subErr;

      if (categories && categories.length > 0) {

        const mapped: Category[] = categories.map(cat => ({
          id: cat.name.toLowerCase().replace(/\s+/g, '-'),
          dbId: cat.id,
          name: cat.name,
          icon: cat.icon || 'fa-tag',
          count: cat.count || 0,
          subcategories: (subcategories || [])
            .filter((sub: any) => sub.category_id === cat.id)
            .map((sub: any) => ({
              id: sub.name.toLowerCase().replace(/\s+/g, '-'),
              dbId: sub.id,
              name: sub.name,
              count: sub.count || 0,
            })),
        }));
        setCategories(mapped);
        setError(null);
      } else {
        // Fallback to static categories
        setCategories(CATEGORIES);
        setError(null);
      }
    } catch (err) {
      console.warn('Failed to fetch categories from DB — using static fallback:', err);
      setError(err as Error);

      if (categories.length === 0) {
        setCategories(CATEGORIES);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Realtime
  const fetchRef = useRef(fetchCategories);
  fetchRef.current = fetchCategories;

  const handleCategoryEvent = useCallback(() => { fetchRef.current(); }, []);

  useRealtimeSubscription({
    table: 'categories',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    channelName: 'rt-categories',
    onEvent: handleCategoryEvent,
  });

  useRealtimeSubscription({
    table: 'subcategories',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    channelName: 'rt-subcategories',
    onEvent: handleCategoryEvent,
  });

  const addCategory = async (name: string, icon: string = 'fa-tag') => {
    try {
      const { error: dbErr } = await supabase
        .from('categories')
        .insert({ name, icon });

      if (dbErr) throw dbErr;
      await fetchCategories();
      return true;
    } catch (err) {
      console.error('addCategory error:', err);
      return false;
    }
  };

  const removeCategory = async (id: string) => {
    try {
      const { error: dbErr } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (dbErr) throw dbErr;
      await fetchCategories();
      return true;
    } catch (err) {
      console.error('removeCategory error:', err);
      return false;
    }
  };

  const addSubCategory = async (parentId: string, name: string) => {
    try {
      const { error: dbErr } = await supabase
        .from('subcategories')
        .insert({ category_id: parentId, name });

      if (dbErr) throw dbErr;
      await fetchCategories();
      return true;
    } catch (err) {
      console.error('addSubCategory error:', err);
      return false;
    }
  };

  const removeSubCategory = async (id: string) => {
    try {
      const { error: dbErr } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (dbErr) throw dbErr;
      await fetchCategories();
      return true;
    } catch (err) {
      console.error('removeSubCategory error:', err);
      return false;
    }
  };

  return { categories, loading, error, refreshCategories: fetchCategories, addCategory, removeCategory, addSubCategory, removeSubCategory };
};
