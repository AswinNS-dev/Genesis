import { NextResponse } from "next/server";
import { getSession } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";
import { entityColor, relationColor } from "@backend/lib/colors";

export const dynamic = "force-dynamic";

const SCOPES: Record<string, string[]> = {
  documents: ["cases", "evidence", "candidates"],
  network: ["nodes", "links", "entities"],
  timeline: ["events", "entities", "types"],
  locations: ["locations"],
  communications: ["communications"],
  transactions: ["transactions", "nodes", "links"],
  patterns: ["patterns"],
  blockchain: ["blocks"],
  cases: ["cases"],
  evidence: ["evidenceList"],
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "";
  const want = SCOPES[scope] ?? [];

  const out: Record<string, unknown> = {};
  const wants = (k: string) => want.includes(k);

  if (wants("cases")) {
    out.cases = await prisma.investigationCase.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, caseId: true, title: true, status: true },
    });
  }
  if (wants("evidence") || wants("evidenceList")) {
    out.evidence = await prisma.evidenceDocument.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        sha256: true,
        verified: true,
        status: true,
        sizeBytes: true,
        caseId: true,
        createdAt: true,
      },
    });
  }
  if (wants("candidates")) {
    out.candidates = await prisma.extractionCandidate.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, value: true, context: true, status: true },
    });
  }
  if (wants("nodes") || wants("entities")) {
    const entities = await prisma.entity.findMany({
      select: { id: true, name: true, type: true },
    });
    if (wants("entities")) {
      out.entities = entities;
    }
    if (wants("nodes")) {
      out.nodes = entities.map((e) => ({
        id: e.id,
        label: e.name,
        type: e.type,
        color: entityColor(e.type),
      }));
    }
  }
  if (wants("patterns")) {
    out.patterns = await prisma.pattern.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, title: true, summary: true, severity: true, relevance: true, createdAt: true },
    });
    out.alerts = await prisma.aIAlert.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  }
  if (wants("links")) {
    const rels = await prisma.relationship.findMany();
    out.links = rels.map((r) => ({
      source: r.sourceId,
      target: r.targetId,
      type: r.type,
      color: relationColor(r.type),
      weight: Math.min(4, 1 + Math.round(r.strength / 30)),
    }));
  }
  if (wants("blocks")) {
    const blocks = await prisma.blockchainRecord.findMany({
      orderBy: { index: "asc" },
      include: { evidence: { select: { name: true } } },
    });
    out.blocks = blocks.map((b) => ({
      id: b.id,
      index: b.index,
      timestamp: b.timestamp.toISOString(),
      dataHash: b.dataHash,
      previousHash: b.previousHash,
      hash: b.hash,
      action: b.action,
      note: b.note,
      evidenceName: b.evidence?.name ?? null,
    }));
  }
  if (wants("events") || wants("entities") || wants("types")) {
    const events = await prisma.timelineEvent.findMany({
      include: { entity: { select: { name: true, type: true } }, case: { select: { caseId: true } } },
    });
    if (wants("events")) {
      out.events = events.map((e) => ({
        id: e.id,
        type: e.type,
        summary: e.summary,
        detail: e.detail,
        eventAt: e.eventAt.toISOString(),
        entityName: e.entity?.name ?? null,
        entityType: e.entity?.type ?? null,
        caseId: e.case?.caseId ?? null,
      }));
    }
    if (wants("entities")) {
      out.entities = Array.from(
        new Set(events.map((e) => e.entity?.name).filter((n): n is string => !!n))
      );
    }
    if (wants("types")) {
      out.types = Array.from(new Set(events.map((e) => e.type)));
    }
  }
  if (wants("locations")) {
    // Build location analysis: each location's linked entities + counts.
    const rels = await prisma.relationship.findMany({
      where: { target: { type: "LOCATION" } },
      include: { target: { select: { id: true, name: true } }, source: { select: { id: true, name: true, type: true } } },
    });
    const map: Record<string, { id: string; name: string; entities: { name: string; type: string }[]; activity: number }> = {};
    for (const r of rels) {
      const loc = r.target;
      const ent = map[loc.id] ??= { id: loc.id, name: loc.name, entities: [], activity: 0 };
      ent.entities.push({ name: r.source.name, type: r.source.type });
      ent.activity += r.count;
    }
    out.locations = Object.values(map).map((l) => ({
      ...l,
      entities: Array.from(new Map(l.entities.map((e) => [e.name, e])).values()),
    }));
  }
  if (wants("communications")) {
    const rels = await prisma.relationship.findMany({
      where: { type: "COMMUNICATION" },
      include: { source: { select: { id: true, name: true, type: true } }, target: { select: { id: true, name: true, type: true } } },
    });
    out.communications = rels.map((r) => ({
      id: r.id,
      caller: r.source.name,
      receiver: r.target.name,
      count: r.count,
      strength: r.strength,
      records: JSON.parse(r.records ?? "[]") as string[],
    }));
  }
  if (wants("transactions")) {
    const rels = await prisma.relationship.findMany({
      where: { type: { in: ["FINANCIAL", "TRANSACTION"] } },
      include: { source: { select: { id: true, name: true } }, target: { select: { id: true, name: true } } },
    });
    out.transactions = rels.map((r) => ({
      id: r.id,
      sender: r.source.name,
      receiver: r.target.name,
      count: r.count,
      strength: r.strength,
      records: JSON.parse(r.records ?? "[]") as string[],
    }));
  }

  return NextResponse.json(out);
}
