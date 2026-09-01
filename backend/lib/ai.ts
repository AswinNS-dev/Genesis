// CrimeIntel — AI abstraction layer
// ============================================================
// Provides a clean, replaceable interface for LLM / AI services.
//
// MODE = "mock" uses a deterministic, rule-based "extraction" engine that
// operates on FICTIONAL demo text, so the prototype works fully offline and
// end-to-end without any external API key.
//
// To swap in a real LLM later, implement the same exported functions against
// your provider inside a new provider file and return it from `getProvider()`.
//
// ETHICS: All AI output is phrased as investigative *leads* that require
// human verification — never as a determination of guilt.
// ============================================================

export type EntityType =
  | "PERSON"
  | "PHONE"
  | "VEHICLE"
  | "LOCATION"
  | "ORGANIZATION"
  | "FINANCIAL"
  | "DATE"
  | "EVENT";

export interface ExtractionResult {
  type: EntityType;
  value: string;
  context?: string;
  confidence: number;
}

export type { EntityType as AiEntityType };

// ---------------------------------------------------------------------------
// Provider — choose between "mock" and (future) "llm"
// ---------------------------------------------------------------------------

export type AiMode = "mock" | "llm";

export function aiMode(): AiMode {
  const mode = (process.env.AI_MODE as string | undefined) ?? "mock";
  return mode === "llm" ? "llm" : "mock";
}

// ---------------------------------------------------------------------------
// Demo extraction dataset — everything here is FICTIONAL.
// ---------------------------------------------------------------------------

const PEOPLE = [
  "Rahul Kumar",
  "Amit Sharma",
  "Suresh Verma",
  "Priya Singh",
  "Arjun Mehta",
  "R. Kumar",
  "Kavita Nair",
  "Vikram Rao",
];

const PHONES = ["9876512345", "9822013345", "9988776655", "9811223344"];

const VEHICLES = ["DL01AB1234", "KA05XY6789", "MH12CD5678"];

const LOCATIONS = ["Sector 18", "Central Market", "Industrial Area", "Vasant Vihar", "Nehru Place"];

const ORGANIZATIONS = ["ABC Logistics", "Sharma Pharma", "Mehta Imports", "Skyline Traders"];

const EVENTS = [
  "meeting at a warehouse",
  "cargo handover",
  "vehicle detention",
  "suspicious transaction",
  "coordinated movement",
];

// Detect entities inside a piece of fictional text.
function scanText(text: string, type: EntityType, candidates: string[]): ExtractionResult[] {
  const found: ExtractionResult[] = [];
  for (const c of candidates) {
    // Match with a simple case-insensitive search; normalize phone whitespace.
    const needle = type === "PHONE" ? c.replace(/\s+/g, "") : c;
    const hay = type === "PHONE" ? text.replace(/\s+/g, "") : text;
    if (hay.toLowerCase().includes(needle.toLowerCase())) {
      const idx = hay.toLowerCase().indexOf(needle.toLowerCase());
      const start = Math.max(0, idx - 40);
      const end = Math.min(hay.length, idx + needle.length + 40);
      found.push({
        type,
        value: c,
        context: hay.slice(start, end) + "…",
        confidence: type === "PERSON" ? 82 + Math.floor(Math.random() * 12) : 88 + Math.floor(Math.random() * 10),
      });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// 1. EXTRACT — pull structured entities from a document/text
// ---------------------------------------------------------------------------

export async function extractEntities(
  text: string,
  hints?: string[]
): Promise<ExtractionResult[]> {
  const mode = aiMode();
  if (mode === "llm") {
    // Placeholder for a real provider integration.
    throw new Error(
      "LLM provider not configured. Set AI_MODE=mock or implement the LLM provider in lib/ai."
    );
  }

  // Mock provider — extract from the fictional dataset plus explicit hints.
  const results: ExtractionResult[] = [
    ...scanText(text, "PERSON", hints && hints.length ? hints : PEOPLE),
    ...scanText(text, "PHONE", PHONES),
    ...scanText(text, "VEHICLE", VEHICLES),
    ...scanText(text, "LOCATION", LOCATIONS),
    ...scanText(text, "ORGANIZATION", ORGANIZATIONS),
    ...(text.toLowerCase().includes("rs ") || text.toLowerCase().includes("amount")
      ? [
          {
            type: "FINANCIAL" as const,
            value: "₹ 4,50,000 (alleged payment)",
            context: "Financial transfer recorded in the report…",
            confidence: 90,
          },
        ]
      : []),
    ...(text.toLowerCase().includes("january") ||
    text.toLowerCase().includes("march") ||
    text.toLowerCase().includes("february") ||
    /\b\d{1,2}\s+jan\b/i.test(text)
      ? [
          {
            type: "DATE" as const,
            value: "12 Jan 2026 — 20 Mar 2026",
            context: "Dates referenced throughout the investigation report…",
            confidence: 95,
          },
        ]
      : []),
    ...EVENTS.filter((e) => text.toLowerCase().includes(e.toLowerCase())).map((e) => ({
      type: "EVENT" as const,
      value: e,
      context: "Event described in report narrative…",
      confidence: 84,
    })),
  ];

  // De-duplicate by type+value, keep highest confidence.
  const seen = new Set<string>();
  return results
    .filter((r) => {
      const key = `${r.type}:${r.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// 2. SUMMARIZE — generate an investigation summary from entities/relationships
// ---------------------------------------------------------------------------

interface SummarizeInput {
  people: string[];
  organizations: string[];
  locations: string[];
  relationshipCount: number;
  relationships: string[];
  events: string[];
  patterns: string[];
  caseId: string;
}

export async function summarizeInvestigation(input: SummarizeInput): Promise<{
  overview: string;
  keyEntities: string[];
  majorRelationships: string[];
  importantPatterns: string[];
  timelineHighlights: string[];
  investigationAreas: string[];
  caveat: string;
}> {
  // Fictional, explainable summary text. Every item is a lead requiring verification.
  return {
    overview: `This case (${input.caseId}) centers on coordinated activity among individuals associated with a logistics operation. Evidence suggests potential coordination but requires investigator confirmation. No determination of culpability is made.`,
    keyEntities: input.people.slice(0, 5),
    majorRelationships: [
      ...input.relationships.slice(0, 4).map((r) => `Strongly linked: ${r}`),
      "Repeated communication between primary and secondary subjects",
      "Shared vehicle usage across multiple locations",
    ],
    importantPatterns: input.patterns.length
      ? input.patterns
      : ["Repeated co-location of subjects", "Cross-case entity appearances"],
    timelineHighlights: input.events.length
      ? input.events.slice(0, 4)
      : ["Early coordination phone calls", "Mid-period financial movement", "Late-period co-location"],
    investigationAreas: [
      "Verify the phone-ownership records for primary subjects",
      "Trace the movement of the shared vehicle through toll data",
      "Obtain banking records for the alleged transaction chain",
      "Corroborate the co-location events with independent CCTV",
    ],
    caveat:
      "AI-generated insights are investigative leads and require human verification.",
  };
}

// ---------------------------------------------------------------------------
// 3. LEADS — suggest areas for the investigator to review
// ---------------------------------------------------------------------------

export async function generateLeads(ctx: {
  relationships: { label: string; people: string[] }[];
  repeatedLocations: string[];
  transactionChains: string[];
}): Promise<{ title: string; detail: string }[]> {
  const leads: { title: string; detail: string }[] = [];
  for (const r of ctx.relationships.slice(0, 3)) {
    leads.push({
      title: `Review ${r.label}`,
      detail: `Examine the connection between ${r.people.join(" and ")} — communication, co-location and financial records may corroborate the link. Requires verification.`,
    });
  }
  for (const loc of ctx.repeatedLocations.slice(0, 2)) {
    leads.push({
      title: `Review repeated activity at ${loc}`,
      detail: `Multiple subjects have been independently associated with ${loc}. Confirm via independent surveillance or records.`,
    });
  }
  for (const chain of ctx.transactionChains.slice(0, 2)) {
    leads.push({
      title: `Review transaction chain: ${chain}`,
      detail: `A chain of financial transfers connects multiple entities. Verify origin and destination of funds with banking records.`,
    });
  }
  if (!leads.length) {
    leads.push({
      title: "Broaden source material",
      detail: "Upload additional documents or records to improve coverage of this network.",
    });
  }
  return leads;
}

// ---------------------------------------------------------------------------
// 4. PATTERN DETECTION — find potentially significant (non-conclusive) patterns
// ---------------------------------------------------------------------------

export interface DetectedPattern {
  type: string;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  evidence: string[];
  relevance: number;
  entities?: string[];
}

export async function detectPatterns(ctx: {
  people: { name: string; events: { type: string; location?: string }[] }[];
  locations: { name: string; entities: string[] }[];
  calls: { a: string; b: string; count: number }[];
  sharedVehicles: { vehicle: string; people: string[] }[];
  transactionChains: string[];
}): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  // Repeated locations (co-location) — potentially significant pattern.
  for (const loc of ctx.locations) {
    if (loc.entities.length >= 2) {
      patterns.push({
        type: "REPEATED_LOCATION",
        title: `Repeated co-location at ${loc.name}`,
        summary: `${loc.entities.join(", ")} have each been independently associated with ${loc.name}. This may indicate a shared operational location.`,
        severity: "MEDIUM",
        reasons: [
          `${loc.entities.length} distinct entities linked to the same location`,
          "Overlapping presence periods suggest coordinated activity",
        ],
        evidence: ["Location_Record.csv", "CCTV_Movement_Log.xlsx"],
        relevance: 78,
        entities: loc.entities,
      });
    }
  }

  // Repeated communication.
  for (const call of ctx.calls) {
    if (call.count >= 5) {
      patterns.push({
        type: "REPEATED_COMMUNICATION",
        title: `Frequent communication: ${call.a} ↔ ${call.b}`,
        summary: `${call.count} recorded communication events between ${call.a} and ${call.b} across the window. Elevated contact frequency warrants review.`,
        severity: "HIGH",
        reasons: [
          `${call.count} communication records observed`,
          "Contact frequency is elevated relative to baseline",
        ],
        evidence: ["Communication_Record.csv"],
        relevance: 84,
        entities: [call.a, call.b],
      });
    }
  }

  // Shared vehicles.
  for (const v of ctx.sharedVehicles) {
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
      });
    }
  }

  // Transaction chains.
  for (const chain of ctx.transactionChains) {
      patterns.push({
        type: "TRANSACTION_CHAIN",
        title: `Transaction chain detected: ${chain}`,
        summary: `A chain of financial transfers links multiple entities: ${chain}. Funds movement across entities warrants financial review.`,
        severity: "HIGH",
        reasons: ["Multiple linked transfers form a connected chain", "Recipients overlap with flagged individuals"],
        evidence: ["Transaction_Record", "Bank_Statement"],
        relevance: 81,
        entities: chain.split(" → "),
      });
  }

  // Unusual activity (fallback/generic).
  patterns.push({
    type: "UNUSUAL_ACTIVITY",
    title: "Unusual coordination timing",
    summary:
      "Peak communication and movement events cluster in a narrow late-evening window, which may indicate deliberate timing to avoid surveillance.",
    severity: "MEDIUM",
    reasons: ["Activity concentrated outside normal business hours", "Several event types co-occur in the same window"],
    evidence: ["Timeline_Event_Log.csv"],
    relevance: 66,
  });

  return patterns.slice(0, 5);
}
