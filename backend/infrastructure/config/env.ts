// CrimeIntel — Environment configuration
// Centralized, typed access to environment variables used by backend
// infrastructure. Kept in one place so adapters (database, storage,
// authentication) never read process.env directly.

export interface EnvConfig {
  nodeEnv: string;
  databaseUrl: string;
  uploadDir: string;
  supabase: {
    url: string | undefined;
    anonKey: string | undefined;
    serviceRoleKey: string | undefined;
    storageBucket: string;
    storagePublic: boolean;
  };
  storageDriver: "local" | "supabase";
}

const read = (name: string): string | undefined => process.env[name]?.trim();

/**
 * Whether the app is bundled into a browser context. The service-role key
 * must NEVER be used on the client, so callers use this as a guard.
 */
export const isServerSide = typeof window === "undefined";

const databaseUrl = read("DATABASE_URL") ?? "file:./dev.db";

const isPostgresUrl = (url: string): boolean => /^postgres(ql)?:\/\//.test(url);

function resolveDriver(dbUrl: string): EnvConfig["storageDriver"] {
  const explicit = read("STORAGE_DRIVER");
  if (explicit === "supabase" || explicit === "local") return explicit;
  // Automatic selection: pointing the app at a PostgreSQL database is taken
  // as an intent to run against Supabase, so storage follows.
  return isPostgresUrl(dbUrl) ? "supabase" : "local";
}

export const envConfig: EnvConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl,
  uploadDir: read("UPLOAD_DIR") ?? "./public/uploads",
  supabase: {
    url: read("SUPABASE_URL"),
    anonKey: read("SUPABASE_ANON_KEY"),
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
    storageBucket: read("SUPABASE_STORAGE_BUCKET") ?? "crimeintel-evidence",
    storagePublic: (read("SUPABASE_STORAGE_PUBLIC") ?? "true") === "true",
  },
  storageDriver: resolveDriver(databaseUrl),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(envConfig.supabase.url && envConfig.supabase.serviceRoleKey && envConfig.supabase.anonKey);
}

export function isPostgres(): boolean {
  return isPostgresUrl(envConfig.databaseUrl);
}