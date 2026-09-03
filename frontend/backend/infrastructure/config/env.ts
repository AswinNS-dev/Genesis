/**
 * Environment configuration for CrimeIntel backend.
 *
 * Centralises all env-var access so the rest of the application never calls
 * `process.env` directly.  Provides safe defaults for local development.
 */

// ─── Supabase ─────────────────────────────────────────────────────────────────

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  storageBucket: string;
}

/** True when a Supabase project URL and service-role key are both present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** True when the DATABASE_URL looks like a PostgreSQL connection string. */
export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

// ─── Centralised env config object ───────────────────────────────────────────

export const envConfig = {
  /** Storage driver: "local" (default) | "supabase" */
  storageDriver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "supabase",

  /** URL of the Python ML microservice (entity resolution, etc.). */
  mlServiceUrl: process.env.ML_SERVICE_URL ?? "http://localhost:8001",

  /** Python FastAPI backend base URL. */
  apiUrl: process.env.PYTHON_API_URL ?? "http://localhost:8000",

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "crimeintel-evidence",
  } satisfies SupabaseConfig,

  /** NextAuth secret — must be set in production. */
  nextAuthSecret:
    process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production",

  /** Active AI provider. */
  aiProvider: process.env.AI_PROVIDER ?? "mock",
} as const;
