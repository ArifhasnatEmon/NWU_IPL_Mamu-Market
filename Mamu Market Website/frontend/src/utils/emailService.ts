import { supabase } from '../lib/supabase';

export const sendCustomEmail = async (
  to_email: string,
  to_name: string,
  title: string,
  message: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to_email, to_name, title, message },
    });

    if (error) throw error;

    console.log('Email sent via Edge Function');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
};
