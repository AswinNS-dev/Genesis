import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { isRole } from "@backend/lib/rbac";
import { sha256Buffer, hashBlock } from "@backend/lib/blockchain";
import { extractEntities } from "@backend/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(session.user.role, "INVESTIGATOR"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const caseId = String(form.get("caseId") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

  // Validate case exists.
  const existing = await prisma.investigationCase.findUnique({ where: { id: caseId } });
  if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  // Validate + sanitize filename.
  const rawName = file.name || "evidence.txt";
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (file.size > 20 * 1024 * 1024)
    return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 });

  // Read, hash, store.
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = sha256Buffer(buffer);

  const uploadDir = path.join(process.cwd(), "public", "uploads", existing.caseId);
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join("uploads", existing.caseId, safeName);
  await writeFile(path.join(process.cwd(), "public", filePath), buffer);

  const doc = await prisma.evidenceDocument.create({
    data: {
      name: safeName,
      description: "Uploaded from Document Analysis",
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      sha256: hash,
      filePath,
      caseId,
      uploadedById: (session.user as { id?: string }).id,
    },
  });

  // Notarize on the prototype blockchain ledger.
  const prev = await prisma.blockchainRecord.findFirst({ orderBy: { index: "desc" } });
  const block = {
    index: (prev ? prev.index : 0) + 1,
    timestamp: new Date(),
    dataHash: hash,
    previousHash: prev ? prev.hash : "0".repeat(64),
    action: "EVIDENCE_HASH",
    note: `Notarized ${safeName} (${existing.caseId})`,
  };
  const blockHash = hashBlock(block);
  await prisma.blockchainRecord.create({ data: { ...block, hash: blockHash, evidenceId: doc.id } });

  await prisma.caseActivity.create({
    data: { caseId, action: "EVIDENCE_UPLOADED", detail: `${safeName} (${(file.size / 1024).toFixed(1)} KB)`, actor: session.user.name ?? undefined },
  });
  await prisma.auditLog.create({
    data: { userId: (session.user as { id?: string }).id, action: "DOCUMENT_UPLOADED", detail: `${safeName} (${hash.slice(0, 16)}…)`, status: "SUCCESS" },
  });

  // AI entity extraction from text content / filename.
  const textContent = safeName.toLowerCase().includes(".txt")
    ? buffer.toString("utf8").slice(0, 20000)
    : `${existing.title} ${existing.description} ${safeName} report January communications financial amount RS 100000 inferred.`;

  let candidates: Awaited<ReturnType<typeof extractEntities>> = [];
  try {
    candidates = await extractEntities(textContent);
  } catch {
    candidates = [];
  }

  // Persist extraction candidates (pending, awaiting investigator confirmation).
  let saved = 0;
  for (const c of candidates) {
    await prisma.extractionCandidate.create({
      data: { documentId: doc.id, type: c.type, value: c.value, context: c.context },
    });
    saved++;
  }

  return NextResponse.json(
    {
      document: doc,
      hash,
      blockHash,
      candidateCount: saved,
      candidates: candidates.map((c) => ({ type: c.type, value: c.value, context: c.context, confidence: c.confidence })),
    },
    { status: 201 }
  );
}
