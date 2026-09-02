/**
 * Storage driver abstraction.
 *
 * Provides a uniform interface for reading, writing, and deleting files.
 * Two drivers are supported:
 *  - "local"    — writes to `process.cwd()/uploads/` (default)
 *  - "supabase" — delegates to the Supabase Storage JS client
 *
 * The active driver is selected via the STORAGE_DRIVER env var.
 */

import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { envConfig, isSupabaseConfigured } from "./config/env";

// ─── Storage interface ────────────────────────────────────────────────────────

export interface StorageDriver {
  /** Save a file.  Returns the storage path. */
  save(
    storagePath: string,
    data: Buffer,
    contentType: string
  ): Promise<string>;

  /** Read a file by its storage URL (local path or supabase:// URL). */
  read(storageUrl: string): Promise<Buffer>;

  /** Delete a file. */
  delete(storageUrl: string): Promise<void>;
}

// ─── Local driver ─────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const localDriver: StorageDriver = {
  async save(storagePath, data, _contentType) {
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
    return `local://${storagePath}`;
  },

  async read(storageUrl) {
    const filePath = storageUrl.startsWith("local://")
      ? path.join(UPLOADS_DIR, storageUrl.slice("local://".length))
      : path.join(process.cwd(), storageUrl);
    return readFile(filePath);
  },

  async delete(storageUrl) {
    const filePath = storageUrl.startsWith("local://")
      ? path.join(UPLOADS_DIR, storageUrl.slice("local://".length))
      : path.join(process.cwd(), storageUrl);
    await unlink(filePath).catch(() => {
      /* ignore missing file */
    });
  },
};

// ─── Supabase driver ──────────────────────────────────────────────────────────

function buildSupabaseDriver(): StorageDriver {
  // Lazy-import to avoid loading the Supabase SDK when it's not configured.
  const getClient = async () => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured (missing env vars).");
    }
    // Dynamic import so Next.js doesn't bundle this for non-Supabase deployments.
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      envConfig.supabase.url,
      envConfig.supabase.serviceRoleKey // server-side only
    );
  };

  const bucket = envConfig.supabase.storageBucket;

  return {
    async save(storagePath, data, contentType) {
      const client = await getClient();
      const { error } = await client.storage
        .from(bucket)
        .upload(storagePath, data, { contentType, upsert: true });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      return `supabase://${bucket}/${storagePath}`;
    },

    async read(storageUrl) {
      const client = await getClient();
      const key = storageUrl.replace(`supabase://${bucket}/`, "");
      const { data, error } = await client.storage.from(bucket).download(key);
      if (error) throw new Error(`Supabase read failed: ${error.message}`);
      const ab = await (data as Blob).arrayBuffer();
      return Buffer.from(ab);
    },

    async delete(storageUrl) {
      const client = await getClient();
      const key = storageUrl.replace(`supabase://${bucket}/`, "");
      const { error } = await client.storage.from(bucket).remove([key]);
      if (error) throw new Error(`Supabase delete failed: ${error.message}`);
    },
  };
}

// ─── Driver selector ──────────────────────────────────────────────────────────

let _supabaseStorage: StorageDriver | null = null;

/** Returns the configured Supabase storage driver (singleton). */
export function getSupabaseStorage(): StorageDriver {
  if (!_supabaseStorage) {
    _supabaseStorage = buildSupabaseDriver();
  }
  return _supabaseStorage;
}

/** Returns the active storage driver based on STORAGE_DRIVER env var. */
export function getStorage(): StorageDriver {
  return envConfig.storageDriver === "supabase"
    ? getSupabaseStorage()
    : localDriver;
}
