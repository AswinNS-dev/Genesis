// CrimeIntel — Dataset Service
// Centralized business logic for ingested datasets, their records and
// entity-match review state. Matching/merge actions (Data processing
// pipeline) build on this service so the UI stays thin.

import { prisma } from "../lib/prisma";

type MatchStatus = "UNMATCHED" | "CANDIDATE" | "MERGED" | "SKIPPED";

export class DatasetService {
  /** List datasets optionally scoped to a case. */
  async list(caseId?: string) {
    return prisma.dataset.findMany({
      where: caseId ? { caseId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { records: true } } },
    });
  }

  /** Retrieve a dataset with its records, matching candidates and provenance. */
  async getById(id: string) {
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { rowIndex: "asc" },
          include: {
            matchCandidate: { select: { id: true, name: true, type: true } },
            mergedEntity: { select: { id: true, name: true, type: true } },
            reviewedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!dataset) throw new Error("Dataset not found");
    return dataset;
  }

  /** Match-status summary counts for a dataset (drives review dashboards). */
  async summary(id: string) {
    const records = await prisma.datasetRecord.findMany({
      where: { datasetId: id },
      select: { matchStatus: true },
    });
    const counts = {
      total: records.length,
      unmatched: 0,
      candidate: 0,
      merged: 0,
      skipped: 0,
    };
    for (const r of records) {
      const key = r.matchStatus as MatchStatus;
      if (key === "UNMATCHED") counts.unmatched++;
      else if (key === "CANDIDATE") counts.candidate++;
      else if (key === "MERGED") counts.merged++;
      else if (key === "SKIPPED") counts.skipped++;
    }
    return counts;
  }
}

export const datasetService = new DatasetService();