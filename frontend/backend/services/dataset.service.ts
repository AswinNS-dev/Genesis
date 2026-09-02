/**
 * Dataset service — manages dataset metadata, status transitions, and
 * aggregated summaries for the Data Workspace.
 */

import { prisma } from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DatasetSummary {
  total: number;
  matched: number;
  unmatched: number;
  merged: number;
  skipped: number;
  byMatchStatus: Record<string, number>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const datasetService = {
  /** List all datasets, newest first, optionally filtered by case. */
  async list(caseId?: string) {
    return prisma.dataset.findMany({
      where: caseId ? { caseId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { records: true } },
        case: { select: { id: true, caseId: true, title: true } },
      },
    });
  },

  /** Retrieve a single dataset by ID. */
  async getById(id: string) {
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        _count: { select: { records: true } },
        case: { select: { id: true, caseId: true, title: true } },
      },
    });
    if (!dataset) throw new Error(`Dataset not found: ${id}`);
    return dataset;
  },

  /**
   * Build a record-level summary for a dataset.
   *
   * Groups DatasetRecord rows by matchStatus and returns totals useful for
   * the progress display in the Data Workspace.
   */
  async summary(id: string): Promise<DatasetSummary> {
    const groups = await prisma.datasetRecord.groupBy({
      by: ["matchStatus"],
      where: { datasetId: id },
      _count: { id: true },
    });

    const byMatchStatus: Record<string, number> = {};
    for (const g of groups) {
      byMatchStatus[g.matchStatus] = g._count.id;
    }

    const total = Object.values(byMatchStatus).reduce((a, b) => a + b, 0);

    return {
      total,
      matched: byMatchStatus["CANDIDATE"] ?? 0,
      unmatched: byMatchStatus["UNMATCHED"] ?? 0,
      merged: byMatchStatus["MERGED"] ?? 0,
      skipped: byMatchStatus["SKIPPED"] ?? 0,
      byMatchStatus,
    };
  },

  /** Update dataset status. */
  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string
  ) {
    return prisma.dataset.update({
      where: { id },
      data: {
        status,
        ...(errorMessage ? { error: errorMessage } : {}),
        updatedAt: new Date(),
      },
    });
  },

  /** Fetch the records for a dataset, with optional status filter. */
  async getRecords(
    datasetId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ) {
    return prisma.datasetRecord.findMany({
      where: {
        datasetId,
        ...(options?.status ? { matchStatus: options.status } : {}),
      },
      orderBy: [{ matchConfidence: "desc" }, { rowIndex: "asc" }],
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
      include: {
        matchCandidate: { select: { id: true, name: true, type: true } },
        mergedEntity: { select: { id: true, name: true, type: true } },
      },
    });
  },

  /** Mark a dataset record as reviewed (merged or skipped). */
  async reviewRecord(
    recordId: string,
    decision: "approve" | "reject",
    reviewer: { id?: string; name?: string }
  ) {
    const record = await prisma.datasetRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new Error(`Record not found: ${recordId}`);

    const newStatus = decision === "approve" ? "MERGED" : "SKIPPED";

    const updated = await prisma.datasetRecord.update({
      where: { id: recordId },
      data: {
        matchStatus: newStatus,
        reviewedAt: new Date(),
        reviewedById: reviewer.id,
      },
    });

    if (decision === "approve" && record.matchCandidateId) {
      // When merging, record the DatasetEntity link.
      const existingLink = await prisma.datasetEntity.findFirst({
        where: {
          datasetId: record.datasetId,
          recordId,
          entityId: record.matchCandidateId,
        },
      });
      if (!existingLink) {
        await prisma.datasetEntity.create({
          data: {
            datasetId: record.datasetId,
            recordId,
            entityId: record.matchCandidateId,
            role: "MERGED",
          },
        });
      }

      await prisma.datasetRecord.update({
        where: { id: recordId },
        data: { mergedEntityId: record.matchCandidateId },
      });
    }

    return updated;
  },
};
