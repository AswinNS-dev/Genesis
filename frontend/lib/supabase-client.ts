"use client";

// CrimeIntel — Supabase browser helper
//
// Used ONLY for client-side operations that are safe with the public anon key:
// sign-in with password / OAuth via Supabase Auth. The service-role key and the
// storage provider never live here — those are server-only.
//
// These are NEXT_PUBLIC_* so they are safe to ship to the browser.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function isSupabaseEnabled(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function supabaseSignIn(email: string, password: string) {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase is not configured on the client.");
  }

  // Lazy import keeps @supabase/supabase-js out of the initial bundle when
  // Supabase is disabled.
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    const reason = error?.message ?? "SUPABASE_AUTH_FAILED";
    throw new Error(reason);
  }

  return data.user;
}