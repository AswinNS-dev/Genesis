/**
 * Dataset ingestion pipeline service.
 *
 * Accepts raw CSV / JSON / TXT content, parses it, normalises the records,
 * stores them in the database, and optionally triggers entity extraction.
 *
 * Pipeline stages:
 *  1. Parse raw content into row objects.
 *  2. Map columns to canonical fields (name, phone, vehicle, location, etc.).
 *  3. Normalise string values (capitalise names, strip spaces, etc.).
 *  4. Persist Dataset + DatasetRecord rows.
 *  5. (Optional) Run entity extraction and create Entity + DatasetEntity rows.
 *  6. Persist a DatasetSummary and return it.
 */

import { prisma } from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestInput {
  content: string;
  sourceType: "CSV" | "JSON" | "TXT";
  fileName?: string;
  caseId?: string;
  analysisScope?: "COMBINED" | "DATASET_ONLY";
  createdById?: string;
  userName?: string;
}

export interface PipelineSummary {
  total: number;
  parsed: number;
  failed: number;
  entitiesCreated: number;
}

export interface IngestResult {
  dataset: {
    id: string;
    name: string;
    status: string;
    recordCount: number;
    sourceType: string;
    caseId: string | null;
    createdAt: Date;
  };
  summary: PipelineSummary | null;
  errors: string[];
}

// ─── CSV parser (no external deps) ───────────────────────────────────────────

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = (values[j] ?? "").trim().replace(/^"|"$/g, "");
    });
    rows.push(row);
  }
  return rows;
}

/** Handles simple quoted fields without embedded newlines. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ─── Field mapping ────────────────────────────────────────────────────────────

const NAME_ALIASES = ["name", "full_name", "fullname", "person", "subject", "individual"];
const PHONE_ALIASES = ["phone", "mobile", "contact", "telephone", "phone_number", "mobile_number"];
const VEHICLE_ALIASES = ["vehicle", "vehicle_number", "reg", "registration", "plate", "number_plate"];
const LOCATION_ALIASES = ["location", "address", "place", "city", "area", "district"];
const ORG_ALIASES = ["organization", "organisation", "company", "employer", "firm", "entity"];
const ACCOUNT_ALIASES = ["account", "bank_account", "account_number", "ifsc", "bank"];

function findField(
  row: Record<string, string>,
  aliases: string[]
): string | undefined {
  const key = Object.keys(row).find((k) =>
    aliases.includes(k.toLowerCase().replace(/[^a-z_]/g, "_"))
  );
  return key ? row[key] : undefined;
}

function normalizeCapitalize(s: string): string {
  return s
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeRow(
  raw: Record<string, string>
): Record<string, string> {
  const n: Record<string, string> = {};

  const name = findField(raw, NAME_ALIASES);
  if (name) n.name = normalizeCapitalize(name);

  const phone = findField(raw, PHONE_ALIASES);
  if (phone) n.phone = phone.replace(/[^\d+]/g, "");

  const vehicle = findField(raw, VEHICLE_ALIASES);
  if (vehicle) n.vehicle = vehicle.toUpperCase().replace(/\s+/g, "");

  const location = findField(raw, LOCATION_ALIASES);
  if (location) n.location = normalizeCapitalize(location);

  const org = findField(raw, ORG_ALIASES);
  if (org) n.organization = normalizeCapitalize(org);

  const account = findField(raw, ACCOUNT_ALIASES);
  if (account) n.bank_account = account.replace(/\s+/g, "");

  return n;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const dataPipeline = {
  async ingest(input: IngestInput): Promise<IngestResult> {
    const name = input.fileName ?? `dataset_${Date.now()}.${input.sourceType.toLowerCase()}`;

    // Stage 1: Parse.
    let rows: Record<string, string>[] = [];
    const errors: string[] = [];

    try {
      if (input.sourceType === "CSV") {
        rows = parseCsv(input.content);
      } else if (input.sourceType === "JSON") {
        const parsed = JSON.parse(input.content) as unknown;
        if (Array.isArray(parsed)) {
          rows = parsed.map((r) =>
            typeof r === "object" && r !== null
              ? (r as Record<string, string>)
              : {}
          );
        } else {
          errors.push("JSON must be an array of objects");
        }
      } else {
        // TXT: each non-empty line is a "name" row.
        rows = input.content
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => ({ name: line }));
      }
    } catch (err) {
      errors.push(
        `Parse error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Stage 2: Create Dataset record.
    const dataset = await prisma.dataset.create({
      data: {
        name,
        sourceType: input.sourceType,
        fileName: input.fileName,
        status: "UPLOADED",
        recordCount: rows.length,
        analysisScope: input.analysisScope ?? "COMBINED",
        createdById: input.createdById,
        caseId: input.caseId,
      },
    });

    if (rows.length === 0) {
      await prisma.dataset.update({
        where: { id: dataset.id },
        data: { status: errors.length ? "ERROR" : "READY", error: errors[0] },
      });
      return {
        dataset: { ...dataset, caseId: dataset.caseId },
        summary: null,
        errors,
      };
    }

    await prisma.dataset.update({ where: { id: dataset.id }, data: { status: "MAPPED" } });

    // Stage 3 & 4: Normalise and persist records.
    let parsed = 0;
    let failed = 0;
    let entitiesCreated = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      try {
        const normalized = normalizeRow(raw);

        const record = await prisma.datasetRecord.create({
          data: {
            datasetId: dataset.id,
            rowIndex: i,
            raw: JSON.stringify(raw),
            normalized: JSON.stringify(normalized),
            matchStatus: "UNMATCHED",
          },
        });

        // Stage 5: Create Entity rows for unambiguous fields.
        if (normalized.name) {
          let entity = await prisma.entity.findFirst({
            where: { type: "PERSON", name: normalized.name },
          });
          if (!entity) {
            entity = await prisma.entity.create({
              data: { type: "PERSON", name: normalized.name, caseId: input.caseId },
            });
            entitiesCreated++;
          }

          await prisma.datasetEntity.upsert({
            where: {
              datasetId_recordId_entityId: {
                datasetId: dataset.id,
                recordId: record.id,
                entityId: entity.id,
              },
            },
            create: {
              datasetId: dataset.id,
              recordId: record.id,
              entityId: entity.id,
              role: "SOURCE",
            },
            update: {},
          });
        }

        if (normalized.phone) {
          const phoneEntity = await prisma.entity.findFirst({
            where: { type: "PHONE", value: normalized.phone },
          }) ?? await prisma.entity.create({
            data: { type: "PHONE", name: normalized.phone, value: normalized.phone, caseId: input.caseId },
          });

          await prisma.datasetEntity.upsert({
            where: {
              datasetId_recordId_entityId: {
                datasetId: dataset.id,
                recordId: record.id,
                entityId: phoneEntity.id,
              },
            },
            create: {
              datasetId: dataset.id,
              recordId: record.id,
              entityId: phoneEntity.id,
              role: "SOURCE",
            },
            update: {},
          });
          entitiesCreated++;
        }

        parsed++;
      } catch (err) {
        failed++;
        errors.push(
          `Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Update status.
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        status: failed === rows.length ? "ERROR" : "NORMALIZED",
        recordCount: parsed,
      },
    });

    const summary: PipelineSummary = {
      total: rows.length,
      parsed,
      failed,
      entitiesCreated,
    };

    await prisma.auditLog.create({
      data: {
        userId: input.createdById,
        action: "DATASET_INGESTED",
        detail: `${name}: ${parsed} records ingested, ${entitiesCreated} entities created`,
        status: failed === rows.length ? "ERROR" : "SUCCESS",
      },
    });

    const refreshed = await prisma.dataset.findUniqueOrThrow({
      where: { id: dataset.id },
    });

    return { dataset: refreshed, summary, errors };
  },
};
