// Server-side helpers to build graph structures and analyses from Prisma data.
import { prisma } from "@backend/lib/prisma";
import { entityColor, relationColor } from "@/components/entities/entity-helpers";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  radius?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  color: string;
  weight: number;
  label?: string;
}

export async function buildGraph(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const [entities, rels] = await Promise.all([
    prisma.entity.findMany(),
    prisma.relationship.findMany(),
  ]);

  const nodes: GraphNode[] = entities.map((e) => ({
    id: e.id,
    label: e.name,
    type: e.type,
    color: entityColor(e.type),
  }));

  const links: GraphLink[] = rels.map((r) => ({
    source: r.sourceId,
    target: r.targetId,
    type: r.type,
    color: relationColor(r.type),
    weight: Math.min(4, 1 + Math.round(r.strength / 30)),
    label: r.label ?? undefined,
  }));

  return { nodes, links };
}

// Relationship analysis between two entities.
export interface RelationshipAnalysis {
  sourceName: string;
  targetName: string;
  communication: { count: number; records: string[] };
  sharedLocations: { count: number; records: string[] };
  financial: { count: number; records: string[] };
  commonCases: { count: number };
  directRelationships: {
    id: string;
    type: string;
    strength: number;
    count: number;
    records: string[];
    label?: string | null;
  }[];
  strength: number;
}

export async function analyzeRelationship(
  sourceId: string,
  targetId: string
): Promise<RelationshipAnalysis | null> {
  const [source, target] = await Promise.all([
    prisma.entity.findUnique({ where: { id: sourceId } }),
    prisma.entity.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) return null;

  const rels = await prisma.relationship.findMany({
    where: {
      OR: [
        { sourceId, targetId },
        { sourceId: targetId, targetId: sourceId },
      ],
    },
  });

  const byType = (t: string) => rels.filter((r) => r.type === t);
  const countOf = (t: string) => byType(t).reduce((s, r) => s + r.count, 0);
  const recordsOf = (t: string) =>
    Array.from(new Set(byType(t).flatMap((r) => JSON.parse(r.records ?? "[]") as string[])));

  const communication = { count: countOf("COMMUNICATION"), records: recordsOf("COMMUNICATION") };
  const sharedLocations = { count: countOf("LOCATION"), records: recordsOf("LOCATION") };
  const financial = { count: countOf("FINANCIAL") + countOf("TRANSACTION"), records: recordsOf("FINANCIAL").concat(recordsOf("TRANSACTION")) };

  // Common cases.
  const sourceCases = new Set(
    (
      await prisma.relationship.findMany({
        where: { sourceId, type: "CASE" },
        select: { caseId: true },
      })
    ).map((r) => r.caseId)
  );
  const relsForCases = await prisma.relationship.findMany({
    where: { sourceId },
    select: { caseId: true },
  });
  relsForCases.forEach((r) => {
    if (r.caseId) sourceCases.add(r.caseId);
  });

  // Weighted strength (0-100).
  const strength = Math.min(
    99,
    Math.round(
      communication.count * 4 +
        sharedLocations.count * 3 +
        financial.count * 5 +
        rels.reduce((s, r) => s + r.strength, 0) / 4
    )
  );

  return {
    sourceName: source.name,
    targetName: target.name,
    communication,
    sharedLocations,
    financial,
    commonCases: { count: 0 },
    directRelationships: rels.map((r) => ({
      id: r.id,
      type: r.type,
      strength: r.strength,
      count: r.count,
      records: JSON.parse(r.records ?? "[]") as string[],
      label: r.label,
    })),
    strength,
  };
}

// Multi-hop path search between two entities (BFS, capped depth).
export interface PathStep {
  from: string;
  to: string;
  type: string;
  label: string;
}
export interface PathResult {
  found: boolean;
  hops: number;
  steps: PathStep[];
}

export async function findPath(sourceId: string, targetId: string, maxHops = 5): Promise<PathResult> {
  const rels = await prisma.relationship.findMany();
  const adj: Record<string, { to: string; type: string; label?: string }[]> = {};
  for (const r of rels) {
    (adj[r.sourceId] ??= []).push({ to: r.targetId, type: r.type, label: r.label ?? undefined });
    // treat as undirected
    (adj[r.targetId] ??= []).push({ to: r.sourceId, type: r.type, label: r.label ?? undefined });
  }

  // BFS with parent tracking.
  const queue: { id: string; depth: number; parent: { id: string; type: string; label?: string } | null }[] = [
    { id: sourceId, depth: 0, parent: null },
  ];
  const parentMap: Record<string, { id: string; type: string; label?: string }> = {};
  const visited = new Set<string>([sourceId]);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.id === targetId && cur.depth > 0) {
      // Reconstruct path.
      const steps: PathStep[] = [];
      let cursor = targetId;
      while (cursor !== sourceId) {
        const p = parentMap[cursor];
        if (!p) break;
        steps.unshift({ from: p.id, to: cursor, type: p.type, label: p.label ?? p.type.toLowerCase() });
        cursor = p.id;
      }
      return { found: true, hops: steps.length, steps };
    }
    if (cur.depth >= maxHops) continue;
    for (const n of adj[cur.id] ?? []) {
      if (!visited.has(n.to)) {
        visited.add(n.to);
        parentMap[n.to] = { id: cur.id, type: n.type, label: n.label };
        queue.push({ id: n.to, depth: cur.depth + 1, parent: null });
      }
    }
  }
  return { found: false, hops: -1, steps: [] };
}
