import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupportTicket, Message } from '../types';
import { supabase } from '../lib/supabase';
import { mapTicket } from '../lib/dbMappers';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export const useSupportTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = async () => {
    if (!user?.id) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // Role-based filter
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      setTickets((data || []).map(mapTicket));
      setError(null);
    } catch (err) {
      console.error('useSupportTickets error:', err);
      setError(err as Error);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id, user?.role]);

  // Realtime
  const fetchTicketsRef = useRef(fetchTickets);
  fetchTicketsRef.current = fetchTickets;

  const handleTicketEvent = useCallback(() => { fetchTicketsRef.current(); }, []);

  const rtTicketFilter = user && user.role !== 'admin' ? `user_id=eq.${user.id}` : undefined;

  useRealtimeSubscription({
    table: 'support_tickets',
    events: ['INSERT', 'UPDATE'],
    filter: rtTicketFilter,
    enabled: !!user,
    channelName: `rt-support-tickets-${user?.id}-${user?.role}`,
    onEvent: handleTicketEvent,
  });

  const createTicket = async (data: Partial<SupportTicket>) => {
    if (!user) return false;
    try {
      const { error: dbErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_name: data.userName || user.name || '',
          user_email: data.userEmail || user.email || '',
          user_role: user.role || 'customer',
          subject: data.subject || '',
          category: data.category || 'other',
          priority: data.priority || 'normal',
          status: 'open',
          description: data.description || '',
          message: data.message || data.description || '',
          order_id: data.orderId || null,
          replies: [],
        });

      if (dbErr) throw dbErr;
      await fetchTickets();
      return true;
    } catch (err) {
      console.error('createTicket error:', err);
      return false;
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error: dbErr } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (dbErr) throw dbErr;
      await fetchTickets();
      return true;
    } catch (err) {
      console.error('updateTicketStatus error:', err);
      return false;
    }
  };

  const replyToTicket = async (ticketId: string, text: string, from: 'user' | 'admin') => {
    try {

      const { data: ticket, error: fetchErr } = await supabase
        .from('support_tickets')
        .select('replies, status')
        .eq('id', ticketId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentReplies = ticket?.replies || [];
      const newReply = { from, text, at: new Date().toISOString() };

      const updates: Record<string, any> = {
        replies: [...currentReplies, newReply],
      };


      if (from === 'admin' && ticket?.status === 'open') {
        updates.status = 'in-progress';
      }

      const { error: dbErr } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (dbErr) throw dbErr;
      await fetchTickets();
      return true;
    } catch (err) {
      console.error('replyToTicket error:', err);
      return false;
    }
  };

  return { tickets, isLoading, error, fetchTickets, createTicket, updateTicketStatus, replyToTicket };
};

export const useMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mapMessage = (m: any): Message => ({
    id: m.id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderRole: m.sender_role,
    senderAvatar: m.sender_avatar,
    receiverId: m.receiver_id,
    receiverName: m.receiver_name,
    receiverAvatar: m.receiver_avatar,
    text: m.text,
    read: m.read,
    date: m.date || m.created_at
  });

  const fetchMessages = async () => {
    if (!user?.id) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      let query = supabase.from('messages').select('*').order('created_at', { ascending: true });

      // Role-based filter
      if (user.role !== 'admin') {
        query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setMessages((data || []).map(mapMessage));
      setError(null);
    } catch (err) {
      console.error('fetchMessages error:', err);
      setError(err as Error);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user?.id]);

  // Realtime
  const fetchRef = useRef(fetchMessages);
  fetchRef.current = fetchMessages;

  const handleMessageEvent = useCallback(
    (payload: any) => {
      const eventType = payload.eventType as string;

      if (eventType === 'INSERT' && payload.new) {
        const newMsg = payload.new;

        if (
          user?.role === 'admin' ||
          newMsg.sender_id === user?.id ||
          newMsg.receiver_id === user?.id
        ) {
          setMessages(prev => [...prev, mapMessage(newMsg)]);
        }
      } else {

        fetchRef.current();
      }
    },
    [user?.id, user?.role],
  );

  useRealtimeSubscription({
    table: 'messages',
    events: ['INSERT', 'UPDATE'],

    enabled: !!user?.id,
    channelName: `rt-messages-${user?.id}`,
    onEvent: handleMessageEvent,
  });

  const sendMessage = async (data: Partial<Message>) => {
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: data.senderId,
        sender_name: data.senderName,
        sender_role: data.senderRole,
        sender_avatar: data.senderAvatar,
        receiver_id: data.receiverId,
        receiver_name: data.receiverName,
        receiver_avatar: data.receiverAvatar,
        text: data.text,
        date: new Date().toISOString()
      });
      if (error) throw error;

      return true;
    } catch (err) {
      console.error('sendMessage error:', err);
      return false;
    }
  };

  const markAsRead = async (otherId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from('messages').update({ read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherId);
      if (error) throw error;

    } catch (err) {
      console.error('markAsRead error:', err);
    }
  };

  return { messages, isLoading, error, sendMessage, markAsRead, fetchMessages };
};
