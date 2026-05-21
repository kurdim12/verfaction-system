import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the SERVICE_ROLE key.
 * Never import this from a "use client" file or Client Component.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  // Node 20 lacks native WebSocket; supply `ws` to the Realtime client.
  // (We don't use Realtime, but @supabase/supabase-js still initialises it.)
  // On Vercel (Node 22+) globalThis.WebSocket exists, so this branch is a no-op.
  const clientOpts: Parameters<typeof createClient>[2] = {
    auth: { persistSession: false, autoRefreshToken: false },
  };
  if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
    try {
      const ws = require("ws");
      clientOpts.realtime = { transport: ws };
    } catch {
      // ws unavailable; rely on Realtime not being touched at query time
    }
  }

  _client = createClient(url, key, clientOpts);
  return _client;
}
