// CrimeIntel — Data Processing Pipeline Service
//
// Implements the audited ingestion stages:
//   01 Upload → 02 Field mapping → 03 Normalization → (04 Matching → 05 Review & merge
//   are covered by the Dataset analysis/matching/merge phase).
//
// The pipeline is purely backend logic: parsing, header inference and
// normalization rules live here so the UI stays thin and new file sources or
// algorithms (CSV, JSON, cloud, pluggable AI/ML) can be added without UI work.

import { prisma } from "../lib/prisma";
import { datasetService } from "./dataset.service";

type SourceType = "CSV" | "JSON" | "TXT";

const MAX_CONTENT_BYTES = 512 * 1024;
const MAX_ROWS = 1000;

const CANONICAL_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "city",
  "vehicle",
  "amount",
  "date",
  "identifier",
  "description",
] as const;

type CanonicalField = (typeof CANONICAL_FIELDS)[number];

// Ordered header heuristics — first match wins, so "phone" beats "identifier"
// and "name" beats "description". Each canonical field is assigned once.
const MAPPING_RULES: { field: CanonicalField; re: RegExp }[] = [
  { field: "name", re: /name|person|party|caller|recipient|associate|suspect|contact|holder|username/i },
  { field: "phone", re: /phone|mobile|telephone|telephone_no|contact_no|mob|tel\b/i },
  { field: "email", re: /e-?mail|email/i },
  { field: "vehicle", re: /vehicle|vrn|reg_no|registration|plate|car|truck|van/i },
  { field: "amount", re: /amount|amt|value|transfer|payment|sum|debit|credit|inv_?val/i },
  { field: "date", re: /date|timestamp|time_stamp|date_time|when/i },
  { field: "identifier", re: /id\b|reference|record_no|case_no|account_no|ref/i },
  { field: "address", re: /address|addr|street|locality/i },
  { field: "city", re: /city|town|district|area/i },
  { field: "description", re: /description|details|remark|note|comments?|narrative/i },
];

const NORMALIZATION: Record<CanonicalField, (v: string) => string> = {
  name: (v) => v.trim().replace(/\s+/g, " "),
  phone: (v) => {
    let digits = v.replace(/[^\d]/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    return digits;
  },
  email: (v) => v.trim().toLowerCase(),
  address: (v) => v.trim().replace(/\s+/g, " "),
  city: (v) => v.trim().replace(/\s+/g, " "),
  vehicle: (v) => v.trim().toUpperCase().replace(/\s+/g, ""),
  amount: (v) => v.replace(/[^\d.-]/g, "").replace(/^\./, ""),
  date: (v) => {
    const t = Date.parse(v);
    return Number.isNaN(t) ? v.trim() : new Date(t).toISOString();
  },
  identifier: (v) => v.trim(),
  description: (v) => v.trim().replace(/\s+/g, " "),
};

/** Minimal CSV parser with quoted-field support (no external dependency). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Parse raw content into uniform { headers, rows } records. */
export function parseContent(text: string, sourceType: SourceType): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = text.replace(/^\uFEFF/, "");
  if (sourceType === "JSON") {
    const data = JSON.parse(normalized) as unknown;
    if (!Array.isArray(data)) throw new Error("JSON source must be an array of objects");
    const headers = Array.from(new Set(data.flatMap((r) => (r && typeof r === "object" ? Object.keys(r as object) : []))));
    const rows = data.map((r) => {
      const out: Record<string, string> = {};
      if (r && typeof r === "object") {
        for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
          out[k] = v === null || v === undefined ? "" : String(v);
        }
      }
      return out;
    }) as Record<string, string>[];
    return { headers, rows };
  }

  const parsed = parseCsv(normalized);
  if (parsed.length === 0) throw new Error("No rows could be parsed from the source");

  if (sourceType === "TXT") {
    const rows = parsed.map((parts) => ({ line: parts.join(",") }));
    return { headers: ["line"], rows };
  }

  // CSV — first row is the header row.
  const headers = parsed[0];
  const rows = parsed.slice(1).map((cells) => {
    const out: Record<string, string> = {};
    headers.forEach((h, i) => {
      out[h.trim()] = (cells[i] ?? "").trim();
    });
    return out;
  });
  return { headers, rows };
}

/** Infer source-header → canonical-field mapping (backend rule-based). */
export function inferMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<CanonicalField>();
  for (const h of headers) {
    const rule = MAPPING_RULES.find((r) => r.re.test(h) && !used.has(r.field));
    const target = rule ? rule.field : "description";
    mapping[h] = target;
    used.add(target as CanonicalField);
  }
  return mapping;
}

/** Normalize a single raw row against a mapping. */
export function normalizeRow(mapping: Record<string, string>, row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [source, target] of Object.entries(mapping)) {
    const raw = (row[source] ?? "").trim();
    if (!raw) continue;
    const fn = NORMALIZATION[target as CanonicalField] ?? NORMALIZATION.description;
    out[target] = fn(raw);
  }
  return out;
}

export interface IngestInput {
  content: string;
  sourceType: SourceType;
  fileName?: string;
  caseId?: string;
  createdById?: string;
  userName?: string;
}

export class DataPipeline {
  /**
   * Run the ingestion pipeline: Upload → Mapping → Normalization.
   * Every stage is recorded in the audit trail; failures persist as a
   * traceable dataset in ERROR state (never silently dropped).
   */
  async ingest(input: IngestInput) {
    const name = input.fileName?.trim() || `pasted_${Date.now()}.${input.sourceType.toLowerCase()}`;
    if (input.content.length > MAX_CONTENT_BYTES) {
      throw new Error("Source exceeds the 512KB pipeline limit");
    }

    const stage = (action: string, detail: string) =>
      input.caseId
        ? prisma.caseActivity.create({
            data: { caseId: input.caseId, action, detail, actor: input.userName ?? "system" },
          })
        : prisma.auditLog.create({
            data: { userId: input.createdById, action, detail, status: "SUCCESS" },
          });

    // Stage 01 — Upload
    const dataset = await prisma.dataset.create({
      data: {
        name: name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120),
        sourceType: input.sourceType,
        fileName: name,
        status: "UPLOADED",
        createdById: input.createdById,
        caseId: input.caseId ?? undefined,
      },
    });
    await stage("DATASET_UPLOADED", `${dataset.name} received (${(input.content.length / 1024).toFixed(1)} KB)`);

    // Stage 02 — Field mapping (parse + infer)
    let headers: string[];
    let rows: Record<string, string>[];
    try {
      ({ headers, rows } = parseContent(input.content, input.sourceType));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parse failed";
      await stage("DATASET_ERROR", `${dataset.name} — ${message}`);
      await prisma.dataset.update({
        where: { id: dataset.id },
        data: { status: "ERROR", error: message },
      });
      return { dataset: await this.full(dataset.id), summary: null };
    }

    const mapping = inferMapping(headers);
    await prisma.dataset.update({ where: { id: dataset.id }, data: { status: "MAPPED", mapping: JSON.stringify(mapping) } });
    await stage("DATASET_MAPPED", `${dataset.name} — ${headers.length} column${headers.length === 1 ? "" : "s"} mapped`);

    // Stage 03 — Normalization → records
    const normalizedRows = rows.slice(0, MAX_ROWS).map((row) => normalizeRow(mapping, row));
    const normalizationRules = Object.keys(NORMALIZATION);
    await prisma.datasetRecord.createMany({
      data: normalizedRows.map((n, i) => ({
        datasetId: dataset.id,
        rowIndex: i,
        raw: JSON.stringify(rows[i]),
        normalized: JSON.stringify(n),
      })),
    });
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { status: "NORMALIZED", normalizationRules: JSON.stringify(normalizationRules), recordCount: normalizedRows.length },
    });
    await stage("DATASET_NORMALIZED", `${dataset.name} — ${normalizedRows.length} record${normalizedRows.length === 1 ? "" : "s"} normalized`);

    if (rows.length > MAX_ROWS) {
      await stage("DATASET_NORMALIZED", `${dataset.name} — capped at ${MAX_ROWS} rows for this prototype pipeline`);
    }

    // Ready for the matching/review phase.
    await prisma.dataset.update({ where: { id: dataset.id }, data: { status: "READY" } });
    const summary = await datasetService.summary(dataset.id);
    await stage("DATASET_READY", `${dataset.name} — ${summary.total} records ready for matching`);

    return { dataset: await this.full(dataset.id), summary, mapping, normalizedFields: Object.keys(normalizedRows[0] ?? {}) };
  }

  private async full(id: string) {
    return datasetService.getById(id);
  }
}

export const dataPipeline = new DataPipeline();