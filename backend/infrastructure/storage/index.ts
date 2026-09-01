// CrimeIntel — Storage driver selection
//
// Application code should import from here, never from an adapter directly.
//   getStorageProvider()   → the active driver (from STORAGE_DRIVER / env)
//   storageFor(location)   → the driver that owns a persisted location string,
//                            enabling mixed backends during migration.

import { envConfig } from "../config/env";
import { LocalStorageProvider } from "./local";
import { SupabaseStorageProvider, isSupabaseLocation } from "./supabase";
import { StorageProvider } from "./types";

let localInstance: LocalStorageProvider | undefined;
let supabaseInstance: SupabaseStorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (envConfig.storageDriver === "supabase") {
    return getSupabaseStorage();
  }
  return getLocalStorage();
}

export function getLocalStorage(): StorageProvider {
  if (!localInstance) localInstance = new LocalStorageProvider();
  return localInstance;
}

export function getSupabaseStorage(): StorageProvider {
  if (!supabaseInstance) supabaseInstance = new SupabaseStorageProvider();
  return supabaseInstance;
}

/** Resolve the provider that owns a given persisted location string. */
export function storageFor(location: string): StorageProvider {
  return isSupabaseLocation(location) ? getSupabaseStorage() : getLocalStorage();
}

export { isSupabaseLocation } from "./supabase";