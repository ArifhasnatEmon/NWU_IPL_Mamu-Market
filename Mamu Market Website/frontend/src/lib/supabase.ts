import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const fetchWithRetry = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const timeoutMs = 8000; // 8 seconds before killing dead socket
  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network')) {
        if (attempt < maxRetries) {
          console.warn(`Supabase network hang detected. Forcing new connection (retry ${attempt + 1})...`);
          await new Promise(r => setTimeout(r, 200));
          continue;
        }
      }
      throw err;
    }
  }
  throw new Error('Supabase fetch failed after retries');
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: fetchWithRetry as any,
  },
  realtime: {
    heartbeatIntervalMs: 15000,
  },
});
