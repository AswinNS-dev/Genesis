// CrimeIntel — Mock Extraction Provider
// ============================================================
// Deterministic, rule-based entity extraction over fictional datasets.
// Implements the ExtractionProvider interface so it can be swapped for a
// real LLM/NLP provider later without changing the rest of the app.
// ============================================================

import type {
  ExtractionProvider,
  ExtractionResult,
  EntityType,
} from "../../intelligence/interfaces";

// ---- FICTIONAL demo dataset ----
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

function scanText(
  text: string,
  type: EntityType,
  candidates: string[],
  source?: ExtractionResult["source"]
): ExtractionResult[] {
  const found: ExtractionResult[] = [];
  for (const c of candidates) {
    const needle = type === "PHONE" ? c.replace(/\s+/g, "") : c;
    const hay = type === "PHONE" ? text.replace(/\s+/g, "") : text;
    if (hay.toLowerCase().includes(needle.toLowerCase())) {
      const idx = hay.toLowerCase().indexOf(needle.toLowerCase());
      const start = Math.max(0, idx - 40);
      const end = Math.min(hay.length, idx + needle.length + 40);
      found.push({
        type,
        value: c,
        context: hay.slice(start, end) + "...",
        confidence:
          type === "PERSON"
            ? 82 + Math.floor(Math.random() * 12)
            : 88 + Math.floor(Math.random() * 10),
        source,
      });
    }
  }
  return found;
}

export class MockExtractionProvider implements ExtractionProvider {
  readonly name = "mock";
  readonly version = "1.0.0";

  async extract(
    text: string,
    hints?: string[],
    source?: ExtractionResult["source"]
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [
      ...scanText(text, "PERSON", hints && hints.length ? hints : PEOPLE, source),
      ...scanText(text, "PHONE", PHONES, source),
      ...scanText(text, "VEHICLE", VEHICLES, source),
      ...scanText(text, "LOCATION", LOCATIONS, source),
      ...scanText(text, "ORGANIZATION", ORGANIZATIONS, source),
      ...(text.toLowerCase().includes("rs ") || text.toLowerCase().includes("amount")
        ? [
            {
              type: "FINANCIAL" as EntityType,
              value: "₹ 4,50,000 (alleged payment)",
              context: "Financial transfer recorded in the report...",
              confidence: 90,
              source,
            },
          ]
        : []),
      ...(text.toLowerCase().includes("january") ||
      text.toLowerCase().includes("march") ||
      text.toLowerCase().includes("february") ||
      /\b\d{1,2}\s+jan\b/i.test(text)
        ? [
            {
              type: "DATE" as EntityType,
              value: "12 Jan 2026 — 20 Mar 2026",
              context: "Dates referenced throughout the investigation report...",
              confidence: 95,
              source,
            },
          ]
        : []),
      ...EVENTS.filter((e) => text.toLowerCase().includes(e.toLowerCase())).map((e) => ({
        type: "EVENT" as EntityType,
        value: e,
        context: "Event described in report narrative...",
        confidence: 84,
        source,
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
}
