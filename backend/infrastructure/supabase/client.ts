// CrimeIntel — Supabase client factory (server-only)
//
// Two clients are provided:
//   - getSupabaseAdmin(): uses the SERVICE ROLE key. This key bypasses RLS and
//     is a full-access credential. It must ONLY ever be used inside the
//     backend (server-side). It is never exposed to the browser.
//   - getSupabaseAnon(): uses the safe anon/public key. Suitable for signed
//     URL generation and client-side tools. Still server-side here.
//
// Both clients are created lazily and cached as singletons.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { envConfig, isSupabaseConfigured, isServerSide } from "../config/env";

let adminClient: SupabaseClient | undefined;
let anonClient: SupabaseClient | undefined;

/**
 * Server-only admin client (service role).
 * Throws if called on the client or before Supabase is configured.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isServerSide) {
    throw new Error(
      "getSupabaseAdmin() can only be used on the server. The service role key must not be exposed to the browser."
    );
  }
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  if (!adminClient) {
    adminClient = createClient(envConfig.supabase.url!, envConfig.supabase.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** Server-only anon/public client. Safe to use for public-bucket URL helpers. */
export function getSupabaseAnon(): SupabaseClient {
  if (!envConfig.supabase.url || !envConfig.supabase.anonKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  if (!anonClient) {
    anonClient = createClient(envConfig.supabase.url, envConfig.supabase.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}