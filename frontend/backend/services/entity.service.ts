/**
 * Entity registry service — manages the creation, retrieval, search, and
 * relationship operations for intelligence entities.
 */

import { prisma } from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateEntityInput {
  type: string;
  name: string;
  aliases?: string[];
  value?: string;
  metadata?: Record<string, unknown>;
  riskScore?: number;
  caseId?: string;
}

export interface CreateRelationshipInput {
  type: string;
  label?: string;
  sourceId: string;
  targetId: string;
  strength?: number;
  count?: number;
  records?: string[];
  caseId?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const entityService = {
  /** Create a new entity, merging aliases if one with the same name+type exists. */
  async create(input: CreateEntityInput) {
    const existing = await prisma.entity.findFirst({
      where: { type: input.type, name: input.name },
    });

    if (existing) {
      // Merge aliases.
      const existingAliases: string[] = existing.aliases
        ? (JSON.parse(existing.aliases) as string[])
        : [];
      const mergedAliases = Array.from(
        new Set([...existingAliases, ...(input.aliases ?? [])])
      );
      return prisma.entity.update({
        where: { id: existing.id },
        data: {
          aliases: JSON.stringify(mergedAliases),
          metadata: input.metadata
            ? JSON.stringify(input.metadata)
            : existing.metadata,
          riskScore: Math.max(existing.riskScore, input.riskScore ?? 0),
        },
      });
    }

    return prisma.entity.create({
      data: {
        type: input.type,
        name: input.name,
        aliases: input.aliases ? JSON.stringify(input.aliases) : undefined,
        value: input.value,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        riskScore: input.riskScore ?? 0,
        caseId: input.caseId,
      },
    });
  },

  /** List entities, optionally filtered by case or type. */
  async list(options?: { caseId?: string; type?: string; limit?: number }) {
    return prisma.entity.findMany({
      where: {
        ...(options?.caseId ? { caseId: options.caseId } : {}),
        ...(options?.type ? { type: options.type } : {}),
      },
      orderBy: { name: "asc" },
      take: options?.limit ?? 500,
    });
  },

  /** Retrieve a single entity with its relationships. */
  async getById(id: string) {
    return prisma.entity.findUnique({
      where: { id },
      include: {
        sourceRelationships: { include: { target: true } },
        targetRelationships: { include: { source: true } },
      },
    });
  },

  /**
   * Full-text search across entity names and aliases.
   * Uses SQLite LIKE — replace with FTS when moving to Postgres.
   */
  async search(query: string, limit: number = 25) {
    if (!query.trim()) return [];

    const q = `%${query.trim()}%`;
    return prisma.entity.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { aliases: { contains: query } },
          { value: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { riskScore: "desc" },
      take: limit,
    });
  },

  /** Create a relationship between two entities. */
  async createRelationship(input: CreateRelationshipInput) {
    // Upsert: increment count if the same edge type already exists.
    const existing = await prisma.relationship.findFirst({
      where: {
        type: input.type,
        sourceId: input.sourceId,
        targetId: input.targetId,
      },
    });

    if (existing) {
      const existingRecords: string[] = existing.records
        ? (JSON.parse(existing.records) as string[])
        : [];
      const merged = Array.from(
        new Set([...existingRecords, ...(input.records ?? [])])
      );
      return prisma.relationship.update({
        where: { id: existing.id },
        data: {
          count: existing.count + (input.count ?? 1),
          strength: Math.max(existing.strength, input.strength ?? 0),
          records: JSON.stringify(merged),
        },
      });
    }

    return prisma.relationship.create({
      data: {
        type: input.type,
        label: input.label,
        sourceId: input.sourceId,
        targetId: input.targetId,
        strength: input.strength ?? 0,
        count: input.count ?? 1,
        records: input.records ? JSON.stringify(input.records) : undefined,
        caseId: input.caseId,
      },
    });
  },

  /** Fetch all entity matches (deduplication candidates). */
  async getMatches(status?: string) {
    return prisma.entityMatch.findMany({
      where: status ? { status } : undefined,
      include: {
        entityA: true,
        entityB: true,
      },
      orderBy: { confidence: "desc" },
    });
  },

  /** Update entity risk score. */
  async updateRiskScore(id: string, riskScore: number) {
    return prisma.entity.update({ where: { id }, data: { riskScore } });
  },
};
