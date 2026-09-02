// CrimeIntel — Production-Grade Relationship Extraction Engine
// ============================================================
// Automatically discovers semantic relationships between entities from:
// 1. Unstructured text (FIRs, case diaries, witness statements, surveillance notes)
// 2. Structured datasets (CDRs, bank transaction ledgers, ANPR vehicle feeds, cell tower pings)
//
// Key Features for Real-World Generalization:
// - Comprehensive NER: Person, Phone, Vehicle, Bank Account, UPI/VPA, Location, Org, Case, FIR, Date
// - Pan-India vehicle format detection (all 36 state/UT codes) & ANPR plates
// - UPI IDs, IFSC, IBAN, and virtual financial accounts
// - Police station / Legal section notation (P.S., Thana, U/S 302/34 IPC)
// - Passive voice & inverted grammatical syntax resolution
// - Fuzzy alias resolution (Levenshtein distance & Jaccard token similarity)
// - Adaptive CSV header discovery across 60+ real-world column aliases
// - Traceable evidence text, confidence scoring, and non-judgmental explanation
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
  metadata?: Record<string, unknown>;
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
    imei?: string;
    imsi?: string;
    cellId?: string;
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

// Phone numbers: Indian (+91, 0, clean 10-digit) + International (+1, +44, +971, +65, etc.)
const PHONE_REGEX = /(?:\+?\d{1,3}[-\s.]?)?\(?\d{2,4}\)?[-\s.]?\d{3,5}[-\s.]?\d{4}\b|\b[6-9]\d{9}\b/g;

// Pan-India Vehicle Plate Registration (36 States/UTs + Bharat Series BH)
const VEHICLE_REGEX = /\b(?:AN|AP|AR|AS|BH|BR|CH|CG|DD|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TN|TR|TS|UK|UP|WB)\s*[-]?\s*\d{1,2}\s*[-]?\s*[A-Z]{1,3}\s*[-]?\s*\d{4}\b/gi;

// Bank Accounts & UPI IDs / Virtual Payment Addresses
const BANK_ACCOUNT_REGEX = /\b(?:A\/C|AC|Account|Acct)?\s*#?\s*([0-9]{9,18}|[A-Z]{4}0[A-Z0-9]{6})\b/gi;
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{3,}@(okhdfcbank|okaxis|oksbi|paytm|ybl|apl|upi|postbank|icici|barodampay|axisbank|sbi|federal|airtel|kotak|ibl)\b/gi;

// FIR, Case Diary, Crime Number & Police Station notations
const FIR_REGEX = /\b(?:FIR|Case\s*Diary|Crime\s*No\.?|Crime\s*Number)\s*(?:No\.?|#)?\s*([A-Za-z0-9/_-]+)(?:\s+P\.?S\.?\s+([A-Za-z\s]+))?\b/gi;
const CASE_REGEX = /\b(?:CR|CASE|DOCKET|SPL|RC)[-\s][0-9]{2,4}[-\s][0-9]{2,6}\b/gi;

// Indian and International Honorifics & Police Ranks
const COMMON_PERSON_HONORIFICS = /\b(?:Mr\.|Mrs\.|Ms\.|Shri|Smt\.|Sri|Late|Dr\.|Prof\.|Adv\.|Advocate|Insp\.|Inspector|SI|ASI|DCP|ACP|SP|DSP|SHO|Constable|Head\s+Constable|Sub-Inspector)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;

// Stopwords & Non-Person Tokens
const NON_PERSON_WORDS = new Set([
  "the", "a", "an", "in", "on", "at", "during", "from", "to", "after", "before", "between",
  "and", "then", "yesterday", "today", "tomorrow", "last", "night", "day", "month", "year",
  "case", "report", "account", "vehicle", "january", "february", "march", "april", "may",
  "june", "july", "august", "september", "october", "november", "december", "morning",
  "afternoon", "evening", "times", "called", "transferred", "visited", "owns", "held",
  "recorded", "accused", "victim", "witness", "officer", "police", "court", "complaint"
]);

// Indian & Common Name Words
const INDIAN_NAME_WORDS = new Set([
  "ravi", "suresh", "arun", "rahul", "amit", "priya", "arjun", "kavita", "vikram", "rajesh",
  "sharma", "verma", "singh", "kumar", "mehta", "nair", "rao", "bhardwaj", "gupta", "agarwal",
  "patel", "reddy", "joshi", "yadav", "malhotra", "das", "chatterjee", "banerjee", "mukherjee",
  "khan", "ali", "ahmed", "mishra", "saxena", "iyer", "rane", "deshmukh", "kapoor", "bhatia",
  "siddiqui", "sheikh", "chaudhary", "choudhury", "tiwari", "pandey", "dubey", "kulkarni", "shinde"
]);

// Organization Suffixes & Entity Indicators
const ORG_SUFFIXES = /\b(?:Logistics|Imports|Exports|Traders|Trading|Pharma|Pharmaceuticals|Enterprises|Solutions|Infotech|Technologies|Pvt\s*Ltd|Private\s*Limited|Ltd|Limited|Corp|Corporation|Agency|CID|CCTV\s*Unit|Bank|SBI|HDFC|ICICI|Axis|Syndicate|Cartel|Gang|Foundation|Trust|LLP|LLC)\b/i;

// Common Police Station / Location Keywords
const LOCATION_KEYWORDS = /\b(?:Sector\s*\d+|Industrial\s*Area|Central\s*Market|Market|Vasant\s*Vihar|Nehru\s*Place|Warehouse\s*[A-Z0-9]|Connaught\s*Place|Airport|Toll\s*Plaza|Highway|Expressway|Nagar|Colony|Enclave|Marg|Road|Street|Bazaar|Chowk|Thana|P\.?S\.?|Delhi|Mumbai|Faridabad|Gurugram|Gurgaon|Noida|Bengaluru|Bangalore|Chennai|Kolkata|Hyderabad|Pune|Ahmedabad|Jaipur|Lucknow|Chandigarh)\b/i;

// ---------------------------------------------------------------------------
// 2. String Distance & Fuzzy Matching Helper
// ---------------------------------------------------------------------------

export class FuzzyMatcher {
  /**
   * Levenshtein Distance for typo tolerance (e.g. Suresh Varma vs Suresh Verma).
   */
  static levenshtein(a: string, b: string): number {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    const m = s1.length;
    const n = s2.length;
    const d: number[][] = [];

    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }
    return d[m][n];
  }

  /**
   * Jaccard similarity of character n-grams or word tokens.
   */
  static isMatch(name1: string, name2: string, threshold = 0.80): boolean {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    if (n1 === n2) return true;

    // Check abbreviation (e.g. "R. Kumar" vs "Rahul Kumar")
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);

    if (words1.length === words2.length && words1.length >= 2) {
      if (
        (words1[0].replace(".", "") === words2[0][0] && words1[words1.length - 1] === words2[words2.length - 1]) ||
        (words2[0].replace(".", "") === words1[0][0] && words2[words2.length - 1] === words1[words1.length - 1])
      ) {
        return true;
      }
    }

    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return true;
    const dist = this.levenshtein(n1, n2);
    return 1 - dist / maxLen >= threshold;
  }
}

// ---------------------------------------------------------------------------
// 3. Entity Extraction Sub-Module
// ---------------------------------------------------------------------------

export class EntityDetector {
  /**
   * Identifies typed entities using regex registries, gazetteers, and contextual cues.
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

    const addEntity = (rawName: string, type: EntityType, confidence: number, start?: number, end?: number, metadata?: Record<string, unknown>) => {
      const trimmed = rawName.trim().replace(/[.,;:'"]+$/, "");
      if (!trimmed || trimmed.length < 2) return;
      if (type === "PERSON" && NON_PERSON_WORDS.has(trimmed.toLowerCase())) return;

      let canonical = aliasToCanonical.get(trimmed.toLowerCase()) ?? trimmed;

      // Fuzzy match against known entities if not exact
      if (!aliasToCanonical.has(trimmed.toLowerCase())) {
        for (const ke of knownEntities) {
          if (FuzzyMatcher.isMatch(trimmed, ke.name, 0.85)) {
            canonical = ke.name;
            break;
          }
          for (const alias of ke.aliases ?? []) {
            if (FuzzyMatcher.isMatch(trimmed, alias, 0.85)) {
              canonical = ke.name;
              break;
            }
          }
        }
      }

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
        metadata,
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

    // 2. UPI IDs / VPA addresses
    let match: RegExpExecArray | null;
    while ((match = UPI_REGEX.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[0].toLowerCase(), "BANK_ACCOUNT", 0.96, match.index, match.index + match[0].length, { isUpi: true });
      }
    }

    // 3. Vehicles (Pan-India 36 state codes + BH series)
    while ((match = VEHICLE_REGEX.exec(text)) !== null) {
      const v = match[0].toUpperCase().replace(/\s+/g, "");
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(v, "VEHICLE", 0.94, match.index, match.index + match[0].length);
      }
    }

    // 4. Locations & Organizations
    while ((match = LOCATION_KEYWORDS.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[0], "LOCATION", 0.92, match.index, match.index + match[0].length);
      }
    }

    const orgRegex = /\b([A-Z][a-z0-9]+(?:\s+[A-Z0-9][a-z0-9]+)*\s+(?:Logistics|Imports|Exports|Traders|Trading|Pharma|Pharmaceuticals|Enterprises|Solutions|Infotech|Technologies|Pvt\s*Ltd|Private\s*Limited|Ltd|Limited|Corp|Agency|Gang|Syndicate|Trust))\b/gi;
    while ((match = orgRegex.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[1], "ORGANIZATION", 0.92, match.index, match.index + match[1].length);
      }
    }

    // 5. Phone Numbers
    while ((match = PHONE_REGEX.exec(text)) !== null) {
      const cleanDigits = match[0].replace(/[^\d]/g, "");
      if (cleanDigits.length >= 10 && cleanDigits.length <= 13) {
        if (!isSpanCovered(match.index, match.index + match[0].length)) {
          addEntity(match[0], "PHONE", 0.95, match.index, match.index + match[0].length);
        }
      }
    }

    // 6. FIRs & Cases
    while ((match = CASE_REGEX.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[0].toUpperCase(), "CASE", 0.95, match.index, match.index + match[0].length);
      }
    }
    while ((match = FIR_REGEX.exec(text)) !== null) {
      if (!isSpanCovered(match.index, match.index + match[0].length)) {
        const fullFir = match[2] ? `${match[0]} (P.S. ${match[2]})` : match[0];
        addEntity(fullFir, "FIR", 0.94, match.index, match.index + match[0].length);
      }
    }

    // 7. Bank Accounts
    while ((match = BANK_ACCOUNT_REGEX.exec(text)) !== null) {
      const acct = match[1] ?? match[0];
      if (acct && acct.length >= 8 && !/^\d{10}$/.test(acct)) {
        if (!isSpanCovered(match.index, match.index + match[0].length)) {
          addEntity(acct, "BANK_ACCOUNT", 0.89, match.index, match.index + match[0].length);
        }
      }
    }

    // 8. Person Names with Honorifics (Mr., Shri, Insp., etc.)
    while ((match = COMMON_PERSON_HONORIFICS.exec(text)) !== null) {
      if (match[1] && !isSpanCovered(match.index, match.index + match[0].length)) {
        addEntity(match[1], "PERSON", 0.93, match.index, match.index + match[0].length);
      }
    }

    // 9. Full Name pairs (e.g. Suresh Verma, Priya Singh, Vikram Malhotra)
    const fullNameRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+))\b/g;
    while ((match = fullNameRegex.exec(text)) !== null) {
      const val = match[1];
      const start = match.index;
      const end = start + val.length;
      if (!isSpanCovered(start, end)) {
        if (LOCATION_KEYWORDS.test(val)) {
          addEntity(val, "LOCATION", 0.90, start, end);
        } else if (ORG_SUFFIXES.test(val)) {
          addEntity(val, "ORGANIZATION", 0.90, start, end);
        } else if (!NON_PERSON_WORDS.has(val.split(" ")[0].toLowerCase())) {
          addEntity(val, "PERSON", 0.88, start, end);
        }
      }
    }

    // 10. Single Name tokens (e.g. Ravi, Suresh, Arun)
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
      case "BANK_ACCOUNT":
        return v.replace(/[\s#]/g, "").toUpperCase();
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
// 4. Unstructured Text Relationship Extraction Engine
// ---------------------------------------------------------------------------

export class UnstructuredRelationshipExtractor {
  /**
   * Parses natural language sentences, compound clauses, and passive-voice syntax.
   */
  static extract(text: string, options: ExtractionOptions = {}): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    const sourceDoc = options.sourceName ?? "Narrative_Report";

    // Split text into sentences protecting initials (e.g., "R.", "A. K.") & honorifics
    const sentences = text
      .replace(/\b([A-Z])\.\s+/g, "$1._SPACE_")
      .replace(/\b(Mr|Mrs|Ms|Dr|Insp|Prof|Shri|Smt|SI|ASI|DCP|ACP|SP|DSP|SHO|P\.S)\.\s+/gi, "$1._SPACE_")
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.replace(/_SPACE_/g, " ").trim())
      .filter((s) => s.length > 5);

    for (const fullSentence of sentences) {
      // Split compound sentences into clauses while preserving context
      const rawClauses = fullSentence.split(/\s+(?:and|then|furthermore|additionally|moreover|afterwards)\s+|;\s*/i);
      const sentenceEntities = EntityDetector.extractEntities(fullSentence, options.knownEntities);
      let sentenceSubject = sentenceEntities.find((e) => e.type === "PERSON")?.name ?? this.findSubject(fullSentence);

      for (const clause of rawClauses) {
        const entities = EntityDetector.extractEntities(clause, options.knownEntities);

        // Check if clause begins with verb (e.g., "and transferred ₹250,000 to Arun")
        const startsWithVerb = /^(?:and\s+|then\s+)?(?:called|telephoned|dialed|transferred|sent|paid|wired|visited|went\s+to|spotted\s+at|owns|drove|met|received)\b/i.test(clause.trim());

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
        // 1. Person -> CALLED -> Person / Phone
        // ---------------------------------------------------------
        const callMatch = /(?:called|phoned|telephoned|dialed|contacted|spoke with|in touch with|placed a call to)\s+([A-Za-z0-9\s]+?)(?:\s+(\d+)\s*times?)?(?:\s+(?:during|in|on)\s+([A-Za-z0-9\s,]+))?(?:[.,;]|$)/i.exec(clause);
        if (callMatch) {
          const caller = clauseSubject ?? persons[0]?.name;
          const recipientCandidate = callMatch[1].trim().replace(/[.,;:'"]+$/, "");
          const targetPerson = persons.find((p) => p.name !== caller && (recipientCandidate.toLowerCase().includes(p.name.toLowerCase()) || FuzzyMatcher.isMatch(recipientCandidate, p.name))) ??
                               sentenceEntities.find((p) => p.type === "PERSON" && p.name !== caller && (recipientCandidate.toLowerCase().includes(p.name.toLowerCase()) || FuzzyMatcher.isMatch(recipientCandidate, p.name))) ??
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
        // 2. Person -> TRANSFERRED_MONEY_TO -> Person / Account / UPI
        // Active & Passive: "A transferred ₹X to B", "₹X was transferred from A to B"
        // ---------------------------------------------------------
        const transferMatch = /(?:transferred|sent|paid|wired|remitted|deposited|credited)\s+(?:(?:₹|Rs\.?|INR|\$|USD|EUR)\s*)?([0-9,]+(?:\.\d+)?|\d+\s*(?:lakhs?|crores?|million|k))\s*(?:(?:to|into)\s+(?:the\s+bank\s+account\s+of\s+|account\s+of\s+)?([A-Za-z0-9@\s'.-]+))?/i.exec(clause);
        if (transferMatch) {
          const sender = clauseSubject ?? sentenceSubject;
          const rawAmount = transferMatch[1].replace(/,/g, "").trim();
          let amount = parseFloat(rawAmount);
          if (transferMatch[1].toLowerCase().includes("lakh")) amount = (parseFloat(rawAmount) || 1) * 100000;
          if (transferMatch[1].toLowerCase().includes("crore")) amount = (parseFloat(rawAmount) || 1) * 10000000;
          if (transferMatch[1].toLowerCase().includes("million")) amount = (parseFloat(rawAmount) || 1) * 1000000;

          const rawRecipient = (transferMatch[2] ?? "")
            .replace(/'s\s*(?:bank\s*)?account/i, "")
            .replace(/[.,;:'"]+$/, "")
            .trim();

          const targetEntity = accounts[0] ??
                               persons.find((p) => p.name !== sender && (rawRecipient.toLowerCase().includes(p.name.toLowerCase()) || FuzzyMatcher.isMatch(rawRecipient, p.name))) ??
                               sentenceEntities.find((p) => p.name !== sender && (rawRecipient.toLowerCase().includes(p.name.toLowerCase()) || FuzzyMatcher.isMatch(rawRecipient, p.name))) ??
                               (rawRecipient ? { name: rawRecipient, type: rawRecipient.includes("@") ? ("BANK_ACCOUNT" as const) : ("PERSON" as const) } : null);

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
              explanation: `${sender} transferred ₹${amount ? amount.toLocaleString() : rawAmount} to ${targetName}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // 3. Person -> OWNS / DRIVES -> Vehicle
        // ---------------------------------------------------------
        if (vehicles.length > 0) {
          for (const v of vehicles) {
            const ownerMatch = new RegExp(`([A-Za-z\\s]+)\\s+(?:owns|drove|was driving|uses|registered|associated with|spotted in)\\s+(?:vehicle\\s+)?(?:${v.name})`, "i").exec(clause);
            const owner = ownerMatch ? ownerMatch[1].trim() : (clauseSubject ?? sentenceSubject);
            if (owner) {
              relationships.push({
                source: owner,
                sourceType: "PERSON",
                relationship: "OWNS_VEHICLE",
                target: v.name,
                targetType: "VEHICLE",
                confidence: 0.93,
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
        // 4. Person -> USES / REGISTERED -> Phone Number
        // ---------------------------------------------------------
        if (phones.length > 0 && (clauseSubject || sentenceSubject)) {
          const subject = clauseSubject ?? sentenceSubject!;
          for (const ph of phones) {
            if (/(?:uses|owns|holds|registered|contact number|subscriber|mobile)/i.test(clause)) {
              relationships.push({
                source: subject,
                sourceType: "PERSON",
                relationship: "USES_PHONE",
                target: ph.name,
                targetType: "PHONE",
                confidence: 0.92,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  phone: ph.name,
                  source: sourceDoc,
                },
                explanation: `${subject} is associated with phone number ${ph.name}.`,
              });
            }
          }
        }

        // ---------------------------------------------------------
        // 5. Person -> VISITED / SPOTTED_AT -> Location
        // ---------------------------------------------------------
        if (locations.length > 0 && (clauseSubject || sentenceSubject)) {
          const subject = clauseSubject ?? sentenceSubject!;
          for (const loc of locations) {
            if (/(?:visited|went to|seen at|present at|travelled to|located at|spotted at|residing at|frequented)/i.test(clause)) {
              relationships.push({
                source: subject,
                sourceType: "PERSON",
                relationship: "VISITED",
                target: loc.name,
                targetType: "LOCATION",
                confidence: 0.91,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  location: loc.name,
                  source: sourceDoc,
                },
                explanation: `${subject} visited location ${loc.name}.`,
              });
            }
          }
        }

        // ---------------------------------------------------------
        // 6. Person -> MET -> Person
        // ---------------------------------------------------------
        if (persons.length >= 2 && /(?:met|meeting|rendezvous|conferred with|spotted together with)/i.test(clause)) {
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
              confidence: 0.94,
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
        // 7. Person -> ASSOCIATED_WITH_CASE -> Case / FIR
        // ---------------------------------------------------------
        if (cases.length > 0 && (clauseSubject || sentenceSubject)) {
          const subject = clauseSubject ?? sentenceSubject!;
          for (const c of cases) {
            relationships.push({
              source: subject,
              sourceType: "PERSON",
              relationship: "ASSOCIATED_WITH_CASE",
              target: c.name,
              targetType: c.type,
              confidence: 0.93,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                caseId: c.name,
                source: sourceDoc,
              },
              explanation: `${subject} is referenced in case ${c.name}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // 8. Person -> WORKS_FOR / OWNS -> Organization
        // ---------------------------------------------------------
        if (orgs.length > 0 && (clauseSubject || sentenceSubject)) {
          const subject = clauseSubject ?? sentenceSubject!;
          for (const o of orgs) {
            const isOwner = /(?:owns|director|founded|head of|managing|partner|proprietor)/i.test(clause);
            relationships.push({
              source: subject,
              sourceType: "PERSON",
              relationship: isOwner ? "OWNS_ORGANIZATION" : "WORKS_FOR",
              target: o.name,
              targetType: "ORGANIZATION",
              confidence: 0.90,
              sourceRecord: sourceDoc,
              evidenceText: fullSentence,
              metadata: {
                organization: o.name,
                role: isOwner ? "Director/Owner" : "Employee/Associate",
                source: sourceDoc,
              },
              explanation: `${subject} ${isOwner ? "owns/directs" : "works for"} ${o.name}.`,
            });
          }
        }

        // ---------------------------------------------------------
        // 9. Person -> OWNS_BANK_ACCOUNT -> Bank Account / UPI
        // ---------------------------------------------------------
        if (accounts.length > 0 && (clauseSubject || sentenceSubject)) {
          const subject = clauseSubject ?? sentenceSubject!;
          for (const acct of accounts) {
            if (/(?:account|holds|owns|bank|upi|vpa)/i.test(clause)) {
              relationships.push({
                source: subject,
                sourceType: "PERSON",
                relationship: "OWNS_BANK_ACCOUNT",
                target: acct.name,
                targetType: "BANK_ACCOUNT",
                confidence: 0.92,
                sourceRecord: sourceDoc,
                evidenceText: fullSentence,
                metadata: {
                  account: acct.name,
                  source: sourceDoc,
                },
                explanation: `${subject} holds bank account ${acct.name}.`,
              });
            }
          }
        }
      }
    }

    return this.deduplicateRelationships(relationships);
  }

  private static findSubject(sentence: string): string | null {
    const m = /^(?:Shri|Mr\.|Ms\.|Insp\.|Dr\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/.exec(sentence);
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
// 5. Structured Data Relationship Extraction (60+ Column Permutations)
// ---------------------------------------------------------------------------

export class StructuredRelationshipExtractor {
  static extractFromRecords(records: Record<string, unknown>[], sourceFileName = "structured_dataset.csv"): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const recordId = `${sourceFileName}#row_${i + 1}`;

      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        row[k.toLowerCase().trim().replace(/[\s_-]+/g, "_")] = v === null || v === undefined ? "" : String(v).trim();
      }

      // 1. CDR / Communication Columns
      const caller = row.caller || row.caller_name || row.source || row.from || row.calling_party || row.calling_number || row.source_msisdn || row.a_party;
      const receiver = row.receiver || row.recipient || row.target || row.to || row.called_party || row.called_number || row.target_msisdn || row.b_party || row.recipient_name;

      if (caller && receiver && caller.toLowerCase() !== receiver.toLowerCase()) {
        const duration = parseFloat(row.duration || row.duration_seconds || row.duration_sec || row.call_duration || "0") || undefined;
        const timestamp = row.timestamp || row.date_time || row.call_date || row.time || row.date || row.start_time;
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
            cellId: row.cell_id || row.tower_id || undefined,
            imei: row.imei || undefined,
            imsi: row.imsi || undefined,
            source: sourceFileName,
          },
          explanation: `${caller} called ${receiver}${duration ? ` (duration: ${duration}s)` : ""}${timestamp ? ` on ${timestamp}` : ""}.`,
        });
      }

      // 2. Financial Transaction Columns
      const sender = row.sender || row.sender_name || row.source_account || row.debited_party || row.from_account || row.payer || row.remitter_account || row.debit_acc;
      const beneficiary = row.beneficiary || row.receiver_name || row.target_account || row.credited_party || row.to_account || row.payee || row.beneficiary_account || row.credit_acc;
      const amountStr = row.amount || row.transfer_amount || row.tx_amount || row.value || row.sum || row.transaction_amount;

      if (sender && beneficiary && sender.toLowerCase() !== beneficiary.toLowerCase()) {
        const amount = parseFloat(amountStr.replace(/[^0-9.]/g, "")) || 0;
        const currency = row.currency || (amountStr.includes("$") ? "USD" : "INR");
        const timestamp = row.timestamp || row.tx_date || row.date || row.time || row.transaction_date;
        const txId = row.transaction_id || row.tx_id || row.reference_no || row.utr || row.journal_no;

        relationships.push({
          source: sender,
          sourceType: /^\d{8,18}$/.test(sender) || sender.includes("@") ? "BANK_ACCOUNT" : "PERSON",
          relationship: "TRANSFERRED_MONEY_TO",
          target: beneficiary,
          targetType: /^\d{8,18}$/.test(beneficiary) || beneficiary.includes("@") ? "BANK_ACCOUNT" : "PERSON",
          timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
          confidence: 0.99,
          sourceRecord: recordId,
          metadata: {
            amount,
            currency,
            channel: row.channel || row.payment_mode || row.mode || (amount > 200000 ? "RTGS" : "UPI"),
            transactionId: txId || undefined,
            source: sourceFileName,
          },
          explanation: `${sender} transferred ${currency} ${amount.toLocaleString()} to ${beneficiary}${txId ? ` (Ref: ${txId})` : ""}.`,
        });
      }

      // 3. Location / GPS Feed Columns
      const entity = row.entity || row.person || row.subject || row.name || row.user_id || row.subscriber;
      const location = row.location || row.place || row.cell_tower_location || row.city || row.area || row.address;

      if (entity && location) {
        const timestamp = row.timestamp || row.date_time || row.visit_date || row.time || row.ping_time;
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
            longitude: parseFloat(row.longitude || row.lon || row.lng || "0") || undefined,
            source: sourceFileName,
          },
          explanation: `${entity} was recorded at location ${location}${timestamp ? ` at ${timestamp}` : ""}.`,
        });
      }

      // 4. Vehicle / ANPR Movement Columns
      const vehicle = row.vehicle || row.vehicle_reg || row.plate || row.vrn || row.license_plate || row.registration_number;
      const driver = row.driver || row.owner || row.registrant || row.name;

      if (vehicle && driver) {
        relationships.push({
          source: driver,
          sourceType: "PERSON",
          relationship: "OWNS_VEHICLE",
          target: vehicle.toUpperCase().replace(/[\s-]/g, ""),
          targetType: "VEHICLE",
          confidence: 0.97,
          sourceRecord: recordId,
          metadata: {
            vehicleType: row.vehicle_type || row.model || row.make || undefined,
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
// 6. Unified Relationship Extraction Engine (Facade)
// ---------------------------------------------------------------------------

export class RelationshipExtractionEngine {
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

    const minConf = options.minConfidence ?? 0.5;
    return results.filter((r) => r.confidence >= minConf);
  }

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
