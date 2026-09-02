/**
 * Entity matching service — detects potential duplicate entities across
 * datasets and the entity registry using heuristic string similarity.
 *
 * Matching strategy:
 *  1. Normalise names (lowercase, strip punctuation, collapse whitespace).
 *  2. Exact-match normalised form → CONFIRMED automatically (confidence 100).
 *  3. Prefix overlap ≥ 0.7 → CANDIDATE (confidence 70–90).
 *  4. Shared phone / vehicle value → CANDIDATE (confidence 85).
 *
 * Each discovered match is stored in EntityMatch and the DatasetRecord's
 * matchStatus is set to CANDIDATE.  Investigators then review via the
 * /api/dataset-records endpoint.
 */

import { prisma } from "../lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dice coefficient similarity between two strings (0–1). */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);

  let intersectionSize = 0;
  for (const [bg, count] of aBigrams) {
    const bCount = bBigrams.get(bg) ?? 0;
    intersectionSize += Math.min(count, bCount);
  }

  return (2 * intersectionSize) / (a.length - 1 + (b.length - 1));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const matchingService = {
  /**
   * Run the full matching pipeline against a dataset.
   *
   * For each DatasetRecord with status UNMATCHED, search the entity registry
   * for candidates.  Records that exceed the confidence threshold are flagged
   * as CANDIDATE and an EntityMatch record is created for investigator review.
   */
  async runMatching(
    datasetId: string,
    triggeredBy?: string
  ): Promise<{
    processed: number;
    candidates: number;
    autoMerged: number;
    errors: string[];
  }> {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        records: {
          where: { matchStatus: "UNMATCHED" },
        },
      },
    });

    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);
    if (dataset.records.length === 0) {
      throw new Error(
        "No unmatched records found. Run ingestion first before matching."
      );
    }

    // Update dataset status.
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { status: "MATCHING" },
    });

    // Load the full entity registry for comparison.
    const registry = await prisma.entity.findMany({
      select: { id: true, type: true, name: true, aliases: true, value: true },
    });

    let candidates = 0;
    let autoMerged = 0;
    const errors: string[] = [];

    for (const record of dataset.records) {
      try {
        const raw: Record<string, string> = record.raw
          ? (JSON.parse(record.raw) as Record<string, string>)
          : {};
        const normalized: Record<string, string> = record.normalized
          ? (JSON.parse(record.normalized) as Record<string, string>)
          : raw;

        const nameField =
          normalized.name ??
          normalized.full_name ??
          raw.name ??
          raw.full_name ??
          "";
        const phoneField = normalized.phone ?? raw.phone ?? "";

        if (!nameField) continue;

        const normName = normalize(nameField);
        let bestMatch: { entityId: string; confidence: number; reasons: string[] } | null = null;

        for (const entity of registry) {
          const reasons: string[] = [];
          let confidence = 0;

          // Exact name match.
          const entityNorm = normalize(entity.name);
          if (entityNorm === normName) {
            confidence = 100;
            reasons.push("Exact name match");
          } else {
            // Bigram similarity.
            const sim = diceSimilarity(normName, entityNorm);
            if (sim >= 0.8) {
              confidence = Math.round(sim * 100);
              reasons.push(`Name similarity: ${Math.round(sim * 100)}%`);
            }

            // Alias match.
            const aliases: string[] = entity.aliases
              ? (JSON.parse(entity.aliases) as string[])
              : [];
            for (const alias of aliases) {
              const aliasNorm = normalize(alias);
              if (aliasNorm === normName) {
                confidence = Math.max(confidence, 90);
                reasons.push("Alias exact match");
                break;
              }
              const aliasSim = diceSimilarity(normName, aliasNorm);
              if (aliasSim >= 0.85) {
                confidence = Math.max(confidence, Math.round(aliasSim * 100));
                reasons.push(`Alias similarity: ${Math.round(aliasSim * 100)}%`);
              }
            }
          }

          // Phone value match.
          if (
            phoneField &&
            entity.value &&
            normalize(phoneField) === normalize(entity.value) &&
            entity.type === "PHONE"
          ) {
            confidence = Math.max(confidence, 85);
            reasons.push("Phone number match");
          }

          if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
            bestMatch = { entityId: entity.id, confidence, reasons };
          }
        }

        if (!bestMatch || bestMatch.confidence < 60) continue;

        const isAutoMerge = bestMatch.confidence === 100;

        // Update the dataset record.
        await prisma.datasetRecord.update({
          where: { id: record.id },
          data: {
            matchStatus: isAutoMerge ? "MERGED" : "CANDIDATE",
            matchConfidence: bestMatch.confidence,
            matchCandidateId: bestMatch.entityId,
            matchReasons: JSON.stringify(bestMatch.reasons),
            ...(isAutoMerge
              ? { mergedEntityId: bestMatch.entityId, reviewedAt: new Date() }
              : {}),
          },
        });

        // Create an EntityMatch for CANDIDATE records.
        if (!isAutoMerge) {
          // Ensure there's a corresponding entity record for the dataset row
          // (create a temporary one if needed).
          let datasetEntity = await prisma.entity.findFirst({
            where: {
              name: nameField,
              type: "PERSON",
            },
          });
          if (!datasetEntity) {
            datasetEntity = await prisma.entity.create({
              data: { type: "PERSON", name: nameField },
            });
          }

          const alreadyExists = await prisma.entityMatch.findFirst({
            where: {
              entityAId: datasetEntity.id,
              entityBId: bestMatch.entityId,
            },
          });

          if (!alreadyExists) {
            await prisma.entityMatch.create({
              data: {
                entityAId: datasetEntity.id,
                entityBId: bestMatch.entityId,
                confidence: bestMatch.confidence,
                reasons: JSON.stringify(bestMatch.reasons),
                status: "PENDING",
              },
            });
          }

          candidates++;
        } else {
          autoMerged++;
        }
      } catch (err) {
        errors.push(
          `Record ${record.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Update dataset to READY status.
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { status: "READY" },
    });

    await prisma.auditLog.create({
      data: {
        action: "MATCHING_RUN",
        detail: `Dataset ${dataset.name}: ${candidates} candidates, ${autoMerged} auto-merged`,
        status: "SUCCESS",
      },
    });

    return {
      processed: dataset.records.length,
      candidates,
      autoMerged,
      errors,
    };
  },

  /**
   * Review a single DatasetRecord match — approve merges or reject.
   */
  async review(
    recordId: string,
    decision: "approve" | "reject",
    reviewer: { id?: string; name?: string }
  ) {
    const record = await prisma.datasetRecord.findUnique({
      where: { id: recordId },
      include: { dataset: true },
    });
    if (!record) throw new Error(`Record not found: ${recordId}`);
    if (record.matchStatus !== "CANDIDATE") {
      throw new Error(
        "Only potential match records (CANDIDATE) can be reviewed"
      );
    }

    const newStatus = decision === "approve" ? "MERGED" : "SKIPPED";

    const updated = await prisma.datasetRecord.update({
      where: { id: recordId },
      data: {
        matchStatus: newStatus,
        reviewedAt: new Date(),
        reviewedById: reviewer.id,
        ...(decision === "approve" && record.matchCandidateId
          ? { mergedEntityId: record.matchCandidateId }
          : {}),
      },
    });

    // If merging, create the DatasetEntity provenance link.
    if (decision === "approve" && record.matchCandidateId) {
      const exists = await prisma.datasetEntity.findFirst({
        where: {
          datasetId: record.datasetId,
          recordId,
          entityId: record.matchCandidateId,
        },
      });
      if (!exists) {
        await prisma.datasetEntity.create({
          data: {
            datasetId: record.datasetId,
            recordId,
            entityId: record.matchCandidateId,
            role: "MERGED",
          },
        });
      }

      // Update any PENDING EntityMatch to CONFIRMED.
      await prisma.entityMatch.updateMany({
        where: {
          entityBId: record.matchCandidateId,
          status: "PENDING",
        },
        data: { status: "CONFIRMED" },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: reviewer.id,
        action: "RECORD_REVIEWED",
        detail: `Record ${recordId} ${decision}d by ${reviewer.name ?? "investigator"}`,
        status: "SUCCESS",
      },
    });

    return { record: updated, decision };
  },
};
