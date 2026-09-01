// CrimeIntel — Prototype Blockchain Integrity Ledger
// ============================================================
// This module implements a real, verifiable blockchain-style linked ledger
// for evidence integrity purposes ONLY. It is a private/local prototype.
//
// Each block stores:
//   - index
//   - timestamp
//   - dataHash (SHA-256 of the evidence content)
//   - previousHash (links to the previous block)
//   - action (EVIDENCE_HASH / INTEGRITY_VERIFY / EVIDENCE_MODIFIED)
//
// The hash of each block is SHA-256 over
// `index + timestamp + dataHash + previousHash + action`.
//
// This makes the ledger tamper-evident: if any block's data is altered, the
// entire chain of hashes becomes inconsistent.
// ============================================================

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Hashing primitives
// ---------------------------------------------------------------------------

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ---------------------------------------------------------------------------
// Block structure & chain verification
// ---------------------------------------------------------------------------

export interface BlockInput {
  index: number;
  timestamp: Date | string;
  dataHash: string;
  previousHash: string;
  action?: string;
  note?: string;
}

export function hashBlock(b: BlockInput): string {
  const data = `${b.index}|${new Date(b.timestamp).toISOString()}|${b.dataHash}|${b.previousHash}|${b.action ?? ""}`;
  return sha256(data);
}

export function genesisTimestamp(): Date {
  return new Date("2026-01-01T00:00:00.000Z");
}

export function genesisDataHash(): string {
  // Fixed zero-previous genesis block.
  return sha256("CrimeIntel Prototype Blockchain Ledger — Genesis");
}

// Verify that an ordered list of blocks forms an unbroken, consistent chain.
// Returns known-good blocks in order plus a boolean integrity flag.
export function verifyChain(
  blocks: { id: string; index: number; timestamp: Date; dataHash: string; previousHash: string; hash: string; action?: string }[]
): { intact: boolean; brokenIndex: number | null } {
  if (blocks.length === 0) {
    return { intact: true, brokenIndex: null };
  }
  const sorted = [...blocks].sort((a, b) => a.index - b.index);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const recomputed = hashBlock({
      index: b.index,
      timestamp: b.timestamp,
      dataHash: b.dataHash,
      previousHash: b.previousHash,
      action: b.action,
    });
    if (recomputed !== b.hash) {
      return { intact: false, brokenIndex: b.index };
    }
    if (i > 0 && sorted[i - 1].hash !== b.previousHash) {
      return { intact: false, brokenIndex: b.index };
    }
  }
  return { intact: true, brokenIndex: null };
}

// ---------------------------------------------------------------------------
// Demo evidence content builder — produces deterministic fictional content
// for a document so we can compute a real, stable SHA-256.
// ---------------------------------------------------------------------------

export function evidenceContent(name: string, caseId: string): string {
  // Deterministic fictional document payload. Changing the name or edits the
  // content, so the hash changes — which is exactly what tamper detection needs.
  return [
    "CrimeIntel PROTOTYPE EVIDENCE — FICTIONAL DATA",
    `EXHIBIT: ${name}`,
    `CASE: ${caseId}`,
    "RECORD TYPE: Investigation record (fictional)",
    "-----",
    "Narrative excerpt: Multiple individuals were observed coordinating movement",
    "of commercial cargo through a private logistics network. Recorded calls and",
    "transaction references are enumerated for demonstration only.",
    "-----",
    "INTEGRITY NOTE: This content is hashed and notarized on the prototype ledger.",
  ].join("\n");
}
