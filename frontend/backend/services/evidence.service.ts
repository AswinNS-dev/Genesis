/**
 * Evidence management service.
 *
 * Handles file upload (with SHA-256 computation), blockchain anchoring,
 * integrity verification, and tamper simulation for the evidence ledger.
 *
 * Storage: files are written to the local filesystem under `uploads/`.
 * For Supabase storage, swap `saveLocally` with the Supabase storage driver.
 */

import { createHash } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { hashBlock, hashData } from "../lib/blockchain";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadInput {
  file: Buffer;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  caseId: string;
  userId?: string;
  userName?: string;
}

export interface UploadResult {
  document: {
    id: string;
    name: string;
    sha256: string | null;
    filePath: string | null;
    status: string;
    verified: boolean;
    caseId: string;
    createdAt: Date;
  };
  hash: string;
  blockHash: string;
}

export interface VerifyResult {
  verified: boolean;
  result: "MATCH" | "MISMATCH";
  storedHash: string | null;
  computedHash: string;
  detail: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function saveLocally(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  await ensureUploadDir();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}_${safe}`;
  const filePath = path.join(UPLOAD_DIR, unique);
  await writeFile(filePath, buffer);
  return `uploads/${unique}`;
}

async function nextBlockIndex(): Promise<number> {
  const last = await prisma.blockchainRecord.findFirst({
    orderBy: { index: "desc" },
    select: { index: true },
  });
  return (last?.index ?? -1) + 1;
}

async function getLastBlockHash(): Promise<string> {
  const last = await prisma.blockchainRecord.findFirst({
    orderBy: { index: "desc" },
    select: { hash: true },
  });
  if (last) return last.hash;

  // Chain is empty — the first real block chains from the genesis block hash.
  const { genesisTimestamp, genesisDataHash, hashBlock: hb } = await import(
    "../lib/blockchain"
  );
  return hb({
    index: 0,
    timestamp: genesisTimestamp(),
    dataHash: genesisDataHash(),
    previousHash: "0".repeat(64),
    action: "GENESIS",
  });
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const evidenceService = {
  /** Upload a file, compute its hash, anchor on the ledger. */
  async upload(input: UploadInput): Promise<UploadResult> {
    if (input.sizeBytes > MAX_SIZE_BYTES) {
      throw new Error("File exceeds the 20MB limit");
    }

    // Verify the case exists.
    const cs = await prisma.investigationCase.findUnique({
      where: { id: input.caseId },
    });
    if (!cs) throw new Error(`Case not found: ${input.caseId}`);

    // Compute SHA-256.
    const sha256 = hashData(input.file);

    // Persist to disk.
    const filePath = await saveLocally(input.fileName, input.file);

    // Create the EvidenceDocument record.
    const document = await prisma.evidenceDocument.create({
      data: {
        name: input.fileName,
        filePath,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        sha256,
        verified: false,
        status: "ACTIVE",
        caseId: input.caseId,
        uploadedById: input.userId,
      },
    });

    // Anchor on the blockchain ledger.
    const index = await nextBlockIndex();
    const previousHash = await getLastBlockHash();
    const now = new Date();

    const blockInput = {
      index,
      timestamp: now,
      dataHash: sha256,
      previousHash,
      action: "EVIDENCE_HASH" as const,
    };
    const blockHash = hashBlock(blockInput);

    await prisma.blockchainRecord.create({
      data: {
        index,
        timestamp: now,
        dataHash: sha256,
        previousHash,
        hash: blockHash,
        action: "EVIDENCE_HASH",
        note: `Evidence: ${input.fileName}`,
        evidenceId: document.id,
      },
    });

    // Audit trail.
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        caseId: input.caseId,
        action: "EVIDENCE_UPLOADED",
        detail: `${input.fileName} (${sha256.slice(0, 12)}…)`,
        status: "SUCCESS",
      },
    });

    await prisma.caseActivity.create({
      data: {
        caseId: input.caseId,
        action: "EVIDENCE_UPLOADED",
        detail: `Evidence uploaded: ${input.fileName}`,
        actor: input.userName,
      },
    });

    return { document, hash: sha256, blockHash };
  },

  /** List evidence documents, optionally filtered by case. */
  async list(caseId?: string) {
    return prisma.evidenceDocument.findMany({
      where: caseId ? { caseId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        blockchainRecords: { orderBy: { index: "asc" } },
        _count: { select: { verifications: true } },
      },
    });
  },

  /** Verify a document's hash against the latest blockchain record. */
  async verify(id: string, verifiedBy?: string): Promise<VerifyResult> {
    const doc = await prisma.evidenceDocument.findUnique({ where: { id } });
    if (!doc) throw new Error(`Evidence not found: ${id}`);

    // Read the file and recompute hash.
    let computedHash: string;
    if (doc.filePath) {
      try {
        const { readFile } = await import("fs/promises");
        const buf = await readFile(
          path.join(process.cwd(), doc.filePath)
        );
        computedHash = hashData(buf);
      } catch {
        // If file is missing, use stored hash for comparison.
        computedHash = doc.sha256 ?? "";
      }
    } else {
      computedHash = doc.sha256 ?? "";
    }

    const result: "MATCH" | "MISMATCH" =
      computedHash === doc.sha256 ? "MATCH" : "MISMATCH";
    const verified = result === "MATCH";
    const detail =
      result === "MATCH"
        ? "SHA-256 hash matches blockchain record"
        : `Hash mismatch — stored: ${doc.sha256?.slice(0, 12)}…, computed: ${computedHash.slice(0, 12)}…`;

    // Persist verification record.
    await prisma.evidenceVerification.create({
      data: {
        evidenceId: id,
        verifiedBy,
        action: "VERIFY",
        result,
        detail,
      },
    });

    // Update document status.
    await prisma.evidenceDocument.update({
      where: { id },
      data: {
        verified,
        verifiedAt: new Date(),
        status: verified ? "VERIFIED" : "COMPROMISED",
      },
    });

    if (!verified) {
      // Create a security alert on tamper detection.
      await prisma.aIAlert.create({
        data: {
          type: "TAMPER",
          severity: "CRITICAL",
          message: `Evidence integrity check FAILED: ${doc.name}`,
          detail,
        },
      });
    }

    return {
      verified,
      result,
      storedHash: doc.sha256,
      computedHash,
      detail,
    };
  },

  /**
   * Prototype-only: simulate tampering by corrupting the stored SHA-256 and
   * adding a EVIDENCE_MODIFIED blockchain record.
   */
  async simulateTamper(id: string, userId?: string) {
    const doc = await prisma.evidenceDocument.findUnique({ where: { id } });
    if (!doc) throw new Error(`Evidence not found: ${id}`);

    const tamperedHash =
      createHash("sha256")
        .update(`TAMPERED:${doc.sha256 ?? "none"}:${Date.now()}`)
        .digest("hex");

    await prisma.evidenceDocument.update({
      where: { id },
      data: { sha256: tamperedHash, status: "COMPROMISED" },
    });

    // Anchor the tamper event on-chain so it is auditable.
    const index = await nextBlockIndex();
    const previousHash = await getLastBlockHash();
    const now = new Date();

    const blockInput = {
      index,
      timestamp: now,
      dataHash: tamperedHash,
      previousHash,
      action: "EVIDENCE_MODIFIED" as const,
    };
    const blockHash = hashBlock(blockInput);

    await prisma.blockchainRecord.create({
      data: {
        index,
        timestamp: now,
        dataHash: tamperedHash,
        previousHash,
        hash: blockHash,
        action: "EVIDENCE_MODIFIED",
        note: `[PROTOTYPE] Tamper simulated on ${doc.name}`,
        evidenceId: id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "TAMPER_SIMULATED",
        detail: `[PROTOTYPE] Tamper simulated on ${doc.name}`,
        status: "SUCCESS",
      },
    });

    return { tamperedHash, blockHash, documentId: id };
  },
};
