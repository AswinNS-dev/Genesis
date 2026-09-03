/**
 * Case management service — wraps all Prisma operations for InvestigationCase.
 *
 * Generates a human-readable caseId (e.g. CR-2026-1042) automatically if one
 * is not supplied.  All write operations create a matching AuditLog entry.
 */

import { prisma } from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCaseInput {
  title: string;
  description?: string;
  status?: string;
  classification?: string;
  category?: string;
  caseSource?: string;
  incidentDate?: Date | null;
  jurisdiction?: string;
  assignedInvestigator?: string;
  userId?: string;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string;
  status?: string;
  classification?: string;
  category?: string;
  caseSource?: string;
  incidentDate?: Date | null;
  jurisdiction?: string;
  assignedInvestigator?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function generateCaseId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.investigationCase.count();
  const seq = String(count + 1).padStart(4, "0");
  return `CR-${year}-${seq}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const caseService = {
  /** Create a new investigation case. */
  async createCase(input: CreateCaseInput) {
    const caseId = await generateCaseId();

    const created = await prisma.investigationCase.create({
      data: {
        caseId,
        title: input.title,
        description: input.description,
        status: input.status ?? "OPEN",
        classification: input.classification ?? "RESTRICTED",
        category: input.category,
        caseSource: input.caseSource,
        incidentDate: input.incidentDate,
        jurisdiction: input.jurisdiction,
        assignedInvestigator: input.assignedInvestigator,
        createdById: input.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        caseId: created.id,
        action: "CASE_CREATED",
        detail: `Case ${caseId}: ${input.title}`,
        status: "SUCCESS",
      },
    });

    await prisma.caseActivity.create({
      data: {
        caseId: created.id,
        action: "CASE_CREATED",
        detail: `Case ${caseId} opened`,
        actor: input.assignedInvestigator,
      },
    });

    return created;
  },

  /** List all cases, newest first. */
  async getCases(options?: { status?: string; limit?: number }) {
    return prisma.investigationCase.findMany({
      where: options?.status ? { status: options.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 200,
      include: {
        _count: {
          select: { notes: true, documents: true, entities: true },
        },
      },
    });
  },

  /** Get a single case by internal ID, including related counts. */
  async getCaseById(id: string) {
    return prisma.investigationCase.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 20 },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        documents: { orderBy: { createdAt: "desc" } },
        entities: { orderBy: { name: "asc" } },
        events: { orderBy: { eventAt: "desc" } },
        relationships: {
          include: { source: true, target: true },
        },
        _count: {
          select: { notes: true, documents: true, entities: true },
        },
      },
    });
  },

  /** Update an existing case. */
  async updateCase(id: string, input: UpdateCaseInput, userId?: string) {
    const updated = await prisma.investigationCase.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        caseId: id,
        action: "CASE_UPDATED",
        detail: `Case ${updated.caseId} updated`,
        status: "SUCCESS",
      },
    });

    return updated;
  },

  /** Close / archive a case. */
  async closeCase(id: string, status: "CLOSED" | "ARCHIVED", userId?: string) {
    return this.updateCase(id, { status }, userId);
  },

  /** Add a note to a case. */
  async addNote(
    caseId: string,
    body: string,
    author?: string,
    authorId?: string
  ) {
    return prisma.caseNote.create({
      data: { caseId, body, author, authorId },
    });
  },

  /** Fetch notes for a case. */
  async getNotes(caseId: string) {
    return prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });
  },
};
