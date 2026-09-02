// CrimeIntel — Storage abstraction
//
// A minimal, swappable file-storage contract so the application does not
// hard-code a filesystem or cloud provider. Implementations:
//   - LocalStorageProvider  (backend/infrastructure/storage/local.ts)
//   - SupabaseStorageProvider (backend/infrastructure/storage/supabase.ts)
//
// A stored object is referenced by a portable `location` string persisted in
// the database (for example "uploads/<caseId>/file.pdf" for local, or
// "supabase://<bucket>/<caseId>/file.pdf" for Supabase). Callers pass that
// location directly to `read`, `getPublicUrl` or `delete`.

export interface StoredFileInfo {
  /** Portable reference to persist in the database. */
  location: string;
  /** Optional public URL (only meaningful for public buckets). */
  url?: string;
}

export interface StorageProvider {
  /** Persist a file under a logical key (e.g. "<caseId>/<fileName>"). */
  save(
    key: string,
    data: Buffer,
    contentType?: string,
    fileName?: string
  ): Promise<StoredFileInfo>;

  /** Read back a file's bytes given its persisted location. Throws if missing. */
  read(location: string): Promise<Buffer>;

  /** Resolve a browser-accessible URL for a location, if the driver supports it. */
  getPublicUrl(location: string): Promise<string | undefined>;

  /** Permanently remove the stored object. */
  delete(location: string): Promise<void>;
}