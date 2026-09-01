// CrimeIntel — Pattern Detection Service
// ============================================================
// Runs the pluggable pattern + anomaly detectors over the *entire*
// intelligence graph (all cases) rather than a single case, then
// persists:
//   - Pattern rows     (deduped by title)
//   - AIAlert rows     (deduped by type + message)
//
// Detection logic itself lives in the registered AI providers
// (see backend/ai/providers) — this service only assembles context,
// executes, and persists results.
// ============================================================

import { prisma } from "../lib/prisma";
import type { AnalysisContext, DetectedPattern, AnomalyResult } from "../intelligence/interfaces";
import { analysisService } from "./analysis.service";

export interface PatternSummary {
  id: string;
  type: string;
  title: string;
  severity: string;
  relevance: number;
}

export interface AnomalySummary {
  type: string;
  title: string;
  severity: string;
  confidence: number;
}

export interface DetectionRunResult {
  created: number;
  updated: number;
  patterns: PatternSummary[];
  anomalies: AnomalySummary[];
  alertsCreated: number;
}

function safeJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export class PatternDetectionService {
  /**
   * Detect patterns + anomalies across all cases and persist results.
   */
  async detectAll(): Promise<DetectionRunResult> {
    const [entities, relationships, datasetEntities, candidates] = await Promise.all([
      prisma.entity.findMany({
        include: {
          timelineEvents: { select: { type: true } },
          case: { select: { caseId: true } },
        },
      }),
      prisma.relationship.findMany({
        include: {
          source: { select: { id: true, name: true, type: true } },
          target: { select: { id: true, name: true, type: true } },
          case: { select: { caseId: true } },
        },
      }),
      prisma.datasetEntity.findMany({
        include: {
          dataset: { select: { name: true } },
          entity: { select: { name: true } },
        },
      }),
      prisma.extractionCandidate.findMany({
        where: { status: { in: ["CONFIRMED", "PENDING"] } },
        include: { document: { select: { name: true } } },
      }),
    ]);

    const context = this.buildContext(entities, relationships, datasetEntities, candidates);
    const [patterns, anomalies] = await Promise.all([
      analysisService.detectPatterns(context),
      analysisService.detectAnomalies(context),
    ]);

    // ---- Persist patterns (dedupe by title) ----
    let created = 0;
    let updated = 0;
    const persisted: PatternSummary[] = [];
    for (const p of patterns) {
      const exists = await prisma.pattern.findFirst({ where: { title: p.title } });
      if (exists) {
        if (p.relevance > exists.relevance) {
          await prisma.pattern.update({
            where: { id: exists.id },
            data: { relevance: p.relevance, severity: p.severity, summary: p.summary, reasons: JSON.stringify(p.reasons), evidence: JSON.stringify(p.evidence) },
          });
          updated++;
        }
        persisted.push({ id: exists.id, type: p.type, title: p.title, severity: p.severity, relevance: p.relevance });
      } else {
        const rec = await prisma.pattern.create({
          data: {
            type: p.type,
            title: p.title,
            summary: p.summary,
            severity: p.severity,
            entities: JSON.stringify(p.entities ?? []),
            reasons: JSON.stringify(p.reasons),
            evidence: JSON.stringify(p.evidence),
            relevance: p.relevance,
          },
        });
        created++;
        persisted.push({ id: rec.id, type: p.type, title: rec.title, severity: rec.severity, relevance: rec.relevance });
      }
    }

    // ---- Persist alerts (dedupe by type + message) ----
    const alertSeeds: { severity: string; message: string; detail: string | null }[] = patterns
      .filter((p) => p.severity === "HIGH" || p.severity === "MEDIUM")
      .map((p) => ({ severity: p.severity, message: p.title, detail: p.summary }));
    for (const a of anomalies) {
      alertSeeds.push({ severity: a.severity, message: a.title, detail: a.description });
    }

    let alertsCreated = 0;
    for (const seed of alertSeeds) {
      const exists = await prisma.aIAlert.findFirst({
        where: { type: "PATTERN", message: seed.message },
      });
      if (!exists) {
        await prisma.aIAlert.create({ data: { type: "PATTERN", severity: seed.severity, message: seed.message, detail: seed.detail } });
        alertsCreated++;
      }
    }

    return {
      created,
      updated,
      patterns: persisted,
      anomalies: anomalies.map((a) => ({ type: a.type, title: a.title, severity: a.severity, confidence: a.confidence })),
      alertsCreated,
    };
  }

  /**
   * Assemble a full-graph AnalysisContext from database state.
   */
  private buildContext(
    entities: {
      id: string;
      name: string;
      type: string;
      aliases: string | null;
      caseId: string | null;
      timelineEvents: { type: string }[];
      case: { caseId: string } | null;
    }[],
    relationships: {
      type: string;
      count: number;
      strength: number;
      source: { id: string; name: string; type: string };
      target: { id: string; name: string; type: string };
      case: { caseId: string } | null;
    }[],
    datasetEntities: { entity: { name: string }; dataset: { name: string } }[],
    candidates: { value: string; document: { name: string } }[]
  ): AnalysisContext {
    // Person names for alias resolution
    const personNames = new Set(entities.filter((e) => e.type === "PERSON").map((e) => e.name));
    const aliasByEntity = new Map<string, string[]>();
    for (const e of entities) {
      const aliases = safeJsonArray(e.aliases).filter((a) => personNames.has(a));
      if (aliases.length) aliasByEntity.set(e.name, aliases);
    }

    // ---- Cross-case recurrence ----
    const caseSets = new Map<string, Set<string>>();
    const addCase = (name: string, caseId: string | null | undefined) => {
      if (!caseId || !name) return;
      const s = caseSets.get(name) ?? new Set<string>();
      s.add(caseId);
      caseSets.set(name, s);
    };
    for (const e of entities) {
      addCase(e.name, e.case?.caseId ?? e.caseId);
    }
    for (const r of relationships) {
      addCase(r.source.name, r.case?.caseId);
      addCase(r.target.name, r.case?.caseId);
    }
    // Merge alias case-sets (e.g. Rahul Kumar ↔ R. Kumar)
    for (const [name, aliases] of aliasByEntity) {
      const union = new Set<string>(caseSets.get(name) ?? []);
      for (const a of aliases) for (const c of caseSets.get(a) ?? []) union.add(c);
      for (const c of union) {
        const s = caseSets.get(name) ?? new Set<string>();
        s.add(c);
        caseSets.set(name, s);
      }
    }
    const crossCases = Array.from(caseSets.entries())
      .map(([name, ids]) => ({ name, caseIds: Array.from(ids) }))
      .filter((cc) => cc.caseIds.length >= 2)
      .sort((a, b) => b.caseIds.length - a.caseIds.length);

    // ---- Locations, calls, vehicles, chains, accounts ----
    const locMap = new Map<string, string[]>();
    const callList: { a: string; b: string; count: number }[] = [];
    const vehMap = new Map<string, string[]>();
    const chains = new Set<string>();
    const acctMap = new Map<string, string[]>();

    for (const r of relationships) {
      const s = r.source;
      const t = r.target;
      if (r.type === "COMMUNICATION") {
        callList.push({ a: s.name, b: t.name, count: r.count });
      } else if (r.type === "LOCATION" && t.type === "LOCATION") {
        const arr = locMap.get(t.name) ?? [];
        arr.push(s.name);
        locMap.set(t.name, arr);
      } else if (r.type === "OWNERSHIP" && t.type === "VEHICLE") {
        const arr = vehMap.get(t.name) ?? [];
        arr.push(s.name);
        vehMap.set(t.name, arr);
      } else if (r.type === "FINANCIAL" || r.type === "TRANSACTION") {
        chains.add(`${s.name} -> ${t.name}`);
        if (t.type === "BANK_ACCOUNT" || t.type === "FINANCIAL" || t.type === "TRANSACTION") {
          const arr = acctMap.get(t.name) ?? [];
          arr.push(s.name);
          acctMap.set(t.name, arr);
        }
      }
    }

    // ---- Multi-source footprint (datasets + evidence documents) ----
    const sourcesByName = new Map<string, Set<string>>();
    const addSource = (name: string, source: string) => {
      if (!name || !source) return;
      const s = sourcesByName.get(name) ?? new Set<string>();
      s.add(source);
      sourcesByName.set(name, s);
    };
    for (const de of datasetEntities) addSource(de.entity.name, de.dataset.name);
    for (const c of candidates) addSource(c.value, c.document.name);
    const dataSources = Array.from(sourcesByName.entries())
      .map(([name, sources]) => ({ name, sources: Array.from(sources) }))
      .filter((ds) => ds.sources.length >= 2);

    const people = entities
      .filter((e) => e.type === "PERSON")
      .map((e) => ({ name: e.name, events: e.timelineEvents.map((ev) => ({ type: ev.type })) }));

    return {
      people,
      organizations: entities.filter((e) => e.type === "ORGANIZATION").map((e) => e.name),
      calls: callList,
      locations: Array.from(locMap.entries()).map(([name, list]) => ({ name, entities: Array.from(new Set(list)) })),
      sharedVehicles: Array.from(vehMap.entries()).map(([vehicle, list]) => ({ vehicle, people: Array.from(new Set(list)) })),
      transactionChains: Array.from(chains),
      crossCases,
      dataSources,
      financialAccounts: Array.from(acctMap.entries()).map(([account, list]) => ({ account, entities: Array.from(new Set(list)) })),
    };
  }
}

export const patternDetectionService = new PatternDetectionService();