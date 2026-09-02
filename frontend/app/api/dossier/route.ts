import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const entityId = url.searchParams.get("entityId") ?? "";
  const search = url.searchParams.get("search") ?? "";

  // Search mode — return matching entities
  if (search && !entityId) {
    const entities = await prisma.entity.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { aliases: { contains: search } },
          { value: { contains: search, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        riskScore: true,
        aliases: true,
        caseId: true,
        case: { select: { caseId: true, title: true } },
      },
      take: 20,
      orderBy: { riskScore: "desc" },
    });
    return NextResponse.json({ entities });
  }

  if (!entityId) return NextResponse.json({ error: "entityId or search required" }, { status: 400 });

  // Full dossier assembly
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      case: {
        select: {
          id: true,
          caseId: true,
          title: true,
          status: true,
          classification: true,
          assignedInvestigator: true,
          incidentDate: true,
          jurisdiction: true,
          category: true,
        },
      },
      sourceRelationships: {
        include: { target: { select: { id: true, name: true, type: true, riskScore: true } } },
        take: 30,
      },
      targetRelationships: {
        include: { source: { select: { id: true, name: true, type: true, riskScore: true } } },
        take: 30,
      },
      timelineEvents: { orderBy: { eventAt: "asc" }, take: 50 },
      matchesTargetA: {
        include: { entityB: { select: { id: true, name: true, type: true } } },
        orderBy: { confidence: "desc" },
        take: 10,
      },
      matchesTargetB: {
        include: { entityA: { select: { id: true, name: true, type: true } } },
        orderBy: { confidence: "desc" },
        take: 10,
      },
    },
  });

  if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });

  // Parse JSON fields safely
  const aliases: string[] = (() => {
    try { return entity.aliases ? JSON.parse(entity.aliases) : []; } catch { return []; }
  })();
  const metadata: Record<string, unknown> = (() => {
    try { return entity.metadata ? JSON.parse(entity.metadata) : {}; } catch { return {}; }
  })();

  // Related entities from relationships
  const connectedEntities = [
    ...entity.sourceRelationships.map((r) => ({
      id: r.target.id,
      name: r.target.name,
      type: r.target.type,
      riskScore: r.target.riskScore,
      relationshipType: r.type,
      direction: "outbound" as const,
      strength: r.strength,
      count: r.count,
    })),
    ...entity.targetRelationships.map((r) => ({
      id: r.source.id,
      name: r.source.name,
      type: r.source.type,
      riskScore: r.source.riskScore,
      relationshipType: r.type,
      direction: "inbound" as const,
      strength: r.strength,
      count: r.count,
    })),
  ];

  // Entity resolution matches
  const resolutionMatches = [
    ...entity.matchesTargetA.map((m) => ({
      matchId: m.id,
      otherEntityId: m.entityBId,
      otherEntityName: m.entityB.name,
      otherEntityType: m.entityB.type,
      confidence: m.confidence,
      status: m.status,
      reasons: (() => { try { return JSON.parse(m.reasons); } catch { return []; } })(),
      createdAt: m.createdAt.toISOString(),
    })),
    ...entity.matchesTargetB.map((m) => ({
      matchId: m.id,
      otherEntityId: m.entityAId,
      otherEntityName: m.entityA.name,
      otherEntityType: m.entityA.type,
      confidence: m.confidence,
      status: m.status,
      reasons: (() => { try { return JSON.parse(m.reasons); } catch { return []; } })(),
      createdAt: m.createdAt.toISOString(),
    })),
  ];

  // Evidence documents for the linked case
  const evidence = entity.caseId
    ? await prisma.evidenceDocument.findMany({
        where: { caseId: entity.caseId },
        select: {
          id: true,
          name: true,
          description: true,
          sha256: true,
          verified: true,
          status: true,
          sizeBytes: true,
          createdAt: true,
          blockchainRecords: { select: { index: true, hash: true, action: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  // AI patterns involving this entity
  const patterns = await prisma.pattern.findMany({
    where: { entities: { contains: entity.name } },
    orderBy: { relevance: "desc" },
    take: 10,
    select: { id: true, type: true, title: true, summary: true, severity: true, relevance: true, reasons: true, createdAt: true },
  });

  // Audit trail for this entity (via case or direct entity actions)
  const auditLogs = entity.caseId
    ? await prisma.auditLog.findMany({
        where: { caseId: entity.caseId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, role: true } } },
      })
    : [];

  // Extraction candidates (NER/NLP findings) for the linked case's documents
  const extractionCandidates = entity.caseId
    ? await prisma.extractionCandidate.findMany({
        where: {
          document: { caseId: entity.caseId },
          value: { contains: entity.name.split(" ")[0] },
        },
        select: { id: true, type: true, value: true, context: true, status: true, confidence: true, resolutionDecision: true },
        take: 15,
      })
    : [];

  // Audit: log dossier access
  try {
    await prisma.auditLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        action: "DOSSIER_VIEWED",
        detail: `Dossier accessed for entity: ${entity.name} (${entity.id})`,
        status: "SUCCESS",
      },
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({
    dossier: {
      entity: {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        value: entity.value,
        riskScore: entity.riskScore,
        aliases,
        metadata,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
      },
      case: entity.case
        ? {
            ...entity.case,
            incidentDate: entity.case.incidentDate?.toISOString() ?? null,
          }
        : null,
      connectedEntities,
      resolutionMatches,
      timeline: entity.timelineEvents.map((e) => ({
        id: e.id,
        type: e.type,
        summary: e.summary,
        detail: e.detail,
        eventAt: e.eventAt.toISOString(),
      })),
      evidence: evidence.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        sha256: e.sha256,
        verified: e.verified,
        status: e.status,
        sizeBytes: e.sizeBytes,
        createdAt: e.createdAt.toISOString(),
        blockIndex: e.blockchainRecords[0]?.index ?? null,
        blockHash: e.blockchainRecords[0]?.hash ?? null,
      })),
      patterns: patterns.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        summary: p.summary,
        severity: p.severity,
        relevance: p.relevance,
        reasons: (() => { try { return p.reasons ? JSON.parse(p.reasons) : []; } catch { return []; } })(),
        createdAt: p.createdAt.toISOString(),
      })),
      nerFindings: extractionCandidates,
      auditTrail: auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        detail: l.detail,
        status: l.status,
        actor: l.user?.name ?? "System",
        role: l.user?.role ?? null,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      })),
    },
  });
}
