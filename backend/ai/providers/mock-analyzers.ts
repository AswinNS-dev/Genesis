// CrimeIntel — Mock Summarizer / Lead Generator / Pattern, Anomaly & Relationship Providers
// Deterministic rule-based implementations of the pluggable interfaces.

import type {
  SummarizerProvider,
  LeadGeneratorProvider,
  PatternDetectorProvider,
  AnomalyDetectorProvider,
  RelationshipDetectorProvider,
  EntityMatcherProvider,
  AnalysisContext,
  InvestigationSummary,
  InvestigationLead,
  DetectedPattern,
  AnomalyResult,
  DetectedRelationship,
  MatchResult,
} from "../../intelligence/interfaces";

const normE = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

function tokenOverlap(a: string, b: string): boolean {
  const at = a.split(" ").filter(Boolean);
  const bt = b.split(" ").filter(Boolean);
  if (at.length === 0 || bt.length === 0) return false;
  if (at.length > 1 && bt.length > 1) {
    return at.filter((t) => bt.includes(t)).length >= Math.min(at.length, bt.length) / 2;
  }
  return at.some((t) => bt.some((q) => q === t || q.includes(t) || t.includes(q)));
}

// ---------------------------------------------------------------------------
// Investigation summarizer
// ---------------------------------------------------------------------------

export class MockSummarizerProvider implements SummarizerProvider {
  readonly name = "mock";
  readonly version = "1.0.0";

  async summarize(context: AnalysisContext): Promise<InvestigationSummary> {
    const people = context.people?.map((p) => p.name) ?? [];
    const orgs = context.organizations ?? [];
    const locations = context.locations?.map((l) => l.name) ?? [];
    const patterns = context.transactionChains ?? [];
    const events = (context.events ?? []).map((e) => e.summary).filter(Boolean) as string[];
    const relationships = (context.relationships ?? []).map((r) => r.sourceName + " ↔ " + r.targetName);

    return {
      overview: `This case (${context.caseId ?? "N/A"}) centers on coordinated activity among individuals associated with a logistics operation. Evidence suggests potential coordination but requires investigator confirmation. No determination of culpability is made.`,
      keyEntities: people.slice(0, 5),
      majorRelationships: [
        ...relationships.slice(0, 4).map((r) => `Strongly linked: ${r}`),
        "Repeated communication between primary and secondary subjects",
        "Shared vehicle usage across multiple locations",
      ],
      importantPatterns: patterns.length
        ? patterns
        : ["Repeated co-location of subjects", "Cross-case entity appearances"],
      timelineHighlights: events.length ? events.slice(0, 4) : ["Early coordination phone calls", "Mid-period financial movement", "Late-period co-location"],
      investigationAreas: [
        "Verify the phone-ownership records for primary subjects",
        "Trace the movement of the shared vehicle through toll data",
        "Obtain banking records for the alleged transaction chain",
        "Corroborate the co-location events with independent CCTV",
      ],
      caveat: "AI-generated insights are investigative leads and require human verification.",
    };
  }
}

// ---------------------------------------------------------------------------
// Investigation lead generator
// ---------------------------------------------------------------------------

export class MockLeadGeneratorProvider implements LeadGeneratorProvider {
  readonly name = "mock";
  readonly version = "1.0.0";

  async generateLeads(context: AnalysisContext): Promise<InvestigationLead[]> {
    const leads: InvestigationLead[] = [];

    for (const rel of (context.relationships ?? []).slice(0, 3)) {
      leads.push({
        title: `Review ${rel.type.toLowerCase()}`,
        detail: `Examine the connection between ${rel.sourceName} and ${rel.targetName} — communication, co-location and financial records may corroborate the link. Requires verification.`,
        priority: rel.strength && rel.strength > 60 ? "HIGH" : "MEDIUM",
        relatedEntities: [rel.sourceName, rel.targetName],
      });
    }

    for (const loc of (context.locations ?? []).slice(0, 2)) {
      leads.push({
        title: `Review repeated activity at ${loc.name}`,
        detail: `Multiple subjects have been independently associated with ${loc.name}. Confirm via independent surveillance or records.`,
        priority: "MEDIUM",
        relatedEntities: loc.entities,
      });
    }

    for (const chain of (context.transactionChains ?? []).slice(0, 2)) {
      leads.push({
        title: `Review transaction chain: ${chain}`,
        detail: `A chain of financial transfers connects multiple entities. Verify origin and destination of funds with banking records.`,
        priority: "HIGH",
      });
    }

    if (!leads.length) {
      leads.push({
        title: "Broaden source material",
        detail: "Upload additional documents or records to improve coverage of this network.",
        priority: "LOW",
      });
    }

    return leads;
  }
}

// ---------------------------------------------------------------------------
// Pattern detector
// ---------------------------------------------------------------------------

export class MockPatternDetectorProvider implements PatternDetectorProvider {
  readonly name = "mock";
  readonly version = "1.0.0";

  async detectPatterns(context: AnalysisContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    for (const loc of context.locations ?? []) {
      if (loc.entities.length >= 2) {
        patterns.push({
          type: "REPEATED_LOCATION",
          title: `Repeated co-location at ${loc.name}`,
          summary: `${loc.entities.join(", ")} have each been independently associated with ${loc.name}. This may indicate a shared operational location.`,
          severity: "MEDIUM",
          reasons: [`${loc.entities.length} distinct entities linked to the same location`, "Overlapping presence periods suggest coordinated activity"],
          evidence: ["Location_Record.csv", "CCTV_Movement_Log.xlsx"],
          relevance: 78,
          entities: loc.entities,
          isPotential: true,
        });
      }
    }

    for (const call of context.calls ?? []) {
      if (call.count >= 5) {
        patterns.push({
          type: "REPEATED_COMMUNICATION",
          title: `Frequent communication: ${call.a} <-> ${call.b}`,
          summary: `${call.count} recorded communication events between ${call.a} and ${call.b} across the window. Elevated contact frequency warrants review.`,
          severity: "HIGH",
          reasons: [`${call.count} communication records observed`, "Contact frequency is elevated relative to baseline"],
          evidence: ["Communication_Record.csv"],
          relevance: 84,
          entities: [call.a, call.b],
          isPotential: true,
        });
      }
    }

    for (const v of context.sharedVehicles ?? []) {
      if (v.people.length >= 2) {
        patterns.push({
          type: "SHARED_VEHICLE",
          title: `Shared vehicle ${v.vehicle}`,
          summary: `${v.people.join(", ")} have each been linked to vehicle ${v.vehicle}. Shared transport usage is a potentially significant pattern.`,
          severity: "MEDIUM",
          reasons: ["Multiple individuals associated with one vehicle", "Vehicle appears in related cases"],
          evidence: ["Vehicle_Registry.csv"],
          relevance: 72,
          entities: v.people,
          isPotential: true,
        });
      }
    }

    // Cross-case recurrence
    for (const cc of context.crossCases ?? []) {
      if (cc.caseIds.length >= 2) {
        patterns.push({
          type: "CROSS_CASE",
          title: `${cc.name} appears across ${cc.caseIds.length} cases`,
          summary: `${cc.name} is referenced in ${cc.caseIds.join(", ")}. Recurrence across case files may indicate a central figure or duplicate identity — verify before merging.`,
          severity: cc.caseIds.length >= 3 ? "HIGH" : "MEDIUM",
          reasons: [`Referenced in ${cc.caseIds.length} distinct cases`, "Name (or alias) recurs in case metadata"],
          evidence: cc.caseIds,
          relevance: Math.min(92, 62 + cc.caseIds.length * 8),
          entities: [cc.name],
          isPotential: true,
        });
      }
    }

    // Multi-source data footprint
    for (const ds of context.dataSources ?? []) {
      if (ds.sources.length >= 3) {
        patterns.push({
          type: "MULTI_SOURCE",
          title: `${ds.name} linked from ${ds.sources.length} independent sources`,
          summary: `${ds.name} appears in ${ds.sources.join(", ")}. Overlapping independent records strengthen the investigative footprint — corroborate beyond automated links.`,
          severity: "MEDIUM",
          reasons: [`Appears in ${ds.sources.length} distinct sources`, "Records originate from separate datasets or documents"],
          evidence: ds.sources,
          relevance: Math.min(95, 62 + ds.sources.length * 8),
          entities: [ds.name],
          isPotential: true,
        });
      }
    }

    // Shared financial instrument
    for (const fa of context.financialAccounts ?? []) {
      if (fa.entities.length >= 2) {
        patterns.push({
          type: "TRANSACTION_CHAIN",
          title: `Shared financial account ${fa.account}`,
          summary: `${fa.entities.join(", ")} are each linked to ${fa.account}. A shared instrument between multiple individuals warrants financial scrutiny.`,
          severity: "HIGH",
          reasons: ["More than one individual linked to the same account", "Account appears across multiple financial records"],
          evidence: ["Transaction_Record"],
          relevance: 78,
          entities: fa.entities,
          isPotential: true,
        });
      }
    }

    for (const chain of context.transactionChains ?? []) {
      patterns.push({
        type: "TRANSACTION_CHAIN",
        title: `Transaction chain detected: ${chain}`,
        summary: `A chain of financial transfers links multiple entities: ${chain}. Funds movement across entities warrants financial review.`,
        severity: "HIGH",
        reasons: ["Multiple linked transfers form a connected chain", "Recipients overlap with flagged individuals"],
        evidence: ["Transaction_Record", "Bank_Statement"],
        relevance: 81,
        entities: chain.split(" -> "),
        isPotential: true,
      });
    }

    patterns.push({
      type: "UNUSUAL_ACTIVITY",
      title: "Unusual coordination timing",
      summary: "Peak communication and movement events cluster in a narrow late-evening window, which may indicate deliberate timing to avoid surveillance.",
      severity: "MEDIUM",
      reasons: ["Activity concentrated outside normal business hours", "Several event types co-occur in the same window"],
      evidence: ["Timeline_Event_Log.csv"],
      relevance: 66,
      isPotential: true,
    });

    return patterns;
  }
}

// ---------------------------------------------------------------------------
// Heuristic pattern detector — alternative pluggable implementation
//
// Registers a *second* provider for the same capability to demonstrate the
// pluggable architecture. Swap AI_PROVIDER=heuristic to select it; the
// default remains "mock" so live behavior is unchanged.
// ---------------------------------------------------------------------------

export class MockHeuristicPatternDetectorProvider implements PatternDetectorProvider {
  readonly name = "heuristic";
  readonly version = "2.0.0";

  async detectPatterns(context: AnalysisContext): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    for (const call of context.calls ?? []) {
      if (call.count >= 8) {
        patterns.push({
          type: "REPEATED_COMMUNICATION",
          title: `Elevated contact: ${call.a} <-> ${call.b}`,
          summary: `Heuristic rule flagged ${call.count} communication events between ${call.a} and ${call.b}.`,
          severity: "MEDIUM",
          reasons: [`${call.count} events exceed the heuristic baseline of 8`, "Contact pair recurs across records"],
          evidence: ["Communication_Record.csv"],
          relevance: Math.min(88, 55 + call.count * 2),
          entities: [call.a, call.b],
          isPotential: true,
        });
      }
    }

    for (const cc of context.crossCases ?? []) {
      if (cc.caseIds.length >= 2) {
        patterns.push({
          type: "CROSS_CASE",
          title: `${cc.name} bridges ${cc.caseIds.length} cases`,
          summary: `Heuristic rule found ${cc.name} referenced in ${cc.caseIds.join(", ")}.`,
          severity: "MEDIUM",
          reasons: [`Referenced in ${cc.caseIds.length} cases`, "Cross-case presence is a lens for review"],
          evidence: cc.caseIds,
          relevance: 60 + cc.caseIds.length * 10,
          entities: [cc.name],
          isPotential: true,
        });
      }
    }

    return patterns;
  }
}

// ---------------------------------------------------------------------------
// Anomaly detector
// ---------------------------------------------------------------------------

export class MockAnomalyDetectorProvider implements AnomalyDetectorProvider {
  readonly name = "mock";
  readonly version = "1.0.0";

  async detect(context: AnalysisContext): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];
    const calls = context.calls ?? [];

    // Communication spike detection
    for (const call of calls) {
      if (call.count >= 10) {
        results.push({
          type: "COMMUNICATION_SPIKE",
          title: `Unusually high communication between ${call.a} and ${call.b}`,
          description: `${call.count} recorded communications is elevated relative to typical contact patterns.`,
          severity: "HIGH",
          relatedEntities: [call.a, call.b],
          supportingRecords: ["Communication_Record.csv"],
          confidence: 0.85,
          reasons: ["Contact count exceeds statistical threshold", "Sustained elevated frequency"],
        });
      }
    }

    // Broad multi-source footprint anomaly
    for (const ds of context.dataSources ?? []) {
      const cc = (context.crossCases ?? []).find((c) => c.name === ds.name);
      if (ds.sources.length >= 4 || (ds.sources.length >= 2 && cc && cc.caseIds.length >= 2)) {
        results.push({
          type: "BROAD_FOOTPRINT",
          title: `${ds.name} has a broad data footprint`,
          description: `${ds.name} appears across ${ds.sources.length} independent sources${cc ? ` and ${cc.caseIds.length} cases` : ""}. A wide multi-source presence can indicate data duplication or a well-documented movement profile — verify before acting.`,
          severity: "MEDIUM",
          relatedEntities: [ds.name],
          supportingRecords: ds.sources,
          confidence: 0.8,
          reasons: ["Entity present in multiple unrelated datasets", "Multi-case recurrence", "Footprint exceeds baseline"],
        });
      }
    }

    if (!results.length) {
      results.push({
        type: "BASELINE",
        title: "No anomalies above baseline",
        description: "Patterns are within expected thresholds for the current dataset.",
        severity: "LOW",
        relatedEntities: [],
        supportingRecords: [],
        confidence: 0.9,
        reasons: ["Baseline assessment"],
      });
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Relationship detector
// Derives potential relationships from a set of entities + records.
// NOTE: In the current prototype, relationships primarily come from the
// seed/graph data directly. This provider emits relationships derived purely
// from structured record context, and is a *baseline* that real algorithms
// (transformer rankers, GNN edge predictors, etc.) can replace.
// ---------------------------------------------------------------------------

export class MockRelationshipDetectorProvider implements RelationshipDetectorProvider {
  readonly name = "mock";
  readonly version = "1.0.0";

  async detect(
    entities: { id: string; name: string; type: string }[],
    records: unknown[]
  ): Promise<DetectedRelationship[]> {
    // Baseline: co-occurrence within the provided entities.
    // Future implementations should inspect `records` for call logs,
    // transaction ledgers, shared ownership, location visits, etc.
    const persons = entities.filter((e) => e.type === "PERSON");
    const detected: DetectedRelationship[] = [];

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        detected.push({
          sourceId: persons[i].id,
          targetId: persons[j].id,
          type: "CONNECTED_TO",
          label: `Possible relationship between ${persons[i].name} and ${persons[j].name}`,
          frequency: 0,
          confidence: 0.5,
          supportingRecords: records.length ? [] : [],
        });
      }
    }

    return detected;
  }
}

// ---------------------------------------------------------------------------
// Entity matcher
// Generic, rule-based identity matcher for the entity registry. Emits
// potential duplicate/identity matches (PENDING) that investigators review —
// it never auto-merges. Real implementations (embedding models, record
// linkage algorithms) can replace this via the same interface.
// ---------------------------------------------------------------------------

export class MockEntityMatcherProvider implements EntityMatcherProvider {
  readonly name = "mock";
  readonly version = "1.0.0";
  readonly matchThreshold = 60;
  readonly maxScore = 99;

  async match(
    source: { id: string; name: string; type: string; aliases?: string[] }[],
    target: { id: string; name: string; type: string; aliases?: string[] }[]
  ): Promise<MatchResult[]> {
    const namesOf = (e: { name: string; aliases?: string[] }) => [normE(e.name), ...(e.aliases ?? []).map(normE)];
    const results: MatchResult[] = [];
    const isIdentity = (t: string) => t === "PHONE" || t === "VEHICLE" || t === "FINANCIAL";

    for (const s of source) {
      const sNames = namesOf(s);
      for (const t of target) {
        if (s.id === t.id) continue;
        const tNames = namesOf(t);

        if (isIdentity(s.type) || isIdentity(t.type)) {
          const shared = sNames.find((n) => tNames.includes(n));
          if (shared) {
            results.push({
              entityAId: s.id,
              entityBId: t.id,
              entityAName: s.name,
              entityBName: t.name,
              confidence: 60,
              reasons: [`Identity value "${shared}" matches`, isIdentity(s.type) ? `${s.type} record` : `${t.type} record`],
              strongSignals: ["Shared identity value"],
              status: "PENDING",
            });
          }
          continue;
        }

        let best = 0;
        let reason = "";
        for (const sn of sNames) {
          for (const tn of tNames) {
            if (sn === tn && best < 60) {
              best = 60;
              reason = "Exact name or alias match";
            } else if (best < 30 && tokenOverlap(sn, tn)) {
              best = 30;
              reason = "Similar names";
            }
          }
        }
        if (best >= this.matchThreshold) {
          results.push({
            entityAId: s.id,
            entityBId: t.id,
            entityAName: s.name,
            entityBName: t.name,
            confidence: best,
            reasons: [reason],
            strongSignals: [],
            status: "PENDING",
          });
        }
      }
    }

    return results;
  }
}
