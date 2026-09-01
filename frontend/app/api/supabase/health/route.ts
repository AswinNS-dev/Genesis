// CrimeIntel — Supabase readiness check
//
// Reports whether Supabase (DB + Storage + Auth) is configured, and, when a
// live project is reachable, runs a tiny storage connectivity probe so the UI
// can surface a clear "ready" indicator. Read-only with respect to app data.

import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import {
  isSupabaseConfigured,
  isPostgres,
  envConfig,
} from "@backend/infrastructure/config/env";
import { getSupabaseStorage } from "@backend/infrastructure/storage";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const configured = isSupabaseConfigured();
  const result: {
    configured: boolean;
    postgres: boolean;
    storageDriver: string;
    bucket: string;
    live?: boolean;
    error?: string;
  } = {
    configured,
    postgres: isPostgres(),
    storageDriver: envConfig.storageDriver,
    bucket: envConfig.supabase.storageBucket,
  };

  if (configured && envConfig.storageDriver === "supabase") {
    const probe = `_health/connectivity-${Date.now()}.probe`;
    try {
      const supabase = getSupabaseStorage();
      // Write → read → delete a tiny probe object through the real driver to
      // confirm bucket connectivity end-to-end.
      await supabase.save(probe, Buffer.from("ok"), "text/plain");
      await supabase.read(`supabase://${envConfig.supabase.storageBucket}/${probe}`);
      await supabase.delete(`supabase://${envConfig.supabase.storageBucket}/${probe}`);
      result.live = true;
    } catch (err) {
      result.live = false;
      result.error = err instanceof Error ? err.message : "Supabase probe failed.";
      // Best-effort cleanup.
      try {
        await getSupabaseStorage().delete(
          `supabase://${envConfig.supabase.storageBucket}/${probe}`
        );
      } catch {
        /* ignore cleanup failure */
      }
    }
  }

  return NextResponse.json(result);
}