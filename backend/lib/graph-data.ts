// Server-side helpers to build graph structures and analyses from Prisma data.
import { prisma } from "@backend/lib/prisma";
import { entityColor, relationColor } from "@backend/lib/colors";

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

// Egocentric (2-hop) graph: a source entity plus every entity reachable
// within `maxHops` hops, and the edges among them. Used to focus the
// Analysis-page knowledge graph on a single person's network.
export async function buildEgocentricGraph(
  sourceId: string,
  maxHops = 2
): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const rels = await prisma.relationship.findMany();
  const adj: Record<string, string[]> = {};
  for (const r of rels) {
    (adj[r.sourceId] ??= []).push(r.targetId);
    (adj[r.targetId] ??= []).push(r.sourceId);
  }

  // BFS from the source to collect reachable node ids within maxHops.
  const keep = new Set<string>([sourceId]);
  const depth: Record<string, number> = { [sourceId]: 0 };
  const queue: string[] = [sourceId];
  while (queue.length) {
    const cur = queue.shift()!;
    if (depth[cur] >= maxHops) continue;
    for (const n of adj[cur] ?? []) {
      if (keep.has(n)) continue;
      keep.add(n);
      depth[n] = (depth[cur] ?? 0) + 1;
      queue.push(n);
    }
  }

  const entities = await prisma.entity.findMany({ where: { id: { in: Array.from(keep) } } });
  const nodes: GraphNode[] = entities.map((e) => ({
    id: e.id,
    label: e.name,
    type: e.type,
    color: entityColor(e.type),
    radius: e.id === sourceId ? 18 : undefined,
  }));

  const sub = rels.filter((r) => keep.has(r.sourceId) && keep.has(r.targetId));
  const links: GraphLink[] = sub.map((r) => ({
    source: r.sourceId,
    target: r.targetId,
    type: r.type,
    color: relationColor(r.type),
    weight: Math.min(4, 1 + Math.round(r.strength / 30)),
    label: r.label ?? undefined,
  }));

  return { nodes, links };
}

// Build a cross-dataset graph centered on persons from a specific dataset.
// `datasetOnly` = restrict to this dataset's own persons + their edges.
// Otherwise, expand outward from those persons through the existing DB, and
// tag each node as NEW (in this dataset) vs EXISTING (only in the DB) so the
// UI can color-code and emphasize cross-links (new ↔ existing).
export interface DatasetGraphResult {
  nodes: (GraphNode & { isNew: boolean })[];
  links: GraphLink[];
  persons: { id: string; name: string; isNew: boolean }[];
}

export async function buildDatasetGraph(
  datasetId: string,
  opts: { personId?: string; expand: boolean; maxHops: number }
): Promise<DatasetGraphResult> {
  const [dataset, records, merged] = await Promise.all([
    prisma.dataset.findUnique({ where: { id: datasetId } }),
    prisma.datasetRecord.findMany({
      where: { datasetId },
      select: { normalized: true, matchCandidateId: true },
    }),
    prisma.datasetEntity.findMany({ where: { datasetId }, select: { entityId: true } }),
  ]);
  if (!dataset) throw new Error("Dataset not found");

  // New persons come from the dataset's normalized name fields. Their ids may
  // be null (not yet materialized) — we treat each distinct name as a new node.
  const newPersonNames = new Set<string>();
  const newPersonIds = new Set<string>();
  for (const r of records) {
    let fields: Record<string, string> = {};
    try {
      fields = r.normalized ? JSON.parse(r.normalized) : {};
    } catch {
      fields = {};
    }
    const name = typeof fields.name === "string" ? fields.name.trim() : "";
    if (name) newPersonNames.add(name);
  }
  for (const m of merged) newPersonIds.add(m.entityId);

  // Resolve names that exist in the registry (matched/merged) — those reuse the
  // real entity id; brand-new names get a synthetic id.
  const existingByNorm = new Map<string, string>();
  const allEntities = await prisma.entity.findMany({ select: { id: true, name: true, type: true } });
  const byId = new Map(allEntities.map((e) => [e.id, e]));
  for (const e of allEntities) existingByNorm.set(e.name.toLowerCase().trim(), e.id);

  // persons list (for selector)
  const persons: { id: string; name: string; isNew: boolean }[] = [];
  for (const name of newPersonNames) {
    const realId = existingByNorm.get(name.toLowerCase().trim()) ?? newPersonIdsHas(name, merged, byId);
    persons.push({ id: realId ?? `NEW:${name}`, name, isNew: !realId });
  }
  // de-dup any merged entity ids already covered by name matches
  const covered = new Set(persons.map((p) => p.id));
  for (const id of newPersonIds) {
    const e = byId.get(id);
    if (e && !covered.has(id)) {
      persons.push({ id, name: e.name, isNew: true });
      covered.add(id);
    }
  }

  // Pick the focused person (or all).
  let focus = persons.map((p) => p.id);
  if (opts.personId) focus = [opts.personId];

  // New-node ids are the ones in `focus` that are from the dataset.
  const isNew = new Set(persons.filter((p) => p.isNew).map((p) => p.id));

  if (!opts.expand) {
    // Alone: only the focused persons and the edges strictly between them.
    const nodes: DatasetGraphResult["nodes"] = persons
      .filter((p) => focus.includes(p.id))
      .map((p) => {
        const e = byId.get(p.id);
        return {
          id: p.id,
          label: e?.name ?? p.name,
          type: e?.type ?? "PERSON",
          color: entityColor(e?.type ?? "PERSON"),
          isNew: isNew.has(p.id),
        };
      });
    return { nodes, links: [], persons };
  }

  // Expand: BFS through the full relationship graph from each focused node.
  const rels = await prisma.relationship.findMany();
  const adj: Record<string, { to: string; type: string; label?: string }[]> = {};
  for (const r of rels) {
    (adj[r.sourceId] ??= []).push({ to: r.targetId, type: r.type, label: r.label ?? undefined });
    (adj[r.targetId] ??= []).push({ to: r.sourceId, type: r.type, label: r.label ?? undefined });
  }

  const reach: Record<string, number> = {};
  const queue: { id: string; depth: number; from: string }[] = [];
  for (const f of focus) {
    reach[f] = 0;
    queue.push({ id: f, depth: 0, from: f });
  }
  const reachFrom: Record<string, string> = {};
  for (const f of focus) reachFrom[f] = f;
  const viaEdge = new Set<string>(); // "cross" edges connect a new node to a non-new node

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.depth >= opts.maxHops) continue;
    for (const n of adj[cur.id] ?? []) {
      const next = n.to;
      const curNew = isNew.has(cur.id);
      const nextNew = isNew.has(next);
      if (curNew !== nextNew) viaEdge.add(`${cur.id}|${next}|${n.type}`);
      if (reach[next] === undefined) {
        reach[next] = cur.depth + 1;
        reachFrom[next] = reachFrom[cur.id];
        queue.push({ id: next, depth: cur.depth + 1, from: cur.id });
      }
    }
  }

  const keep = new Set<string>(focus.filter((f) => isNew.has(f) || focus.includes(f)));
  for (const id of Object.keys(reach)) keep.add(id);

  const entities = await prisma.entity.findMany({
    where: { id: { in: Array.from(keep).filter((id) => !id.startsWith("NEW:")) } },
  });
  const idByName = new Map<string, { id: string; name: string; type: string }>(
    entities.map((e) => [e.id, e])
  );

  const nodes: DatasetGraphResult["nodes"] = [];
  for (const id of keep) {
    if (id.startsWith("NEW:")) {
      const p = persons.find((x) => x.id === id);
      nodes.push({ id, label: p?.name ?? id, type: "PERSON", color: entityColor("PERSON"), isNew: true });
      continue;
    }
    const e = idByName.get(id);
    if (e) nodes.push({ id, label: e.name, type: e.type, color: entityColor(e.type), isNew: isNew.has(id) });
  }

  const links: GraphLink[] = [];
  const seenEdges = new Set<string>();
  for (const r of rels) {
    if (!keep.has(r.sourceId) || !keep.has(r.targetId)) continue;
    const key = `${r.sourceId}->${r.targetId}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    const sourceNew = isNew.has(r.sourceId);
    const targetNew = isNew.has(r.targetId);
    const cross = (sourceNew || targetNew) && sourceNew !== targetNew;
    links.push({
      source: r.sourceId,
      target: r.targetId,
      type: r.type,
      color: cross ? "#f59e0b" : relationColor(r.type),
      weight: Math.min(4, 1 + Math.round(r.strength / 30)),
      label: r.label ?? undefined,
    });
  }

  return { nodes, links, persons };
}

function newPersonIdsHas(
  name: string,
  merged: { entityId: string }[],
  byId: Map<string, { id: string; name: string }>
): string | undefined {
  // A merged entity whose name matches the dataset's name field takes precedence.
  return merged
    .map((m) => byId.get(m.entityId))
    .find((e) => e && e.name.toLowerCase().trim() === name.toLowerCase().trim())?.id;
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
