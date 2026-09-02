import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { analysisService } from "@backend/services/analysis.service";

export const dynamic = "force-dynamic";

// Run an explainable AI analysis scoped to a dataset.
// - COMBINED: case-wide context (patterns across the linked case's entities).
// - DATASET_ONLY: analysis constrained to this dataset's own records/entities.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["INVESTIGATOR", "ANALYST", "ADMIN"].includes((session.user as { role?: string }).role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ds = await prisma.dataset.findUnique({
    where: { id: params.id },
    include: {
      case: { include: { entities: true, relationships: { include: { source: true, target: true } }, events: true } },
    },
  });
  if (!ds) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const scope = ds.analysisScope === "DATASET_ONLY" ? "DATASET_ONLY" : "COMBINED";

  // Ground truth for the analysis.
  // - COMBINED uses the full linked case context.
  // - DATASET_ONLY restricts to entities/relationships originating from this dataset.
  let entities: { name: string; type: string }[] = [];
  let rels: { source: { name: string; type: string } | null; target: { name: string; type: string } | null; type: string; count: number }[] = [];
  let caseId = ds.case?.caseId ?? null;

  if (scope === "COMBINED" && ds.case) {
    entities = ds.case.entities.map((e) => ({ name: e.name, type: e.type }));
    rels = ds.case.relationships.map((r) => ({
      source: { name: r.source?.name ?? "", type: r.source?.type ?? "" },
      target: { name: r.target?.name ?? "", type: r.target?.type ?? "" },
      type: r.type,
      count: r.count,
    }));
  } else {
    // DATASET_ONLY — pull entities created/merged by this dataset.
    const joined = await prisma.datasetEntity.findMany({
      where: { datasetId: ds.id },
      include: { entity: { select: { name: true, type: true } } },
    });
    entities = joined.map((j) => ({ name: j.entity.name, type: j.entity.type }));
    caseId = ds.case?.caseId ?? caseId;
  }

  // Build AnalysisContext in the same shape the case route expects.
  const people = entities.filter((e) => e.type === "PERSON").map((e) => e.name);
  const orgs = entities.filter((e) => e.type === "ORGANIZATION").map((e) => e.name);
  const locations = entities.filter((e) => e.type === "LOCATION").map((e) => e.name);

  const callCounts: Record<string, number> = {};
  const locEntities: Record<string, string[]> = {};
  const sharedVehicles: Record<string, string[]> = {};
  for (const r of rels) {
    const s = r.source?.name ?? "";
    const t = r.target?.name ?? "";
    if (r.type === "COMMUNICATION") {
      const key = [s, t].sort().join(" ↔ ");
      callCounts[key] = (callCounts[key] ?? 0) + r.count;
    }
    if (r.type === "LOCATION" && r.target?.type === "LOCATION") {
      (locEntities[t] ??= []).push(s);
    }
    if (r.type === "OWNERSHIP" && r.target?.type === "VEHICLE") {
      (sharedVehicles[t] ??= []).push(s);
    }
  }

  const context = {
    people: people.map((n) => ({ name: n, events: [] })),
    locations: Object.entries(locEntities).map(([name, ents]) => ({ name, entities: ents })),
    calls: Object.entries(callCounts).map(([k, count]) => {
      const [a = "", b = ""] = k.split(" ↔ ");
      return { a, b, count };
    }),
    sharedVehicles: Object.entries(sharedVehicles).map(([vehicle, ents]) => ({ vehicle, people: ents })),
    transactionChains: [],
  };

  const patterns = await analysisService.detectPatterns(context);
  const [anomalies, summary, leads] = await Promise.all([
    analysisService.detectAnomalies(context),
    analysisService.summarize({
      people: context.people,
      organizations: orgs,
      locations: locations.map((name) => ({ name, entities: [] })),
      relationships: rels.map((r) => ({ type: r.type, sourceName: r.source?.name ?? "", targetName: r.target?.name ?? "" })).slice(0, 6),
      events: [],
      transactionChains: patterns.map((p) => p.title),
      caseId: caseId ?? undefined,
    }),
    analysisService.generateLeads({
      relationships: rels.map((r) => ({ type: r.type, sourceName: r.source?.name ?? "", targetName: r.target?.name ?? "", strength: r.count })).slice(0, 3),
      locations: locations.map((name) => ({ name, entities: [people[0] ?? ""].filter(Boolean) })),
      transactionChains: [],
    }),
  ]);

  // Persist generated patterns into the Pattern table (dedupe by title).
  for (const p of patterns) {
    const exists = await prisma.pattern.findFirst({ where: { title: p.title } });
    if (!exists) {
      await prisma.pattern.create({
        data: {
          type: p.type,
          title: p.title,
          summary: p.summary,
          severity: p.severity,
          entities: JSON.stringify(p.entities ?? []),
          reasons: JSON.stringify(p.reasons),
          evidence: JSON.stringify(p.evidence),
          relevance: p.relevance,
        },
      });
    }
  }

  for (const a of anomalies) {
    const exists = await prisma.aIAlert.findFirst({ where: { type: "PATTERN", message: a.title } });
    if (!exists) {
      await prisma.aIAlert.create({
        data: { type: "PATTERN", severity: a.severity, message: a.title, detail: a.description },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "DATASET_ANALYZED",
      detail: `Analyzed ${ds.name} (scope: ${scope})${caseId ? ` — ${caseId}` : ""}`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ datasetId: ds.id, scope, caseId, summary, leads, patterns, anomalies, entityCount: people.length + orgs.length + locations.length });
}