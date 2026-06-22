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
    // Send a WebSocket heartbeat every 15s (Supabase default).
    // We ALSO run our own keep-alive ping every 25s (see below) to prevent
    // the free-tier proxy from dropping idle connections after ~60s.
    heartbeatIntervalMs: 15000,
  },
});

// ── Keep-alive ping ────────────────────────────────────────────────────────
// Supabase free-tier terminates WebSocket connections that carry no
// application-level traffic for ~60 seconds. When the WS drops, the
// underlying HTTP socket pool can also stall, causing REST fetches (like
// the Add Product insert) to hang silently rather than fail fast.
//
// Every 25 seconds we create a throw-away channel, subscribe, then
// immediately remove it. This costs one WS frame and keeps the connection
// alive without any realtime subscriptions leaking.
(function startKeepAlive() {
  const INTERVAL_MS = 25_000;

  const ping = () => {
    try {
      const ch = supabase.channel('__keepalive__');
      ch.subscribe((status) => {
        // Remove the channel as soon as it's up — we only need the ping.
        if (status === 'SUBSCRIBED' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          supabase.removeChannel(ch);
        }
      });
    } catch {
      // Silently ignore — the next ping will try again.
    }
  };

  // Start after a short delay so the client is fully initialised.
  setTimeout(() => {
    ping();
    setInterval(ping, INTERVAL_MS);
  }, 5000);
})();

