"use client";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase env vars missing; returning mock client for getSupabaseBrowser().");
    }

    const mockClient = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: (_event: unknown, _callback: unknown) => ({
          data: { subscription: { unsubscribe: () => undefined } },
          error: null,
        }),
        signOut: async () => ({ error: null }),
      },
    } as unknown as SupabaseClient;

    cachedClient = mockClient;
    return mockClient;
  }

  cachedClient = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  return cachedClient;
}
