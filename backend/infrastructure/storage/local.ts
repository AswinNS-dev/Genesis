// CrimeIntel — Local filesystem storage provider
//
// Default driver. Writes files under the `public` directory so they are
// served statically by Next.js at "/uploads/..." (configurable via
// UPLOAD_DIR). Locations persist as web-relative paths like
// "uploads/<caseId>/<file>.pdf" — identical to the legacy storage layout.

import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { envConfig } from "../config/env";
import { StorageProvider, StoredFileInfo } from "./types";

function publicRoot(): string {
  return path.resolve(process.cwd(), "public");
}

function uploadRoot(): string {
  const dir = path.resolve(process.cwd(), envConfig.uploadDir.replace(/^\.\//, ""));
  return path.resolve(dir);
}

function toWebPath(abs: string): string {
  return path.relative(publicRoot(), abs).split(path.sep).join("/");
}

function toAbsPath(location: string): string {
  // Locations are stored as web paths relative to the public dir.
  return path.resolve(publicRoot(), ...location.split("/"));
}

export class LocalStorageProvider implements StorageProvider {
  async save(
    key: string,
    data: Buffer,
    contentType?: string,
    _fileName?: string
  ): Promise<StoredFileInfo> {
    const abs = path.join(uploadRoot(), key);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, data);
    return { location: toWebPath(abs) };
  }

  async read(location: string): Promise<Buffer> {
    return readFile(toAbsPath(location));
  }

  async getPublicUrl(location: string): Promise<string | undefined> {
    return "/" + location;
  }

  async delete(location: string): Promise<void> {
    await unlink(toAbsPath(location));
  }
}