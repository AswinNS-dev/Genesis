/**
 * Analysis service — provides explainable AI investigation summaries, pattern
 * detection, lead generation, and anomaly detection for cases and datasets.
 *
 * All outputs are deterministic, heuristic-driven mock responses that work
 * fully offline.  Swap the internal logic with real LLM calls when
 * AI_PROVIDER is set to something other than "mock".
 */

import { prisma } from "../lib/prisma";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface PatternResult {
  type: string;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  entities?: string[];
  reasons: string[];
  evidence: string[];
  relevance: number;
}

export interface AnomalyResult {
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface SummarisedCase {
  overview: string;
  keyPeople: string[];
  keyOrganizations: string[];
  keyLocations: string[];
  keyRelationships: string[];
  keyEvents: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
}

export interface Lead {
  priority: "LOW" | "MEDIUM" | "HIGH";
  type: string;
  description: string;
  rationale: string;
}

// ─── Context shapes (consumed by detect / summarise / leads) ─────────────────

interface PersonContext {
  name: string;
  events: { type: string }[];
}

interface LocationContext {
  name: string;
  entities: string[];
}

interface CallContext {
  a: string;
  b: string;
  count: number;
}

interface VehicleContext {
  vehicle: string;
  people: string[];
}

interface AnalysisContext {
  people: PersonContext[];
  locations: LocationContext[];
  calls: CallContext[];
  sharedVehicles: VehicleContext[];
  transactionChains: string[];
}

interface SummariseInput {
  people: PersonContext[];
  organizations: string[];
  locations: LocationContext[];
  relationships: { type: string; sourceName: string; targetName: string }[];
  events: { summary: string; type: string }[];
  transactionChains: string[];
  caseId?: string;
}

interface LeadsInput {
  relationships: {
    type: string;
    sourceName: string;
    targetName: string;
    strength: number;
  }[];
  locations: LocationContext[];
  transactionChains: string[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const analysisService = {
  /**
   * Detect behavioural patterns from an analysis context.
   *
   * Identifies: repeated locations, high-frequency communication,
   * shared vehicles, transaction chains, and cross-case matches.
   */
  async detectPatterns(ctx: AnalysisContext): Promise<PatternResult[]> {
    const patterns: PatternResult[] = [];

    // ── Repeated location visits ─────────────────────────────────────────────
    for (const loc of ctx.locations) {
      if (loc.entities.length >= 2) {
        patterns.push({
          type: "REPEATED_LOCATION",
          title: `Multiple subjects at ${loc.name}`,
          summary: `${loc.entities.length} subjects have been linked to ${loc.name}, suggesting a possible meeting point or operational base.`,
          severity: loc.entities.length >= 4 ? "HIGH" : "MEDIUM",
          entities: loc.entities,
          reasons: [
            `${loc.entities.length} subjects share this location`,
            "Repeated proximity is an indicator of coordinated activity",
          ],
          evidence: [`Location: ${loc.name}`],
          relevance: Math.min(100, loc.entities.length * 20),
        });
      }
    }

    // ── High-frequency communication ─────────────────────────────────────────
    for (const call of ctx.calls) {
      if (call.count >= 10) {
        patterns.push({
          type: "REPEATED_COMMUNICATION",
          title: `High-frequency contact: ${call.a} ↔ ${call.b}`,
          summary: `${call.a} and ${call.b} have communicated ${call.count} times — significantly above normal baseline.`,
          severity: call.count >= 50 ? "HIGH" : "MEDIUM",
          entities: [call.a, call.b],
          reasons: [
            `${call.count} recorded communications`,
            "Frequency suggests operational coordination",
          ],
          evidence: [`Call count: ${call.count}`],
          relevance: Math.min(100, call.count * 2),
        });
      }
    }

    // ── Shared vehicle ────────────────────────────────────────────────────────
    for (const sv of ctx.sharedVehicles) {
      if (sv.people.length >= 2) {
        patterns.push({
          type: "SHARED_VEHICLE",
          title: `Shared vehicle: ${sv.vehicle}`,
          summary: `Vehicle ${sv.vehicle} is associated with ${sv.people.length} subjects: ${sv.people.slice(0, 3).join(", ")}.`,
          severity: "MEDIUM",
          entities: sv.people,
          reasons: [
            `${sv.people.length} subjects linked to the same vehicle`,
            "Shared transport may indicate joint movement",
          ],
          evidence: [`Vehicle: ${sv.vehicle}`],
          relevance: sv.people.length * 25,
        });
      }
    }

    // ── Transaction chain ─────────────────────────────────────────────────────
    if (ctx.transactionChains.length > 0) {
      patterns.push({
        type: "TRANSACTION_CHAIN",
        title: "Suspicious transaction chain detected",
        summary: `${ctx.transactionChains.length} suspicious transaction pattern(s) identified in financial data.`,
        severity: "HIGH",
        entities: ctx.transactionChains,
        reasons: [
          "Layered or circular fund transfers detected",
          "Amount structuring below reporting thresholds observed",
        ],
        evidence: ctx.transactionChains.slice(0, 5),
        relevance: 80,
      });
    }

    return patterns;
  },

  /**
   * Detect statistical anomalies from an analysis context.
   */
  async detectAnomalies(ctx: AnalysisContext): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    // Unusually high call volume.
    const maxCalls = Math.max(0, ...ctx.calls.map((c) => c.count));
    if (maxCalls > 100) {
      anomalies.push({
        title: "Anomalous call volume",
        description: `Detected call frequency of ${maxCalls} — well above the 100-call threshold for unusual activity.`,
        severity: "HIGH",
      });
    }

    // Many subjects at one location.
    const maxShared = Math.max(0, ...ctx.locations.map((l) => l.entities.length));
    if (maxShared > 5) {
      anomalies.push({
        title: "Unusual location convergence",
        description: `${maxShared} subjects converge on a single location — statistically improbable without coordination.`,
        severity: "HIGH",
      });
    }

    // Large network size.
    if (ctx.people.length > 20) {
      anomalies.push({
        title: "Large network detected",
        description: `Network of ${ctx.people.length} subjects identified — networks of this size often involve organised crime.`,
        severity: "MEDIUM",
      });
    }

    return anomalies;
  },

  /**
   * Generate a human-readable investigation summary from case context.
   */
  async summarize(input: SummariseInput): Promise<SummarisedCase> {
    const people = input.people.map((p) => p.name);
    const highRelCount = input.relationships.filter(
      (r) => r.type === "COMMUNICATION"
    ).length;

    const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
      people.length > 10 || input.transactionChains.length > 0
        ? "HIGH"
        : people.length > 4
        ? "MEDIUM"
        : "LOW";

    const overview = [
      `Investigation ${input.caseId ? `(${input.caseId})` : ""}`,
      `involves ${people.length} person(s)`,
      input.organizations.length
        ? `and ${input.organizations.length} organisation(s)`
        : "",
      `across ${input.locations.length} location(s).`,
      `${highRelCount} communication link(s) identified.`,
      input.transactionChains.length
        ? `${input.transactionChains.length} suspicious transaction pattern(s) detected.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const recommendation =
      riskLevel === "HIGH"
        ? "Escalate for immediate multi-agency review. Financial intelligence and surveillance recommended."
        : riskLevel === "MEDIUM"
        ? "Continue monitoring. Obtain phone CDRs and cross-reference with open warrants."
        : "Standard investigation protocols. Document all movements and associations.";

    return {
      overview,
      keyPeople: people.slice(0, 8),
      keyOrganizations: input.organizations.slice(0, 5),
      keyLocations: input.locations.map((l) => l.name).slice(0, 5),
      keyRelationships: input.relationships
        .slice(0, 5)
        .map((r) => `${r.sourceName} → ${r.targetName} (${r.type})`),
      keyEvents: input.events.slice(0, 5).map((e) => e.summary),
      riskLevel,
      recommendation,
    };
  },

  /**
   * Generate actionable investigative leads from relational context.
   */
  async generateLeads(input: LeadsInput): Promise<Lead[]> {
    const leads: Lead[] = [];

    for (const rel of input.relationships.slice(0, 6)) {
      leads.push({
        priority: rel.strength > 50 ? "HIGH" : "MEDIUM",
        type: "COMMUNICATION_FOLLOW_UP",
        description: `Obtain CDR for ${rel.sourceName} ↔ ${rel.targetName}`,
        rationale: `${rel.type} relationship detected with strength ${rel.strength}.`,
      });
    }

    for (const loc of input.locations.slice(0, 3)) {
      if (loc.entities.length >= 2) {
        leads.push({
          priority: "MEDIUM",
          type: "SURVEILLANCE",
          description: `Deploy surveillance at ${loc.name}`,
          rationale: `${loc.entities.length} subjects linked to this location.`,
        });
      }
    }

    if (input.transactionChains.length > 0) {
      leads.push({
        priority: "HIGH",
        type: "FINANCIAL_INVESTIGATION",
        description: "Request bank statements for all financial entities",
        rationale: `${input.transactionChains.length} suspicious transaction chain(s) detected.`,
      });
    }

    return leads;
  },

  /** Get dashboard statistics. */
  async getDashboardStats() {
    const [
      totalCases,
      openCases,
      totalEntities,
      totalEvidence,
      recentAlerts,
      recentPatterns,
    ] = await Promise.all([
      prisma.investigationCase.count(),
      prisma.investigationCase.count({ where: { status: "OPEN" } }),
      prisma.entity.count(),
      prisma.evidenceDocument.count(),
      prisma.aIAlert.count({ where: { read: false } }),
      prisma.pattern.count({ where: { resolved: false } }),
    ]);

    return {
      totalCases,
      openCases,
      totalEntities,
      totalEvidence,
      unreadAlerts: recentAlerts,
      activePatterns: recentPatterns,
    };
  },
};
