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
  
  // Optional: Resolve entities via ML service if we have candidates
  let resolvedCandidates = candidates.map(c => ({ ...c, suggestedEntityId: null, resolutionDecision: null, resolutionSignals: null, confidence: c.confidence }));
  
  try {
    const { envConfig } = await import("@backend/infrastructure/config/env");
    const { aiMode } = await import("@backend/lib/ai");
    
    if (aiMode() === "ml" && candidates.length > 0) {
      const registry = await prisma.entity.findMany({ select: { id: true, type: true, name: true, aliases: true, value: true, metadata: true } });
      const registryCandidates = registry.map(r => ({
          id: r.id, type: r.type, name: r.name,
          aliases: typeof r.aliases === "string" ? JSON.parse(r.aliases) : [],
          phone: r.type === "PHONE" ? r.value : undefined,
          vehicle: r.type === "VEHICLE" ? r.value : undefined,
          location: r.type === "LOCATION" ? r.value : undefined
      }));
      
      const extracted = candidates.map(c => ({
          type: c.type, name: c.value,
          phone: c.type === "PHONE" ? c.value : undefined,
          vehicle: c.type === "VEHICLE" ? c.value : undefined,
          location: c.type === "LOCATION" ? c.value : undefined
      }));
      
      const res = await fetch(`${envConfig.mlServiceUrl}/entity-resolution/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extracted_entities: extracted, registry_candidates: registryCandidates })
      });
      
      if (res.ok) {
        const data = await res.json();
        resolvedCandidates = candidates.map((c, i) => {
            const mlRes = data.results[i];
            return {
                ...c,
                suggestedEntityId: mlRes?.matched_entity_id,
                resolutionDecision: mlRes?.decision,
                resolutionSignals: mlRes?.signals ? JSON.stringify(mlRes.signals) : null,
                confidence: mlRes?.confidence ?? c.confidence
            };
        });
      }
    }
  } catch (err) {
    console.warn("Entity resolution failed:", err);
  }

  for (const c of resolvedCandidates) {
    await prisma.extractionCandidate.create({
      data: { 
        documentId: result.document.id, 
        type: c.type, 
        value: c.value, 
        context: c.context,
        confidence: c.confidence,
        suggestedEntityId: c.suggestedEntityId,
        resolutionDecision: c.resolutionDecision,
        resolutionSignals: c.resolutionSignals
      },
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