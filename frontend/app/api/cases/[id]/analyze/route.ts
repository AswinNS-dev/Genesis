import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { summarizeInvestigation, generateLeads, detectPatterns } from "@backend/lib/ai";

export const dynamic = "force-dynamic";

// Generate an explainable AI investigation summary + leads for a case.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["INVESTIGATOR", "ANALYST", "ADMIN"].includes((session.user as { role?: string }).role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cs = await prisma.investigationCase.findUnique({
    where: { id: params.id },
    include: { entities: true, relationships: { include: { source: true, target: true } }, events: true },
  });
  if (!cs) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const people = cs.entities.filter((e) => e.type === "PERSON").map((e) => e.name);
  const orgs = cs.entities.filter((e) => e.type === "ORGANIZATION").map((e) => e.name);
  const locations = cs.entities.filter((e) => e.type === "LOCATION").map((e) => e.name);
  const relationships = cs.relationships
    .filter((r) => r.source.type === "PERSON" && r.target.type === "PERSON")
    .map((r) => `${r.source.name} ↔ ${r.target.name}`);
  const events = cs.events.map((e) => e.summary);

  // Build pattern context from the case data.
  const callCounts: Record<string, number> = {};
  const locEntities: Record<string, string[]> = {};
  const sharedVehicles: Record<string, string[]> = {};
  for (const r of cs.relationships) {
    if (r.type === "COMMUNICATION") {
      const key = [r.source.name, r.target.name].sort().join(" ↔ ");
      callCounts[key] = (callCounts[key] ?? 0) + r.count;
    }
    if (r.type === "LOCATION" && r.target.type === "LOCATION") {
      (locEntities[r.target.name] ??= []).push(r.source.name);
    }
    if (r.type === "OWNERSHIP" && r.target.type === "VEHICLE") {
      (sharedVehicles[r.target.name] ??= []).push(r.source.name);
    }
  }
  const patterns = await detectPatterns({
    people: people.map((n) => ({ name: n, events: events.map(() => ({ type: "GENERAL" })) })),
    locations: Object.entries(locEntities).map(([name, entities]) => ({ name, entities })),
    calls: Object.entries(callCounts).map(([k, count]) => {
      const [a, b] = k.split(" ↔ ");
      return { a, b, count };
    }),
    sharedVehicles: Object.entries(sharedVehicles).map(([vehicle, people]) => ({ vehicle, people })),
    transactionChains: [],
  });

  const summary = await summarizeInvestigation({
    people,
    organizations: orgs,
    locations,
    relationshipCount: cs.relationships.length,
    relationships,
    events,
    patterns: patterns.map((p) => p.title),
    caseId: cs.caseId,
  });

  const leads = await generateLeads({
    relationships: relationships.slice(0, 3).map((label) => {
      const [a, b] = label.split(" ↔ ");
      return { label: `${a} ↔ ${b}`, people: [a, b] };
    }),
    repeatedLocations: locations,
    transactionChains: [],
  });

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

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id?: string }).id,
      action: "AI_SUMMARY",
      detail: `Generated explainable summary for ${cs.caseId}`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ caseId: cs.caseId, summary, leads, patterns });
}
