// CrimeIntel — Case Service
// Centralized business logic for investigation cases.
// API routes must not contain this logic directly.

import { prisma } from "../lib/prisma";

export interface CreateCaseInput {
  title: string;
  description?: string;
  classification?: string;
  assignedInvestigator?: string;
  userId?: string;
}

export class CaseService {
  async getRecent(limit = 10) {
    return prisma.investigationCase.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { documents: true, entities: true, notes: true, activities: true } },
      },
      take: limit,
    });
  }

  async getById(id: string) {
    return prisma.investigationCase.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, email: true } },
        entities: true,
        documents: { include: { blockchainRecords: true } },
        notes: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async getByCaseId(caseId: string) {
    return prisma.investigationCase.findUnique({ where: { caseId } });
  }

  async createCase(input: CreateCaseInput) {
    // Generate next case ID (sequential, e.g. CR-2026-1042).
    const last = await prisma.investigationCase.findFirst({ orderBy: { createdAt: "desc" } });
    const seq = last ? Number(last.caseId.split("-").pop()) + 1 : 1001;
    const caseNo = `CR-${new Date().getFullYear()}-${seq}`;

    const cs = await prisma.investigationCase.create({
      data: {
        caseId: caseNo,
        title: input.title,
        description: input.description,
        classification: input.classification ?? "RESTRICTED",
        assignedInvestigator: input.assignedInvestigator,
        createdById: input.userId,
      },
    });

    await prisma.caseActivity.create({
      data: { caseId: cs.id, action: "CASE_CREATED", detail: `Created case ${caseNo}`, actor: input.userId },
    });
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: "CASE_CREATED",
        detail: `Created ${caseNo}: ${input.title}`,
        status: "SUCCESS",
      },
    });

    return cs;
  }
}

export const caseService = new CaseService();