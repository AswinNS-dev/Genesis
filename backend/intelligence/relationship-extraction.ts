// CrimeIntel — Relationship Extraction Engine
// ============================================================
// Automatically discovers relationships between entities from structured
// records (CDRs, financial logs, location feeds) and unstructured text
// (FIRs, police statements, surveillance reports).
//
// Conforms to SIH26189 specification:
// - Entities: PERSON, PHONE, VEHICLE, BANK_ACCOUNT, LOCATION, ORGANIZATION, CASE, FIR, TRANSACTION, DATE
// - Relations: CALLED, OWNS_VEHICLE, USES_PHONE, OWNS_BANK_ACCOUNT, TRANSFERRED_MONEY_TO,
//              MET, VISITED, ASSOCIATED_WITH_CASE, WORKS_FOR, MENTIONED_IN_FIR, CONNECTED_TO
// - Provides source, evidence text, confidence, metadata, and explainability.
// ============================================================

import type { EntityType, ExtractionResult, DetectedRelationship } from "./interfaces";

export interface ExtractedEntity {
  id?: string;
  name: string;
  type: EntityType;
  normalizedValue?: string;
  startOffset?: number;
  endOffset?: number;
  confidence: number;
}

export interface ExtractedRelationship {
  source: string;
  sourceType: EntityType;
  relationship: string;
  target: string;
  targetType: EntityType;
  timestamp?: string;
  confidence: number;
  sourceRecord?: string;
  evidenceText?: string;
  metadata?: {
    amount?: number;
    currency?: string;
    frequency?: number;
    period?: string;
    duration?: number;
    channel?: string;
    role?: string;
    location?: string;
    source?: string;
    [key: string]: unknown;
  };
  explanation: string;
}

export interface ExtractionOptions {
  sourceName?: string;
  knownEntities?: { name: string; type: EntityType; id?: string; aliases?: string[] }[];
  minConfidence?: number;
  caseId?: string;
}

// ---------------------------------------------------------------------------
// 1. Regex & Pattern Registries for Entities
// ---------------------------------------------------------------------------

const PHONE_REGEX = /(?:\+?91[\s-]?)?[6-9]\d{9}\b|\b\d{3}[-\s]\d{3}[-\s]\d{4}\b|\b\d{10,12}\b/g;
const VEHICLE_REGEX = /\b[A-Z]{2}\s*[-]?\s*\d{1,2}\s*[-]?\s*[A-Z]{1,3}\s*[-]?\s*\d{4}\b/gi;
const BANK_ACCOUNT_REGEX = /\b(?:A\/C|AC|Account|Acct)?\s*#?\s*([0-9]{9,18}|[A-Z]{4}0[A-Z0-9]{6})\b/gi;
const FIR_REGEX = /\b(?:FIR|Case\s*Diary|Crime\s*No\.?)\s*(?:No\.?|#)?\s*([A-Za-z0-9/-]+)\b/gi;
const CASE_REGEX = /\b(?:CR|CASE|DOCKET)[-\s][0-9]{4}[-\s][0-9]{3,6}\b/gi;

const COMMON_PERSON_HONORIFICS = /\b(?:Mr\.|Mrs\.|Ms\.|Shri|Smt\.|Insp\.|Inspector|SI|ASI|DCP|ACP|Dr\.|Prof\.|Sub-Inspector)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;

const INDIAN_NAME_WORDS = new Set([
  "ravi", "suresh", "arun", "rahul", "amit", "priya", "arjun", "kavita", "vikram",
  "sharma", "verma", "singh", "kumar", "mehta", "nair", "rao", "bhardwaj", "gupta",
  "patel", "reddy", "joshi", "yadav", "malhotra", "das", "chatterjee", "banerjee",
  "khan", "ali", "ahmed", "mishra", "saxena", "iyer", "rane", "deshmukh", "kapoor"
]);

const NON_PERSON_WORDS = new Set([
  "the", "a", "an", "in", "on", "at", "during", "from", "to", "after", "before", "between",
  "and", "then", "yesterday", "today", "last", "night", "day", "month", "year", "case",
  "report", "account", "vehicle", "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december", "morning", "afternoon",
  "evening", "times", "called", "transferred", "visited", "owns", "held", "recorded"
]);

const ORG_SUFFIXES = /\b(?:Logistics|Imports|Traders|Pharma|Enterprises|Solutions|Pvt\s*Ltd|Ltd|Corp|Corporation|Agency|CID|CCTV\s*Unit|Bank|SBI|HDFC|ICICI)\b/i;

const LOCATION_KEYWORDS = /\b(?:Sector\s*\d+|Industrial\s*Area|Central\s*Market|Market|Vasant\s*Vihar|Nehru\s*Place|Warehouse\s*[A-Z0-9]|Connaught\s*Place|Airport|Toll\s*Plaza|Highway|Nagar|Colony|Enclave|Marg|Road|Delhi|Mumbai|Faridabad|Gurugram|Noida|Bengaluru|Chennai|Kolkata)\b/i;

// ---------------------------------------------------------------------------
// 2. Entity Extraction Sub-Module
// ---------------------------------------------------------------------------

export class EntityDetector {
  /**
   * Identifies typed entities from unstructured text using hybrid NER rules,
   * dictionary lookup, regular expressions, and context hints.
   */
  static extractEntities(
    text: string,
    knownEntities: { name: string; type: EntityType; id?: string; aliases?: string[] }[] = []
  ): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];
    const seenSpans = new Set<string>();

    const aliasToCanonical = new Map<string, string>();
    for (const ke of knownEntities) {
      aliasToCanonical.set(ke.name.toLowerCase().trim(), ke.name);
      for (const a of ke.aliases ?? []) {
        aliasToCanonical.set(a.toLowerCase().trim(), ke.name);
      }
    }

    const addEntity = (rawName: string, type: EntityType, confidence: number, start?: number, end?: number) => {
      const trimmed = rawName.trim().replace(/[.,;:'"]+$/, "");
      if (!trimmed || trimmed.length < 2) return;
      if (type === "PERSON" && NON_PERSON_WORDS.has(trimmed.toLowerCase())) return;

      const canonical = aliasToCanonical.get(trimmed.toLowerCase()) ?? trimmed;
      const key = `${type}:${canonical.toLowerCase()}:${start ?? 0}`;
      if (seenSpans.has(key)) return;
      seenSpans.add(key);

      results.push({
        name: canonical,
        type,
        normalizedValue: this.normalizeValue(canonical, type),
        startOffset: start,
        endOffset: end,
        confidence,
      });
    };

    const isSpanCovered = (start: number, end: number) => {
      return results.some((r) => r.startOffset !== undefined && r.endOffset !== undefined && !(end <= r.startOffset || start >= r.endOffset));
    };

    // 1. Known entities & aliases match (Highest Priority)
    for (const ke of knownEntities) {
      const namesToSearch = [ke.name, ...(ke.aliases ?? [])];
      for (const alias of namesToSearch) {
        if (!alias) continue;
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "gi");
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const start = m.index + (m[0].startsWith(" ") ? 1 : 0);
          addEntity(ke.name, ke.type, 0.95, start, start + alias.length);
        }
      }
    }

    // 2. Locations & Organizations (Before single-word proper nouns)
    const locRegex = /\b(?:Sector\s*\d+|Central\s*Market|Industrial\s*Area|Vasant\s*Vihar|Nehru\s*Place|Warehouse\s*[A-Z0-9]|Delhi|Mumbai|Faridabad|Gurugram|Noida)\b/gi;
    let match: RegExpExecArray | null;
    while ((match = locRegex.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[0], "LOCATION", 0.93, match.index, match.index + match[0].length);
      }
    }

    const orgRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Logistics|Imports|Traders|Pharma|Enterprises|Solutions|Pvt\s*Ltd|Ltd|CID|CCTV\s*Unit))\b/gi;
    while ((match = orgRegex.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[1], "ORGANIZATION", 0.92, match.index, match.index + match[1].length);
      }
    }

    // 3. Phone Numbers
    while ((match = PHONE_REGEX.exec(text)) !== null) {
      const cleanDigits = match[0].replace(/[^\d]/g, "");
      if (cleanDigits.length >= 10 && cleanDigits.length <= 12) {
        if (!isSpanCovered(match.index, match.index + match[0].length)) {
          addEntity(match[0], "PHONE", 0.95, match.index, match.index + match[0].length);
        }
      }
    }

    // 4. Vehicles
    while ((match = VEHICLE_REGEX.exec(text)) !== null) {
      const v = match[0].toUpperCase().replace(/\s+/g, "");
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(v, "VEHICLE", 0.92, match.index, match.index + match[0].length);
      }
    }

    // 5. Case / FIR
    while ((match = CASE_REGEX.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[0].toUpperCase(), "CASE", 0.94, match.index, match.index + match[0].length);
      }
    }
    while ((match = FIR_REGEX.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[0], "FIR", 0.93, match.index, match.index + match[0].length);
      }
    }

    // 6. Bank Accounts
    while ((match = BANK_ACCOUNT_REGEX.exec(text)) !== null) {
      const acct = match[1] ?? match[0];
      if (acct && acct.length >= 8 && !/^\d{10}$/.test(acct)) {
        if (!isSpanCovered(match.index, match.index + match[0].length)) {
          addEntity(acct, "BANK_ACCOUNT", 0.88, match.index, match.index + match[0].length);
        }
      }
    }

    // 7. Person Names with Honorifics (e.g. Insp. A. Rane, Mr. Suresh)
    while ((match = COMMON_PERSON_HONORIFICS.exec(text)) !== null) {
      if (match[1] && !isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[1], "PERSON", 0.92, match.index, match.index + match[0].length);
      }
    }

    // 8. Full Name pairs (e.g. Suresh Verma, Priya Singh, Rahul Kumar)
    const fullNameRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+))\b/g;
    while ((match = fullNameRegex.exec(text)) !== null) {
      const val = match[1];
      const start = match.index;
      const end = start + val.length;
      if (!isSpanCovered(start, end)) {
        if (LOCATION_KEYWORDS.test(val)) {
          addEntity(val, "LOCATION", 0.90, start, end);
        } else if (!NON_PERSON_WORDS.has(val.split(" ")[0].toLowerCase())) {
          addEntity(val, "PERSON", 0.88, start, end);
        }
      }
    }

    // 9. Single Name tokens (e.g. Ravi, Suresh, Arun)
    const singleWordRegex = /\b[A-Z][a-z]+\b/g;
    while ((match = singleWordRegex.exec(text)) !== null) {
      const val = match[0];
      const start = match.index;
      const end = start + val.length;
      if (!isSpanCovered(start, end)) {
        if (INDIAN_NAME_WORDS.has(val.toLowerCase())) {
          addEntity(val, "PERSON", 0.86, start, end);
        }
      }
    }

    return results;
  }

  static normalizeValue(v: string, type: EntityType): string {
    switch (type) {
      case "PHONE": {
        let d = v.replace(/[^\d]/g, "");
        if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
        return d;
      }
      case "VEHICLE":
        return v.toUpperCase().replace(/[\s-]/g, "");
      case "PERSON":
      case "ORGANIZATION":
      case "LOCATION":
        return v.trim().replace(/\s+/g, " ");
      default:
        return v.trim();
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Unstructured Text Relationship Extraction
// ---------------------------------------------------------------------------

export class UnstructuredRelationshipExtractor {
  /**
   * Parses natural language sentences and clauses to extract semantic relationships with evidence.
   */
  static extract(text: string, options: ExtractionOptions = {}): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    const sourceDoc = options.sourceName ?? "Narrative_Report";

    // Split text into individual sentences without breaking single initials like "R." or "Insp."
    const sentences = text
      .replace(/\b([A-Z])\.\s+/g, "$1._SPACE_")
      .replace(/\b(Mr|Mrs|Ms|Dr|Insp|Prof|Shri|Smt|SI|ASI|DCP|ACP)\.\s+/gi, "$1._SPACE_")
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.replace(/_SPACE_/g, " ").trim())
      .filter((s) => s.length > 5);

    for (const fullSentence of sentences) {
      // Split compound sentences into clauses
      const rawClauses = fullSentence.split(/\s+(?:and|then|furthermore|additionally)\s+|;\s*/i);
      const sentenceEntities = EntityDetector.extractEntities(fullSentence, options.knownEntities);
      let sentenceSubject = sentenceEntities.find((e) => e.type === "PERSON")?.name ?? this.findSubject(fullSentence);

      for (const clause of rawClauses) {
        const entities = EntityDetector.extractEntities(clause, options.knownEntities);
        const startsWithVerb = /^(?:and\s+|then\s+)?(?:called|transferred|sent|paid|visited|went\s+to|seen\s+at|owns|met|drove)\b/i.test(clause.trim());

        const clauseSubject = startsWithVerb
          ? sentenceSubject
          : (entities.find((e) => e.type === "PERSON")?.name ?? this.findSubject(clause) ?? sentenceSubject);

        if (clauseSubject && !startsWithVerb) sentenceSubject = clauseSubject;

        const persons = entities.filter((e) => e.type === "PERSON");
        const phones = entities.filter((e) => e.type === "PHONE");
        const vehicles = entities.filter((e) => e.type === "VEHICLE");
        const locations = entities.filter((e) => e.type === "LOCATION");
        const accounts = entities.filter((e) => e.type === "BANK_ACCOUNT");
        const orgs = entities.filter((e) => e.type === "ORGANIZATION");
        const cases = entities.filter((e) => e.type === "CASE" || e.type === "FIR");

        // ---------------------------------------------------------
        // Rule 1: Person -> CALLED -> Person / Phone
        // Example: "Ravi called Suresh 15 times during August."
        // ---------------------------------------------------------
        const callMatch = /(?:called|phoned|dialed|contacted|spoke with|in touch with|placed a call to)\s+([A-Za-z0-9\s]+?)(?:\s+(\d+)\s*times?)?(?:\s+(?:during|in)\s+([A-Za-z0-9\s,]+))?(?:[.,;]|$)/i.exec(clause);
        if (callMatch) {
          const caller = clauseSubject ?? persons[0]?.name;
          const recipientCandidate = callMatch[1].trim().replace(/[.,;:'"]+$/, "");
          const targetPerson = persons.find((p) => p.name !== caller && recipientCandidate.toLowerCase().includes(p.name.toLowerCase())) ??
                               sentenceEntities.find((p) => p.type === "PERSON" && p.name !== caller && recipientCandidate.toLowerCase().includes(p.name.toLowerCase())) ??
                               phones.find((ph) => recipientCandidate.includes(ph.name));

          const targetName = targetPerson ? targetPerson.name : recipientCandidate.split(" ")[0];
          const targetType: EntityType = targetPerson?.type ?? (/^\d+$/.test(targetName) ? "PHONE" : "PERSON");

          const freq = callMatch[2] ? parseInt(callMatch[2], 10) : 1;
          const period = callMatch[3]?.trim().replace(/[.,;:'"]+$/, "");

          if (caller && targetName && caller.toLowerCase() !== targetName.toLowerCase()) {
            relationships.push({
              source: caller,
              sourceType: "PERSON",
              relationship: "CALLED",
              target: targetName,
              targetType,
              confidence: 0.94,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                frequency: freq,
                period: period ?? undefined,
                source: sourceDoc,
              },
              explanation: `${caller} called ${targetName} ${freq > 1 ? `${freq} times ` : ""}${period ? `during ${period}` : ""}`.trim() + ".",
            });
          }
        }

        // ---------------------------------------------------------
        // Rule 2: Person -> TRANSFERRED_MONEY_TO -> Person / Account
        // Example: "Ravi transferred ₹250000 to Arun's bank account."
        // ---------------------------------------------------------
        const transferMatch = /(?:transferred|sent|paid|wired|remitted|deposited)\s+(?:(?:₹|Rs\.?|INR|\$)\s*)?([0-9,]+(?:\.\d+)?|\d+\s*(?:lakhs?|crores?))\s*(?:(?:to|into)\s+(?:the\s+bank\s+account\s+of\s+|account\s+of\s+)?([A-Za-z0-9\s'.-]+))?/i.exec(clause);
        if (transferMatch) {
          const sender = clauseSubject ?? sentenceSubject;
          const rawAmount = transferMatch[1].replace(/,/g, "").trim();
          let amount = parseFloat(rawAmount);
          if (transferMatch[1].toLowerCase().includes("lakh")) amount = (parseFloat(rawAmount) || 1) * 100000;
          if (transferMatch[1].toLowerCase().includes("crore")) amount = (parseFloat(rawAmount) || 1) * 10000000;

          const rawRecipient = (transferMatch[2] ?? "")
            .replace(/'s\s*(?:bank\s*)?account/i, "")
            .replace(/[.,;:'"]+$/, "")
            .trim();

          const targetEntity = persons.find((p) => p.name !== sender && rawRecipient.toLowerCase().includes(p.name.toLowerCase())) ??
                               sentenceEntities.find((p) => p.name !== sender && rawRecipient.toLowerCase().includes(p.name.toLowerCase())) ??
                               accounts[0] ??
                               (rawRecipient ? { name: rawRecipient, type: "PERSON" as const } : null);

          const targetName = targetEntity ? targetEntity.name : rawRecipient;
          const targetType: EntityType = targetEntity?.type ?? "PERSON";

          if (sender && targetName && sender.toLowerCase() !== targetName.toLowerCase()) {
            relationships.push({
              source: sender,
              sourceType: "PERSON",
              relationship: "TRANSFERRED_MONEY_TO",
              target: targetName,
              targetType,
              confidence: 0.96,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                amount: isNaN(amount) ? undefined : amount,
                currency: /₹|Rs|INR/i.test(clause) ? "INR" : /\$|USD/i.test(clause) ? "USD" : "INR",
                source: sourceDoc,
              },
              explanation: `${sender} transferred ₹${amount || rawAmount} to ${targetName}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // Rule 3: Person -> OWNS / USES -> Vehicle
        // Example: "Rahul Kumar owns vehicle DL01AB1234."
        // ---------------------------------------------------------
        if (vehicles.length > 0) {
          for (const v of vehicles) {
            const ownerMatch = new RegExp(`([A-Za-z\\s]+)\\s+(?:owns|drove|was driving|uses|registered|associated with)\\s+(?:vehicle\\s+)?(?:${v.name})`, "i").exec(clause);
            const owner = ownerMatch ? ownerMatch[1].trim() : clauseSubject;
            if (owner) {
              relationships.push({
                source: owner,
                sourceType: "PERSON",
                relationship: "OWNS_VEHICLE",
                target: v.name,
                targetType: "VEHICLE",
                confidence: 0.92,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  vehicle: v.name,
                  source: sourceDoc,
                },
                explanation: `${owner} owns or operates vehicle ${v.name}.`,
              });
            }
          }
        }

        // ---------------------------------------------------------
        // Rule 4: Person -> USES / OWNS -> Phone
        // Example: "Amit Sharma uses phone number 9822013345."
        // ---------------------------------------------------------
        if (phones.length > 0 && clauseSubject) {
          for (const ph of phones) {
            if (/(?:uses|owns|holds|registered|contact number|subscriber)/i.test(clause)) {
              relationships.push({
                source: clauseSubject,
                sourceType: "PERSON",
                relationship: "USES_PHONE",
                target: ph.name,
                targetType: "PHONE",
                confidence: 0.91,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  phone: ph.name,
                  source: sourceDoc,
                },
                explanation: `${clauseSubject} is associated with phone number ${ph.name}.`,
              });
            }
          }
        }

        // ---------------------------------------------------------
        // Rule 5: Person -> VISITED / PRESENT_AT -> Location
        // Example: "Priya Singh visited Sector 18 yesterday."
        // ---------------------------------------------------------
        if (locations.length > 0 && clauseSubject) {
          for (const loc of locations) {
            if (/(?:visited|went to|seen at|present at|travelled to|located at|spotted at)/i.test(clause)) {
              relationships.push({
                source: clauseSubject,
                sourceType: "PERSON",
                relationship: "VISITED",
                target: loc.name,
                targetType: "LOCATION",
                confidence: 0.90,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  location: loc.name,
                  source: sourceDoc,
                },
                explanation: `${clauseSubject} visited location ${loc.name}.`,
              });
            }
          }
        }

        // ---------------------------------------------------------
        // Rule 6: Person -> MET -> Person
        // Example: "Arjun Mehta met Suresh Verma at Industrial Area."
        // ---------------------------------------------------------
        if (persons.length >= 2 && /(?:met|meeting|rendezvous|conferred with)/i.test(clause)) {
          const p1 = persons[0].name;
          const p2 = persons[1].name;
          if (p1.toLowerCase() !== p2.toLowerCase()) {
            const loc = locations[0]?.name;
            relationships.push({
              source: p1,
              sourceType: "PERSON",
              relationship: "MET",
              target: p2,
              targetType: "PERSON",
              confidence: 0.93,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                location: loc,
                source: sourceDoc,
              },
              explanation: `${p1} met ${p2}${loc ? ` at ${loc}` : ""}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // Rule 7: Person -> ASSOCIATED_WITH -> Case / FIR
        // Example: "Suresh Verma is associated with case CR-2026-1051."
        // ---------------------------------------------------------
        if (cases.length > 0 && clauseSubject) {
          for (const c of cases) {
            relationships.push({
              source: clauseSubject,
              sourceType: "PERSON",
              relationship: "ASSOCIATED_WITH_CASE",
              target: c.name,
              targetType: c.type,
              confidence: 0.92,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                caseId: c.name,
                source: sourceDoc,
              },
              explanation: `${clauseSubject} is referenced in case ${c.name}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // Rule 8: Person -> WORKS_FOR / OWNS -> Organization
        // Example: "Rahul Kumar works for ABC Logistics."
        // ---------------------------------------------------------
        if (orgs.length > 0 && clauseSubject) {
          for (const o of orgs) {
            const isOwner = /(?:owns|director|founded|head of|managing)/i.test(clause);
            relationships.push({
              source: clauseSubject,
              sourceType: "PERSON",
              relationship: isOwner ? "OWNS_ORGANIZATION" : "WORKS_FOR",
              target: o.name,
              targetType: "ORGANIZATION",
              confidence: 0.89,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                organization: o.name,
                role: isOwner ? "Director/Owner" : "Employee/Associate",
                source: sourceDoc,
              },
              explanation: `${clauseSubject} ${isOwner ? "owns/directs" : "works for"} ${o.name}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // Rule 9: Person -> OWNS -> Bank Account
        // Example: "Arun owns bank account HDFC0004567."
        // ---------------------------------------------------------
        if (accounts.length > 0 && clauseSubject) {
          for (const acct of accounts) {
            if (/(?:account|holds|owns|bank)/i.test(clause)) {
              relationships.push({
                source: clauseSubject,
                sourceType: "PERSON",
                relationship: "OWNS_BANK_ACCOUNT",
                target: acct.name,
                targetType: "BANK_ACCOUNT",
                confidence: 0.91,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  account: acct.name,
                  source: sourceDoc,
                },
                explanation: `${clauseSubject} holds bank account ${acct.name}.`,
              });
            }
          }
        }
      }
    }

    return this.deduplicateRelationships(relationships);
  }

  private static findSubject(sentence: string): string | null {
    const m = /^(?:Shri|Mr\.|Insp\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/.exec(sentence);
    return m ? m[1].trim() : null;
  }

  private static deduplicateRelationships(rels: ExtractedRelationship[]): ExtractedRelationship[] {
    const map = new Map<string, ExtractedRelationship>();
    for (const r of rels) {
      const key = `${r.source.toLowerCase()}:${r.relationship}:${r.target.toLowerCase()}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, r);
      } else {
        if (r.metadata?.frequency && existing.metadata?.frequency) {
          existing.metadata.frequency += r.metadata.frequency;
        }
        existing.confidence = Math.max(existing.confidence, r.confidence);
      }
    }
    return Array.from(map.values());
  }
}

// ---------------------------------------------------------------------------
// 4. Structured Data Relationship Extraction (CDRs, Transactions, Locations)
// ---------------------------------------------------------------------------

export class StructuredRelationshipExtractor {
  /**
   * Derives relationships directly from structured record objects / CSV rows.
   */
  static extractFromRecords(records: Record<string, unknown>[], sourceFileName = "structured_dataset.csv"): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const recordId = `${sourceFileName}#row_${i + 1}`;

      // Normalize keys to lowercase
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        row[k.toLowerCase().trim()] = v === null || v === undefined ? "" : String(v).trim();
      }

      // Case A: CDR / Communication Record
      const caller = row.caller || row.caller_name || row.source || row.from || row.caller_number || row.calling_party;
      const receiver = row.receiver || row.recipient || row.target || row.to || row.called_number || row.called_party || row.recipient_name;

      if (caller && receiver && caller.toLowerCase() !== receiver.toLowerCase()) {
        const duration = parseFloat(row.duration || row.duration_seconds || row.call_duration || "0") || undefined;
        const timestamp = row.timestamp || row.date_time || row.call_date || row.time || row.date;
        const freq = parseInt(row.frequency || row.count || row.call_count || "1", 10) || 1;

        const isPhone = (s: string) => /^\+?[0-9\s-]{10,14}$/.test(s);
        relationships.push({
          source: caller,
          sourceType: isPhone(caller) ? "PHONE" : "PERSON",
          relationship: "CALLED",
          target: receiver,
          targetType: isPhone(receiver) ? "PHONE" : "PERSON",
          timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
          confidence: 0.98,
          sourceRecord: recordId,
          metadata: {
            duration,
            frequency: freq,
            callType: row.call_type || row.type || "VOICE",
            towerId: row.tower_id || row.cell_id || undefined,
            source: sourceFileName,
          },
          explanation: `${caller} called ${receiver}${duration ? ` (duration: ${duration}s)` : ""}${timestamp ? ` on ${timestamp}` : ""}.`,
        });
      }

      // Case B: Financial Transaction Record
      const sender = row.sender || row.sender_name || row.source_account || row.debited_party || row.from_account || row.payer;
      const beneficiary = row.beneficiary || row.receiver_name || row.target_account || row.credited_party || row.to_account || row.payee;
      const amountStr = row.amount || row.transfer_amount || row.tx_amount || row.value || row.sum;

      if (sender && beneficiary && sender.toLowerCase() !== beneficiary.toLowerCase()) {
        const amount = parseFloat(amountStr.replace(/[^0-9.]/g, "")) || 0;
        const currency = row.currency || (amountStr.includes("$") ? "USD" : "INR");
        const timestamp = row.timestamp || row.tx_date || row.date || row.time;
        const txId = row.transaction_id || row.tx_id || row.reference_no || row.utr;

        relationships.push({
          source: sender,
          sourceType: /^\d{8,18}$/.test(sender) ? "BANK_ACCOUNT" : "PERSON",
          relationship: "TRANSFERRED_MONEY_TO",
          target: beneficiary,
          targetType: /^\d{8,18}$/.test(beneficiary) ? "BANK_ACCOUNT" : "PERSON",
          timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
          confidence: 0.99,
          sourceRecord: recordId,
          metadata: {
            amount,
            currency,
            channel: row.channel || row.payment_mode || (amount > 200000 ? "RTGS" : "UPI"),
            transactionId: txId || undefined,
            source: sourceFileName,
          },
          explanation: `${sender} transferred ${currency} ${amount.toLocaleString()} to ${beneficiary}${txId ? ` (Ref: ${txId})` : ""}.`,
        });
      }

      // Case C: Location / Movement Observation
      const entity = row.entity || row.person || row.subject || row.name;
      const location = row.location || row.place || row.cell_tower_location || row.city || row.area;

      if (entity && location) {
        const timestamp = row.timestamp || row.date_time || row.visit_date || row.time;
        relationships.push({
          source: entity,
          sourceType: "PERSON",
          relationship: "VISITED",
          target: location,
          targetType: "LOCATION",
          timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
          confidence: 0.95,
          sourceRecord: recordId,
          metadata: {
            latitude: parseFloat(row.latitude || row.lat || "0") || undefined,
            longitude: parseFloat(row.longitude || row.lon || "0") || undefined,
            source: sourceFileName,
          },
          explanation: `${entity} was recorded at location ${location}${timestamp ? ` at ${timestamp}` : ""}.`,
        });
      }

      // Case D: Vehicle Registry / ANPR Movement
      const vehicle = row.vehicle || row.vehicle_reg || row.plate || row.vrn;
      const driver = row.driver || row.owner || row.registrant || row.name;

      if (vehicle && driver) {
        relationships.push({
          source: driver,
          sourceType: "PERSON",
          relationship: "OWNS_VEHICLE",
          target: vehicle.toUpperCase(),
          targetType: "VEHICLE",
          confidence: 0.97,
          sourceRecord: recordId,
          metadata: {
            vehicleType: row.vehicle_type || row.model || undefined,
            source: sourceFileName,
          },
          explanation: `${driver} is the registered owner/driver of vehicle ${vehicle}.`,
        });
      }
    }

    return relationships;
  }
}

// ---------------------------------------------------------------------------
// 5. Unified Relationship Extraction Engine (Facade)
// ---------------------------------------------------------------------------

export class RelationshipExtractionEngine {
  /**
   * Main entry point to extract relationships from either structured rows or text.
   */
  static extract(
    input: { text?: string; records?: Record<string, unknown>[] },
    options: ExtractionOptions = {}
  ): ExtractedRelationship[] {
    const results: ExtractedRelationship[] = [];

    if (input.text && input.text.trim().length > 0) {
      results.push(...UnstructuredRelationshipExtractor.extract(input.text, options));
    }

    if (input.records && input.records.length > 0) {
      results.push(...StructuredRelationshipExtractor.extractFromRecords(input.records, options.sourceName));
    }

    // Filter by min confidence if specified
    const minConf = options.minConfidence ?? 0.5;
    return results.filter((r) => r.confidence >= minConf);
  }

  /**
   * Converts ExtractedRelationship[] to the application's DetectedRelationship[] format.
   */
  static toDetectedRelationships(
    extracted: ExtractedRelationship[],
    entityIdMap: Map<string, string> = new Map()
  ): DetectedRelationship[] {
    return extracted.map((r) => ({
      sourceId: entityIdMap.get(r.source) ?? `SYNTH:${r.source}`,
      targetId: entityIdMap.get(r.target) ?? `SYNTH:${r.target}`,
      type: r.relationship,
      label: r.explanation,
      frequency: r.metadata?.frequency ?? 1,
      timestamp: r.timestamp ? new Date(r.timestamp) : undefined,
      confidence: Math.round(r.confidence * 100),
      supportingRecords: r.sourceRecord ? [r.sourceRecord] : [],
      source: r.source,
      sourceType: r.sourceType,
      target: r.target,
      targetType: r.targetType,
      relationship: r.relationship,
      amount: r.metadata?.amount,
      currency: r.metadata?.currency,
      duration: r.metadata?.duration,
      period: r.metadata?.period,
      channel: r.metadata?.channel,
      evidenceText: r.evidenceText,
      sourceRecord: r.sourceRecord,
      metadata: r.metadata,
      explanation: r.explanation,
    }));
  }
}
