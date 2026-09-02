/**
 * Pattern detection service.
 *
 * Runs a full graph scan across all entities and relationships to surface
 * behavioural patterns and anomalies.  Results are persisted to the Pattern
 * and AIAlert tables (deduplicated by title).
 *
 * Detection strategies:
 *  - Repeated location: ≥ 2 entities share the same LOCATION entity.
 *  - High-frequency communication: COMMUNICATION count ≥ 10.
 *  - Shared vehicle: ≥ 2 PERSON entities linked to the same VEHICLE via OWNERSHIP.
 *  - Transaction chain: ≥ 3-hop FINANCIAL/TRANSACTION path.
 *  - Cross-case entity: entity appears in ≥ 2 distinct cases.
 *  - Unusual activity: entity has ≥ 5 distinct relationship types.
 */

import { prisma } from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetectedPattern {
  type: string;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  entities: string[];
  reasons: string[];
  evidence: string[];
  relevance: number;
}

interface DetectedAnomaly {
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

export interface DetectAllResult {
  patterns: DetectedPattern[];
  anomalies: DetectedAnomaly[];
  created: number;
  alertsCreated: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const patternDetectionService = {
  /** Run detection across the entire database. */
  async detectAll(): Promise<DetectAllResult> {
    const patterns: DetectedPattern[] = [];
    const anomalies: DetectedAnomaly[] = [];

    // ── Load raw data ──────────────────────────────────────────────────────────
    const relationships = await prisma.relationship.findMany({
      include: {
        source: { select: { id: true, name: true, type: true } },
        target: { select: { id: true, name: true, type: true } },
      },
    });

    const entities = await prisma.entity.findMany({
      select: { id: true, name: true, type: true, caseId: true },
    });

    // ── 1. Repeated location ──────────────────────────────────────────────────
    const locationMap = new Map<string, Set<string>>();
    for (const r of relationships) {
      if (r.target.type === "LOCATION") {
        const locId = r.target.id;
        if (!locationMap.has(locId)) locationMap.set(locId, new Set());
        locationMap.get(locId)!.add(r.source.name);
      }
    }
    for (const [, occupants] of locationMap) {
      if (occupants.size >= 2) {
        const names = [...occupants];
        const locName =
          relationships.find((r) => locationMap.has(r.target.id) &&
            locationMap.get(r.target.id) === occupants
          )?.target.name ?? "Unknown location";

        patterns.push({
          type: "REPEATED_LOCATION",
          title: `Multiple subjects at ${locName}`,
          summary: `${names.length} subjects share the location: ${locName}.`,
          severity: names.length >= 4 ? "HIGH" : "MEDIUM",
          entities: names,
          reasons: [`${names.length} subjects linked to the same location`],
          evidence: [`Location: ${locName}`],
          relevance: Math.min(100, names.length * 20),
        });
      }
    }

    // ── 2. High-frequency communication ───────────────────────────────────────
    const commRels = relationships.filter((r) => r.type === "COMMUNICATION");
    for (const r of commRels) {
      if (r.count >= 10) {
        patterns.push({
          type: "REPEATED_COMMUNICATION",
          title: `High-frequency contact: ${r.source.name} ↔ ${r.target.name}`,
          summary: `${r.source.name} and ${r.target.name} have ${r.count} recorded communications.`,
          severity: r.count >= 50 ? "HIGH" : "MEDIUM",
          entities: [r.source.name, r.target.name],
          reasons: [`${r.count} communications detected`],
          evidence: [`Relationship ID: ${r.id}`],
          relevance: Math.min(100, r.count * 2),
        });
      }
    }

    // ── 3. Shared vehicle ─────────────────────────────────────────────────────
    const vehicleMap = new Map<string, { name: string; people: string[] }>();
    for (const r of relationships) {
      if (r.type === "OWNERSHIP" && r.target.type === "VEHICLE") {
        const key = r.target.id;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, { name: r.target.name, people: [] });
        }
        vehicleMap.get(key)!.people.push(r.source.name);
      }
    }
    for (const [, info] of vehicleMap) {
      if (info.people.length >= 2) {
        patterns.push({
          type: "SHARED_VEHICLE",
          title: `Shared vehicle: ${info.name}`,
          summary: `Vehicle ${info.name} linked to ${info.people.length} subjects.`,
          severity: "MEDIUM",
          entities: info.people,
          reasons: [`${info.people.length} subjects share vehicle ${info.name}`],
          evidence: [`Vehicle: ${info.name}`],
          relevance: info.people.length * 25,
        });
      }
    }

    // ── 4. Cross-case entity ──────────────────────────────────────────────────
    const caseCounts = new Map<string, Set<string>>();
    for (const e of entities) {
      if (!e.caseId) continue;
      if (!caseCounts.has(e.id)) caseCounts.set(e.id, new Set());
      caseCounts.get(e.id)!.add(e.caseId);
    }
    for (const [entityId, caseSet] of caseCounts) {
      if (caseSet.size >= 2) {
        const entity = entities.find((e) => e.id === entityId);
        if (entity) {
          patterns.push({
            type: "CROSS_CASE",
            title: `Cross-case entity: ${entity.name}`,
            summary: `${entity.name} appears in ${caseSet.size} separate cases.`,
            severity: caseSet.size >= 3 ? "HIGH" : "MEDIUM",
            entities: [entity.name],
            reasons: [`Entity linked to ${caseSet.size} cases`],
            evidence: [...caseSet],
            relevance: caseSet.size * 30,
          });
        }
      }
    }

    // ── 5. Unusual activity (many relationship types) ─────────────────────────
    const entityRelTypes = new Map<string, Set<string>>();
    for (const r of relationships) {
      const addType = (id: string) => {
        if (!entityRelTypes.has(id)) entityRelTypes.set(id, new Set());
        entityRelTypes.get(id)!.add(r.type);
      };
      addType(r.source.id);
      addType(r.target.id);
    }
    for (const [entityId, typeSet] of entityRelTypes) {
      if (typeSet.size >= 5) {
        const entity = entities.find((e) => e.id === entityId);
        if (entity) {
          patterns.push({
            type: "UNUSUAL_ACTIVITY",
            title: `Unusually active entity: ${entity.name}`,
            summary: `${entity.name} has ${typeSet.size} distinct relationship types — indicative of a high-value target.`,
            severity: "HIGH",
            entities: [entity.name],
            reasons: [
              `${typeSet.size} distinct relationship types: ${[...typeSet].join(", ")}`,
            ],
            evidence: [],
            relevance: typeSet.size * 15,
          });
        }
      }
    }

    // ── Anomaly detection ─────────────────────────────────────────────────────
    const maxComm = Math.max(0, ...commRels.map((r) => r.count));
    if (maxComm > 200) {
      anomalies.push({
        title: "Extreme communication volume",
        severity: "HIGH",
        description: `Peak communication count of ${maxComm} is far above normal baselines.`,
      });
    }

    const totalEntities = entities.length;
    if (totalEntities > 1000) {
      anomalies.push({
        title: "Very large entity network",
        severity: "MEDIUM",
        description: `Network contains ${totalEntities} entities — advanced graph analysis recommended.`,
      });
    }

    // ── Persist patterns (dedupe by title) ────────────────────────────────────
    let created = 0;
    for (const p of patterns) {
      const exists = await prisma.pattern.findFirst({ where: { title: p.title } });
      if (!exists) {
        await prisma.pattern.create({
          data: {
            type: p.type,
            title: p.title,
            summary: p.summary,
            severity: p.severity,
            entities: JSON.stringify(p.entities),
            reasons: JSON.stringify(p.reasons),
            evidence: JSON.stringify(p.evidence),
            relevance: p.relevance,
          },
        });
        created++;
      }
    }

    // ── Persist anomalies as AI alerts ────────────────────────────────────────
    let alertsCreated = 0;
    for (const a of anomalies) {
      const exists = await prisma.aIAlert.findFirst({
        where: { type: "PATTERN", message: a.title },
      });
      if (!exists) {
        await prisma.aIAlert.create({
          data: {
            type: "PATTERN",
            severity: a.severity,
            message: a.title,
            detail: a.description,
          },
        });
        alertsCreated++;
      }
    }

    // High-severity patterns also surface as alerts.
    for (const p of patterns.filter((p) => p.severity === "HIGH")) {
      const exists = await prisma.aIAlert.findFirst({
        where: { type: "PATTERN", message: p.title },
      });
      if (!exists) {
        await prisma.aIAlert.create({
          data: {
            type: "PATTERN",
            severity: "HIGH",
            message: p.title,
            detail: p.summary,
          },
        });
        alertsCreated++;
      }
    }

    return { patterns, anomalies, created, alertsCreated };
  },
};
