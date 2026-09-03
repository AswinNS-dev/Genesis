/**
 * Supabase client stub for CrimeIntel.
 *
 * This module provides a safe, no-op client when Supabase is not configured
 * (i.e. the required env vars are absent).  It MUST NOT expose the service
 * role key to the browser — only the public anon key is permitted client-side.
 *
 * SECURITY:
 *  - SUPABASE_SERVICE_ROLE_KEY is server-side only. Never use it here.
 *  - This file may be imported from React client components.
 */

// ─── Feature flag ─────────────────────────────────────────────────────────────

/**
 * Returns true only when both the public Supabase URL and anon key are set.
 * Use this guard before calling any Supabase client methods.
 */
export function isSupabaseEnabled(): boolean {
  // In browser contexts, only NEXT_PUBLIC_* vars are available.
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ─── Lazy client factory ──────────────────────────────────────────────────────

let _client: import("@supabase/supabase-js").SupabaseClient | null = null;

/**
 * Returns a Supabase client instance (anon key only, safe for client-side use).
 *
 * Throws when Supabase is not configured — check `isSupabaseEnabled()` first.
 */
export function getSupabaseClient(): import("@supabase/supabase-js").SupabaseClient {
  if (!isSupabaseEnabled()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  if (!_client) {
    // Dynamic require so bundlers don't break when the package is absent.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return _client;
}

// ─── Auth helper stub ─────────────────────────────────────────────────────────

export interface SupabaseSignInResult {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    email: string | undefined;
  };
}

/**
 * Sign in with email + password via Supabase Auth.
 *
 * Returns `{ ok: false }` when Supabase is not configured so callers can fall
 * back gracefully (e.g. to the local credentials provider).
 */
export async function supabaseSignIn(
  email: string,
  password: string
): Promise<SupabaseSignInResult> {
  if (!isSupabaseEnabled()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Sign-in failed" };
  }

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  };
}

/**
 * Sign out the current Supabase session.
 *
 * No-op when Supabase is not configured.
 */
export async function supabaseSignOut(): Promise<void> {
  if (!isSupabaseEnabled()) return;
  await getSupabaseClient().auth.signOut();
}
