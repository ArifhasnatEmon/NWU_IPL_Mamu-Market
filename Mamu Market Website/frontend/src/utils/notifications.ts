import { supabase } from '../lib/supabase';

export const pushNotif = async (userId: string, title: string, message: string, type: string = 'system', link: string = '') => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        read: false,
        date: new Date().toLocaleDateString('en-US'),
      });

    if (error) {
      // RLS may block cross-user notification inserts (e.g., vendor notifying customer).
      // This is expected behavior — will be resolved in Phase 4 (Edge Functions)
      // where notifications are sent via a server-side function with elevated privileges.
      console.warn('Notification insert blocked (likely RLS cross-user restriction):', error.message);
    }
  } catch (err) {
    console.warn('pushNotif error:', err);
  }
};
