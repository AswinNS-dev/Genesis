// CrimeIntel — Supabase Storage provider
//
// Driver for Supabase Storage. Files are stored in a single bucket (default
// "crimeintel-evidence"). Locations persist as
// "supabase://<bucket>/<caseId>/<file>.pdf" so the driver (and the RLS and
// bucket permissions) is self-describing. Uses the server-side admin client;
// public read URLs are generated via the bucket's public setting or signed
// URLs.

import { getSupabaseAdmin } from "../supabase/client";
import { envConfig, isSupabaseConfigured } from "../config/env";
import { StorageProvider, StoredFileInfo } from "./types";

const SCHEME = "supabase://";

export function isSupabaseLocation(location: string): boolean {
  return location.startsWith(SCHEME);
}

function parseLocation(location: string): { bucket: string; path: string } {
  const rest = location.slice(SCHEME.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return { bucket: rest, path: "" };
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

async function ensureBucket(bucket: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.storage.getBucket(bucket);
  if (!data) {
    await admin.storage.createBucket(bucket, {
      public: envConfig.supabase.storagePublic,
    });
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  async save(
    key: string,
    data: Buffer,
    contentType?: string,
    _fileName?: string
  ): Promise<StoredFileInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase storage requested but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set."
      );
    }
    const admin = getSupabaseAdmin();
    const bucket = envConfig.supabase.storageBucket;
    await ensureBucket(bucket);

    const { error } = await admin.storage
      .from(bucket)
      .upload(key, data, { contentType, upsert: true });
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const location = `${SCHEME}${bucket}/${key}`;
    const url = envConfig.supabase.storagePublic
      ? admin.storage.from(bucket).getPublicUrl(key).data.publicUrl
      : undefined;
    return { location, url };
  }

  async read(location: string): Promise<Buffer> {
    const { bucket, path: objectPath } = parseLocation(location);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage.from(bucket).download(objectPath);
    if (error) {
      throw new Error(`Supabase read failed: ${error.message}`);
    }
    return Buffer.from(await (data as Blob).arrayBuffer());
  }

  async getPublicUrl(location: string): Promise<string | undefined> {
    const { bucket, path: objectPath } = parseLocation(location);
    const admin = getSupabaseAdmin();
    const { data } = admin.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  async delete(location: string): Promise<void> {
    const { bucket, path: objectPath } = parseLocation(location);
    const admin = getSupabaseAdmin();
    await admin.storage.from(bucket).remove([objectPath]);
  }
}