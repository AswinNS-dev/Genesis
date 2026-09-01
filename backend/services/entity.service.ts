// CrimeIntel — Entity Service
// Centralized business logic for entities, search, and connections.

import { prisma } from "../lib/prisma";
import { entityColor, relationColor, entityLabel, relationLabel } from "../lib/colors";

export type EntitySearchType =
  | "PERSON"
  | "PHONE"
  | "VEHICLE"
  | "LOCATION"
  | "ORGANIZATION"
  | "CASE"
  | "EVIDENCE";

export interface SearchResult {
  type: EntitySearchType;
  id: string;
  label: string;
  subtitle?: string;
  matches: string[];
}

export class EntityService {
  /**
   * Global investigation search across persons, phones, vehicles,
   * locations, organizations, cases, and evidence documents.
   */
  async search(query: string, limit = 25): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const contains = { contains: q };

    const [persons, phones, vehicles, locations, orgs, cases, evidence] = await Promise.all([
      prisma.entity.findMany({
        where: { type: "PERSON", name: { contains: q } },
        take: limit,
      }),
      prisma.entity.findMany({
        where: {
          OR: [
            { type: "PHONE", name: { contains: q } },
            { value: { contains: q } } as never,
          ] as never,
        },
        take: limit,
      }),
      prisma.entity.findMany({ where: { type: "VEHICLE", name: { contains: q } }, take: limit }),
      prisma.entity.findMany({ where: { type: "LOCATION", name: { contains: q } }, take: limit }),
      prisma.entity.findMany({ where: { type: "ORGANIZATION", name: { contains: q } }, take: limit }),
      prisma.investigationCase.findMany({
        where: { OR: [{ caseId: { contains: q } }, { title: { contains: q } }] },
        take: limit,
      }),
      prisma.evidenceDocument.findMany({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
        take: limit,
      }),
    ]);

    const out: SearchResult[] = [
      ...persons.map((e) => ({
        type: "PERSON" as const,
        id: e.id,
        label: e.name,
        subtitle: "Person",
        matches: [e.name],
      })),
      ...phones.map((e) => ({
        type: "PHONE" as const,
        id: e.id,
        label: e.name,
        subtitle: "Phone",
        matches: [e.name, e.value ?? ""],
      })),
      ...vehicles.map((e) => ({
        type: "VEHICLE" as const,
        id: e.id,
        label: e.name,
        subtitle: "Vehicle",
        matches: [e.name, e.value ?? ""],
      })),
      ...locations.map((e) => ({
        type: "LOCATION" as const,
        id: e.id,
        label: e.name,
        subtitle: "Location",
        matches: [e.name],
      })),
      ...orgs.map((e) => ({
        type: "ORGANIZATION" as const,
        id: e.id,
        label: e.name,
        subtitle: "Organization",
        matches: [e.name],
      })),
      ...cases.map((c) => ({
        type: "CASE" as const,
        id: c.id,
        label: c.caseId,
        subtitle: c.title,
        matches: [c.caseId, c.title],
      })),
      ...evidence.map((d) => ({
        type: "EVIDENCE" as const,
        id: d.id,
        label: d.name,
        subtitle: d.description ?? "Evidence document",
        matches: [d.name, d.description ?? ""],
      })),
    ];

    return out.slice(0, limit);
  }

  /**
   * Fetch a single entity with its full context (for the investigation workspace).
   */
  async getEntityContext(id: string) {
    const entity = await prisma.entity.findUnique({
      where: { id },
      include: {
        sourceRelationships: { include: { target: true, case: true } },
        targetRelationships: { include: { source: true, case: true } },
        timelineEvents: { orderBy: { eventAt: "desc" } },
        matchesTargetA: { include: { entityB: true } },
        matchesTargetB: { include: { entityA: true } },
        case: true,
      },
    });
    return entity;
  }

  /**
   * All direct connections of an entity (for immediate network view).
   */
  async getConnections(id: string) {
    const entity = await prisma.entity.findUnique({
      where: { id },
      include: {
        sourceRelationships: { include: { target: true } },
        targetRelationships: { include: { source: true } },
      },
    });
    if (!entity) return null;

    const nodes: {
      id: string;
      label: string;
      type: string;
      color: string;
      relationshipType: string;
      relationshipLabel: string;
      strength: number;
      count: number;
      records: string[];
      bidirectional?: boolean;
    }[] = [];

    const seen = new Set<string>();
    for (const r of entity.sourceRelationships) {
      if (r.targetId === id || seen.has(r.targetId)) continue;
      seen.add(r.targetId);
      nodes.push({
        id: r.targetId,
        label: r.target.name,
        type: r.target.type,
        color: entityColor(r.target.type),
        relationshipType: r.type,
        relationshipLabel: relationLabel(r.type),
        strength: r.strength,
        count: r.count,
        records: JSON.parse(r.records ?? "[]") as string[],
      });
    }
    for (const r of entity.targetRelationships) {
      if (r.sourceId === id || seen.has(r.sourceId)) continue;
      seen.add(r.sourceId);
      nodes.push({
        id: r.sourceId,
        label: r.source.name,
        type: r.source.type,
        color: entityColor(r.source.type),
        relationshipType: r.type,
        relationshipLabel: relationLabel(r.type),
        strength: r.strength,
        count: r.count,
        records: JSON.parse(r.records ?? "[]") as string[],
        bidirectional: true,
      });
    }

    return {
      entity: {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        value: entity.value,
        aliases: (entity.aliases ? JSON.parse(entity.aliases) : []) as string[],
        riskScore: entity.riskScore,
      },
      connections: nodes,
    };
  }

  /**
   * Build a network graph scoped to a single entity and its neighbors.
   */
  async buildEntitySubgraph(id: string, maxHops = 1, limit = 50) {
    const all = await prisma.relationship.findMany({
      include: { source: true, target: true },
    });

    const adj: Record<string, { id: string; type: string; label?: string | null; weight: number }[]> = {};
    for (const r of all) {
      (adj[r.sourceId] ??= []).push({
        id: r.targetId,
        type: r.type,
        label: r.label,
        weight: Math.min(4, 1 + Math.round(r.strength / 30)),
      });
      (adj[r.targetId] ??= []).push({
        id: r.sourceId,
        type: r.type,
        label: r.label,
        weight: Math.min(4, 1 + Math.round(r.strength / 30)),
      });
    }

    const visitedIds = new Set<string>([id]);
    const queue: { id: string; hops: number }[] = [{ id, hops: 0 }];
    const edgeMap = new Map<string, typeof all[number]>();

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.hops >= maxHops) continue;
      for (const n of adj[cur.id] ?? []) {
        if (!visitedIds.has(n.id)) {
          visitedIds.add(n.id);
          queue.push({ id: n.id, hops: cur.hops + 1 });
        }
        if (visitedIds.size > limit) break;
      }
      if (visitedIds.size > limit) break;
    }

    const entities = await prisma.entity.findMany({
      where: { id: { in: [...visitedIds] } },
    });
    const entityById = new Map(entities.map((e) => [e.id, e]));

    const nodes = entities.map((e) => ({
      id: e.id,
      label: e.name,
      type: e.type,
      color: entityColor(e.type),
    }));

    const links = all
      .filter((r) => visitedIds.has(r.sourceId) && visitedIds.has(r.targetId))
      .map((r) => ({
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
        color: relationColor(r.type),
        weight: Math.min(4, 1 + Math.round(r.strength / 30)),
        label: r.label ?? relationLabel(r.type),
      }));

    return { nodes, links };
  }

  /**
   * Timeline for a single entity.
   */
  async getEntityTimeline(id: string) {
    return prisma.timelineEvent.findMany({
      where: { entityId: id },
      orderBy: { eventAt: "desc" },
      include: { case: { select: { caseId: true, title: true } } },
    });
  }
}

export const entityService = new EntityService();