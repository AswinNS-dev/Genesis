// CrimeIntel — Evidence Service
// Centralized business logic for evidence upload, integrity verification,
// tamper simulation, and blockchain notarization.

import { prisma } from "../lib/prisma";
import {
  sha256Buffer,
  sha256,
  hashBlock,
  verifyChain,
} from "../lib/blockchain";
import { getStorageProvider, storageFor } from "../infrastructure/storage";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export interface UploadEvidenceInput {
  file: Buffer;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  caseId: string;
  userId?: string;
  userName?: string;
  description?: string;
  textContent?: string;
  saveToDisk?: boolean;
}

export class EvidenceService {
  /**
   * Upload a document: hash it, store it, notarize on the ledger,
   * and (optionally) run entity extraction.
   */
  async upload(input: UploadEvidenceInput) {
    if (input.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new Error("File exceeds 20MB limit");
    }

    // Sanitize filename
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const hash = sha256Buffer(input.file);

    const existing = await prisma.investigationCase.findUnique({
      where: { id: input.caseId },
    });
    if (!existing) throw new Error("Case not found");

    let filePath: string | undefined;
    if (input.saveToDisk !== false) {
      const key = `${existing.caseId}/${safeName}`;
      const stored = await getStorageProvider().save(
        key,
        input.file,
        input.contentType,
        safeName
      );
      filePath = stored.location;
    }

    const doc = await prisma.evidenceDocument.create({
      data: {
        name: safeName,
        description: input.description ?? "Uploaded from Document Analysis",
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        sha256: hash,
        filePath,
        caseId: input.caseId,
        uploadedById: input.userId,
      },
    });

    // Notarize on the prototype blockchain ledger.
    const block = await this.appendBlock({
      dataHash: hash,
      action: "EVIDENCE_HASH",
      note: `Notarized ${safeName} (${existing.caseId})`,
      evidenceId: doc.id,
    });

    await prisma.caseActivity.create({
      data: {
        caseId: input.caseId,
        action: "EVIDENCE_UPLOADED",
        detail: `${safeName} (${(input.sizeBytes / 1024).toFixed(1)} KB)`,
        actor: input.userName,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: "DOCUMENT_UPLOADED",
        detail: `${safeName} (${hash.slice(0, 16)}…)`,
        status: "SUCCESS",
      },
    });

    return { document: doc, hash, blockHash: block.hash };
  }

  /**
   * Append a block to the prototype blockchain ledger.
   */
  async appendBlock(data: {
    dataHash: string;
    action: string;
    note?: string;
    evidenceId?: string;
  }) {
    const prev = await prisma.blockchainRecord.findFirst({ orderBy: { index: "desc" } });
    const block = {
      index: (prev ? prev.index : 0) + 1,
      timestamp: new Date(),
      dataHash: data.dataHash,
      previousHash: prev ? prev.hash : "0".repeat(64),
      action: data.action,
      note: data.note,
    };
    const blockHash = hashBlock(block);
    const rec = await prisma.blockchainRecord.create({
      data: { ...block, hash: blockHash, evidenceId: data.evidenceId },
    });
    return rec;
  }

  /**
   * Verify a document's integrity:
   *  - recompute the file SHA-256 from disk (or stored hash),
   *  - compare against the notarized blockchain hash,
   *  - verify the full ledger chain, and record the outcome.
   */
  async verify(id: string, verifiedBy?: string) {
    const doc = await prisma.evidenceDocument.findUnique({
      where: { id },
      include: { blockchainRecords: true },
    });
    if (!doc) throw new Error("Evidence not found");

    const currentHash = doc.sha256 ?? "n/a";
    let recomputed = "";
    let hashMatch = false;
    if (doc.filePath) {
      try {
        const buf = await storageFor(doc.filePath).read(doc.filePath);
        recomputed = sha256Buffer(buf);
        hashMatch = recomputed === doc.sha256;
      } catch {
        recomputed = "(file unavailable)";
      }
    } else {
      // No physical file (seeded with derived content) — treat hash as authoritative.
      recomputed = currentHash;
      hashMatch = true;
    }

    // Check against the notarized blockchain record.
    const ledger = doc.blockchainRecords.find((b) => b.action === "EVIDENCE_HASH");
    const blockchainMatched = ledger ? ledger.dataHash === currentHash : false;

    // Verify the full ledger chain integrity.
    const allBlocks = await prisma.blockchainRecord.findMany();
    const chain = verifyChain(
      allBlocks.map((b) => ({
        id: b.id,
        index: b.index,
        timestamp: b.timestamp,
        dataHash: b.dataHash,
        previousHash: b.previousHash,
        hash: b.hash,
        action: b.action ?? undefined,
      }))
    );

    const verified = hashMatch && blockchainMatched && chain.intact;

    await prisma.evidenceVerification.create({
      data: {
        evidenceId: id,
        verifiedBy: verifiedBy ?? "system",
        result: verified ? "MATCH" : "MISMATCH",
        detail: `hashMatch=${hashMatch}, ledgerMatch=${blockchainMatched}, chainIntact=${chain.intact}`,
      },
    });

    if (verified) {
      await prisma.evidenceDocument.update({
        where: { id },
        data: { verified: true, verifiedAt: new Date(), status: "VERIFIED" },
      });
      await prisma.auditLog.create({
        data: {
          action: "EVIDENCE_VERIFIED",
          detail: `${doc.name} — verified`,
          status: "SUCCESS",
        },
      });
    } else {
      await prisma.evidenceDocument.update({
        where: { id },
        data: { status: "COMPROMISED", verified: false },
      });
      await prisma.securityAlert.create({
        data: {
          severity: "CRITICAL",
          type: "TAMPER",
          message: `Evidence integrity verification FAILED: ${doc.name}`,
          detail: `File ${doc.name} no longer matches its blockchain hash.`,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "EVIDENCE_VERIFIED",
          detail: `${doc.name} — integrity check failed`,
          status: "FAILED",
        },
      });
    }

    return {
      verified,
      hashMatch,
      blockchainMatched,
      chainIntact: chain.intact,
      brokenIndex: chain.brokenIndex,
      storedHash: currentHash,
      recomputedHash: recomputed,
      ledgerIndex: ledger?.index ?? null,
      id: doc.id,
      name: doc.name,
    };
  }

  /**
   * Prototype-only: simulate tampering by corrupting the stored hash
   * and notarizing an EVIDENCE_MODIFIED block.
   */
  async simulateTamper(id: string, userId?: string) {
    const doc = await prisma.evidenceDocument.findUnique({ where: { id } });
    if (!doc) throw new Error("Evidence not found");

    // Corrupt the stored hash (simulating an altered copy). The blockchain
    // notarized value is left untouched, so the next verification will fail.
    const tamperedHash = sha256(`TAMPERED ${doc.name} ${doc.sha256} at ${Date.now()}`);
    await prisma.evidenceDocument.update({
      where: { id },
      data: { sha256: tamperedHash, status: "COMPROMISED", verified: false },
    });

    // Append an integrity block noting the modification (immutable trail).
    const block = await this.appendBlock({
      dataHash: tamperedHash,
      action: "EVIDENCE_MODIFIED",
      note: `ALERT: ${doc.name} content altered (prototype tamper simulation)`,
      evidenceId: doc.id,
    });

    await prisma.securityAlert.create({
      data: {
        severity: "CRITICAL",
        type: "TAMPER",
        message: `Prototype tamper simulation: ${doc.name}`,
        detail: `The content hash for ${doc.name} was altered. Run Verify Evidence to see the integrity failure.`,
        userId,
      },
    });
    await prisma.auditLog.create({
      data: { userId, action: "EVIDENCE_MODIFIED", detail: `${doc.name} tamper-simulated (demo)`, status: "FAILED" },
    });

    return { ok: true, tamperedHash, blockHash: block.hash };
  }
}

export const evidenceService = new EvidenceService();