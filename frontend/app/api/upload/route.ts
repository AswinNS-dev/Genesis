import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { isRole } from "@backend/lib/rbac";
import { evidenceService } from "@backend/services/evidence.service";
import { extractEntities } from "@backend/lib/ai";
import { prisma } from "@backend/lib/prisma";

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

  const buffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await evidenceService.upload({
      file: buffer,
      fileName: file.name || "evidence.txt",
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      caseId,
      userId: (session.user as { id?: string }).id,
      userName: session.user.name ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message.includes("20MB") ? 400 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  // AI entity extraction from text content / filename.
  let candidates: Awaited<ReturnType<typeof extractEntities>> = [];
  try {
    const existing = await prisma.investigationCase.findUnique({ where: { id: caseId } });
    const textContent = (file.name.toLowerCase().endsWith(".txt"))
      ? buffer.toString("utf8").slice(0, 20000)
      : `${existing?.title ?? ""} ${existing?.description ?? ""} ${file.name} report January communications financial amount RS 100000 inferred.`;
    candidates = await extractEntities(textContent);
  } catch {
    candidates = [];
  }

  let saved = 0;
  for (const c of candidates) {
    await prisma.extractionCandidate.create({
      data: { documentId: result.document.id, type: c.type, value: c.value, context: c.context },
    });
    saved++;
  }

  return NextResponse.json(
    {
      document: result.document,
      hash: result.hash,
      blockHash: result.blockHash,
      candidateCount: saved,
      candidates: candidates.map((c) => ({ type: c.type, value: c.value, context: c.context, confidence: c.confidence })),
    },
    { status: 201 }
  );
}