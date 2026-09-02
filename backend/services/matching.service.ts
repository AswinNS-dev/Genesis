// CrimeIntel — Dataset Matching & Merge Service
//
// Stage 04 (entity matching) and stage 05 (review & merge) of the data
// pipeline. Matching is deterministic, rule-based and explainable; it NEVER
// auto-merges. Results are always framed as potential matches requiring an
// investigator decision, and every decision is audited.

import { prisma } from "../lib/prisma";
import { datasetService } from "./dataset.service";

const MATCH_THRESHOLD = 60;
const MAX_SCORE = 99;

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

function safeAliases(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return Array.isArray(JSON.parse(raw)) ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function parseNormalized(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function tokenOverlap(a: string, b: string): boolean {
  const at = a.split(" ").filter(Boolean);
  const bt = b.split(" ").filter(Boolean);
  if (at.length === 0 || bt.length === 0) return false;
  if (at.length > 1 && bt.length > 1) {
    return at.filter((t) => bt.includes(t)).length >= Math.min(at.length, bt.length) / 2;
  }
  return at.some((t) => bt.some((q) => q === t || q.includes(t) || t.includes(q)));
}

interface CandidateLike {
  id: string;
  name: string;
  type: string;
  idNorm: string;
}

export class MatchingService {
  /**
   * Score every UNMATCHED record in a dataset against the entity registry.
   * Records meeting the confidence threshold become CANDIDATE (potential
   * matches) requiring review. Never merges automatically.
   */
  async runMatching(datasetId: string, actorName?: string) {
    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) throw new Error("Dataset not found");
    if (dataset.status !== "READY") {
      throw new Error(`Dataset is ${dataset.status.toLowerCase()} — run ingestion first`);
    }

    const records = await prisma.datasetRecord.findMany({
      where: { datasetId, matchStatus: "UNMATCHED" },
    });

    const [persons, orgs, vehicles, phones] = await Promise.all([
      prisma.entity.findMany({ where: { type: "PERSON" } }),
      prisma.entity.findMany({ where: { type: "ORGANIZATION" } }),
      prisma.entity.findMany({ where: { type: "VEHICLE" } }),
      prisma.entity.findMany({
        where: { type: "PHONE" },
        include: {
          targetRelationships: {
            where: { type: "OWNERSHIP" },
            select: { source: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    // name/alias → entity lookup for persons & organizations
    const byName = new Map<string, CandidateLike>();
    const considerName = (e: { id: string; name: string; type: string; aliases?: string | null }) => {
      byName.set(norm(e.name), { id: e.id, name: e.name, type: e.type, idNorm: norm(e.name) });
      for (const a of safeAliases(e.aliases as string | null)) {
        byName.set(norm(a), { id: e.id, name: e.name, type: e.type, idNorm: norm(e.name) });
      }
    };
    for (const p of persons) considerName(p);
    for (const o of orgs) considerName(o);

    // normalized phone → registered owner (person/org) via OWNERSHIP edges
    const phoneOwner = new Map<string, CandidateLike>();
    for (const p of phones) {
      const owner = p.targetRelationships[0]?.source;
      if (owner) phoneOwner.set(norm(p.name), { id: owner.id, name: owner.name, type: "PERSON", idNorm: norm(owner.name) });
    }

    const vehiclesByName = new Map<string, CandidateLike>(vehicles.map((v) => [norm(v.name), { id: v.id, name: v.name, type: v.type, idNorm: norm(v.name) }]));

    const score = async (cand: CandidateLike, fields: Record<string, string>, phone: string, vehicle: string) => {
      const reasons: string[] = [];
      let score = 0;
      const name = fields.name ? norm(fields.name) : "";
      if (name) {
        if (name === cand.idNorm) {
          score += 60;
          reasons.push("Exact name match");
        } else if (tokenOverlap(name, cand.idNorm)) {
          score += 30;
          reasons.push("Similar name");
        }
      }
      if (phone) {
        const owner = phoneOwner.get(phone);
        if (owner && owner.id === cand.id) {
          score += 35;
          reasons.push(`Phone ${phone} is registered to the entity`);
        } else if (cand.type === "PHONE" && cand.idNorm === phone) {
          score += 55;
          reasons.push("Phone number match");
        }
      }
      if (vehicle && cand.type === "VEHICLE" && cand.idNorm === vehicle) {
        score += 55;
        reasons.push("Vehicle registration match");
      }
      if (fields.address && cand.type === "PERSON") {
        const addrTokens = norm(fields.address).split(" ").filter((t) => t.length > 3);
        let locationHint = false;
        for (const t of addrTokens) {
          if (cand.idNorm.includes(t) || (await candidateLocationIncludes(cand.id, t))) {
            locationHint = true;
            break;
          }
        }
        if (locationHint) {
          score += 10;
          reasons.push("Shared location hint");
        }
      }
      return { score: Math.min(score, MAX_SCORE), reasons };
    };

    let candidatesCreated = 0;
    const touched: { id: string; candidateId: string | null; confidence: number; reasons: string[] }[] = [];

    for (const r of records) {
      const fields = parseNormalized(r.normalized);
      const phone = fields.phone ? norm(fields.phone) : "";
      const vehicle = fields.vehicle ? norm(fields.vehicle) : "";
      const name = fields.name ? norm(fields.name) : "";

      const pool: CandidateLike[] = [];
      const byNameCand = name.length > 0 ? byName.get(name) : undefined;
      if (byNameCand) pool.push(byNameCand);
      else if (name.length > 1) {
        for (const [key, cand] of byName) {
          if (tokenOverlap(name, key)) pool.push(cand);
        }
      }
      if (phone) {
        const owner = phoneOwner.get(phone);
        if (owner) pool.push(owner);
      }
      if (vehicle) {
        const v = vehiclesByName.get(vehicle);
        if (v) pool.push(v);
      }

      let best: { score: number; cand: CandidateLike; reasons: string[] } | null = null;
      const seen = new Set<string>();
      for (const cand of pool) {
        if (seen.has(cand.id)) continue;
        seen.add(cand.id);
        const s = await score(cand, fields, phone, vehicle);
        if (s.score >= MATCH_THRESHOLD && (!best || s.score > best.score)) {
          best = { score: s.score, cand, reasons: s.reasons };
        }
      }

      if (best) {
        await prisma.datasetRecord.update({
          where: { id: r.id },
          data: {
            matchStatus: "CANDIDATE",
            matchCandidateId: best.cand.id,
            matchConfidence: best.score,
            matchReasons: JSON.stringify(best.reasons),
          },
        });
        candidatesCreated++;
      }
      touched.push({ id: r.id, candidateId: best?.cand.id ?? null, confidence: best?.score ?? 0, reasons: best?.reasons ?? [] });
    }

    await prisma.dataset.update({ where: { id: datasetId }, data: { status: "READY" } });
    if (dataset.caseId) {
      await prisma.caseActivity.create({
        data: {
          caseId: dataset.caseId,
          action: "DATASET_MATCHED",
          detail: `${records.length} record${records.length === 1 ? "" : "s"} scored — ${candidatesCreated} potential match${candidatesCreated === 1 ? "" : "es"} flagged`,
          actor: actorName ?? "system",
        },
      }).catch(() => undefined);
    }

    const summary = await datasetService.summary(datasetId);
    return { matched: candidatesCreated, scored: records.length, summary, touches: touched };
  }

  /**
   * Investigators approve (merge into the candidate entity) or reject a
   * potential match. Every decision is recorded for audit; a merge folds the
   * source record name into the entity's aliases so search stays consistent.
   */
  async review(recordId: string, decision: "approve" | "reject", actor: { id?: string; name?: string }) {
    const record = await prisma.datasetRecord.findUnique({
      where: { id: recordId },
      include: { dataset: { select: { name: true, caseId: true } } },
    });
    if (!record) throw new Error("Record not found");
    if (record.matchStatus !== "CANDIDATE") throw new Error("Only potential (candidate) matches can be reviewed");
    if (!record.matchCandidateId) throw new Error("Record has no candidate entity to review");

    const candidate = await prisma.entity.findUnique({ where: { id: record.matchCandidateId } });
    if (!candidate) throw new Error("Candidate entity not found");

    const detail = `[${record.dataset.name}] "${cleanName(record)}" ↔ "${candidate.name}"`;

    if (decision === "approve") {
      const fields = parseNormalized(record.normalized);
      const sourceName = (fields.name ?? "").trim();
      if (sourceName) {
        const aliases = Array.from(new Set([...safeAliases(candidate.aliases), sourceName]));
        await prisma.entity.update({ where: { id: candidate.id }, data: { aliases: JSON.stringify(aliases) } });
      }
      await prisma.datasetRecord.update({
        where: { id: recordId },
        data: { matchStatus: "MERGED", mergedEntityId: candidate.id, reviewedById: actor.id, reviewedAt: new Date() },
      });
      await prisma.datasetEntity.upsert({
        where: { datasetId_recordId_entityId: { datasetId: record.datasetId, recordId: record.id, entityId: candidate.id } },
        create: { datasetId: record.datasetId, recordId: record.id, entityId: candidate.id, role: "MERGED" },
        update: { role: "MERGED" },
      });
      await prisma.auditLog.create({
        data: { userId: actor.id, action: "DATASET_RECORD_MERGED", detail, status: "SUCCESS" },
      });
    } else {
      await prisma.datasetRecord.update({
        where: { id: recordId },
        data: { matchStatus: "SKIPPED", reviewedById: actor.id, reviewedAt: new Date() },
      });
      await prisma.auditLog.create({
        data: { userId: actor.id, action: "DATASET_RECORD_SKIPPED", detail, status: "SUCCESS" },
      });
    }

    if (record.dataset.caseId) {
      await prisma.caseActivity.create({
        data: {
          caseId: record.dataset.caseId,
          action: decision === "approve" ? "DATASET_RECORD_MERGED" : "DATASET_RECORD_SKIPPED",
          detail,
          actor: actor.name ?? "system",
        },
      }).catch(() => undefined);
    }

    return { ok: true, decision, candidate: candidate.name };
  }
}

function cleanName(record: { normalized: string | null }): string {
  const fields = parseNormalized(record.normalized);
  return (fields.name ?? "(unnamed record)").trim();
}

// Conservative shared-location hint: does this person have a linked location
// whose name contains the token? Queries the graph edge lab — cheap at demo scale.
async function candidateLocationIncludes(entityId: string, token: string): Promise<boolean> {
  const links = await prisma.relationship.findMany({
    where: { OR: [{ sourceId: entityId }, { targetId: entityId }], type: "LOCATION" },
    select: { sourceId: true, targetId: true },
  });
  for (const l of links) {
    const other = l.sourceId === entityId ? l.targetId : l.sourceId;
    const loc = await prisma.entity.findUnique({ where: { id: other }, select: { name: true } });
    if (loc && norm(loc.name).includes(token)) return true;
  }
  return false;
}

export const matchingService = new MatchingService();