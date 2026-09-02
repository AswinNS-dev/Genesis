// CrimeIntel — AI abstraction layer (facade)
// ============================================================
// Provides a clean, replaceable interface for LLM / AI services.
//
// This module is a thin facade over the pluggable provider registry in
// `backend/ai/providers`. Concrete models (mock, and later real LLMs)
// implement the interfaces in `backend/intelligence/interfaces` and are
// registered in `backend/ai/providers/register.ts`.
//
// MODE = "mock" uses a deterministic, rule-based "extraction" engine that
// operates on FICTIONAL demo text, so the prototype works fully offline.
//
// To swap in a real LLM later: implement the interfaces and register the
// provider. No consumers need to change.
//
// ETHICS: All AI output is phrased as investigative *leads* that require
// human verification — never as a determination of guilt.
// ============================================================

import type {
  EntityType,
  ExtractionResult,
  AnalysisContext,
  InvestigationSummary,
  InvestigationLead,
  DetectedPattern,
  AnomalyResult,
} from "../intelligence/interfaces";

export type { EntityType, ExtractionResult, DetectedPattern };
export type { EntityType as AiEntityType };

// Re-export the shared contexts / result types for consumers.
export type { AnalysisContext, InvestigationSummary, InvestigationLead, AnomalyResult };

export type AiMode = "mock" | "llm";

import { registerProviders } from "../ai/providers/register";
import {
  getExtractionProvider,
  getSummarizerProvider,
  getLeadGeneratorProvider,
  getPatternDetectorProvider,
  getAnomalyDetectorProvider,
} from "../ai/providers";

// Ensure providers are registered before any lookups.
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __crimeIntelAiRegistered?: boolean };
  if (!g.__crimeIntelAiRegistered) {
    registerProviders();
    g.__crimeIntelAiRegistered = true;
  }
}

export function aiMode(): AiMode {
  const mode = (process.env.AI_MODE as string | undefined) ?? "mock";
  return mode === "llm" ? "llm" : "mock";
}

// ---------------------------------------------------------------------------
// 1. EXTRACT — pull structured entities from a document/text
// ---------------------------------------------------------------------------

export async function extractEntities(
  text: string,
  hints?: string[]
): Promise<ExtractionResult[]> {
  return getExtractionProvider().extract(text, hints);
}

// ---------------------------------------------------------------------------
// 2. SUMMARIZE — generate an investigation summary
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
  return getSummarizerProvider().summarize({
    people: input.people.map((name) => ({ name, events: [] })),
    organizations: input.organizations,
    locations: input.locations.map((name) => ({ name, entities: [] })),
    relationships: input.relationships.map((label) => {
      const parts = label.split(" ↔ ");
      return { type: "CASE", sourceName: parts[0] ?? label, targetName: parts[1] ?? "" };
    }),
    events: input.events.map((summary) => ({ summary, type: "GENERAL" })),
    transactionChains: input.patterns,
    caseId: input.caseId,
  });
}

// ---------------------------------------------------------------------------
// 3. LEADS — suggest areas for the investigator to review
// ---------------------------------------------------------------------------

interface GenerateLeadsCtx {
  relationships?: { label: string; people: string[] }[];
  repeatedLocations?: string[];
  transactionChains?: string[];
}

export async function generateLeads(ctx: GenerateLeadsCtx): Promise<InvestigationLead[]> {
  return getLeadGeneratorProvider().generateLeads({
    relationships: (ctx.relationships ?? []).map((r) => {
      const [a = "", b = ""] = r.label.split(" ↔ ").length === 2 ? r.label.split(" ↔ ") : [r.people[0] ?? "", r.people[1] ?? ""];
      return { type: "CASE", sourceName: a, targetName: b, strength: 0 };
    }),
    locations: (ctx.repeatedLocations ?? []).map((name) => ({ name, entities: [] })),
    transactionChains: ctx.transactionChains ?? [],
  });
}

// ---------------------------------------------------------------------------
// 4. PATTERNS — find potentially significant (non-conclusive) patterns
// ---------------------------------------------------------------------------

interface DetectPatternsCtx {
  people: { name: string; events: { type: string; location?: string }[] }[];
  locations: { name: string; entities: string[] }[];
  calls: { a: string; b: string; count: number }[];
  sharedVehicles: { vehicle: string; people: string[] }[];
  transactionChains: string[];
}

export async function detectPatterns(
  ctx: DetectPatternsCtx
): Promise<DetectedPattern[]> {
  return getPatternDetectorProvider().detectPatterns({
    people: ctx.people,
    locations: ctx.locations,
    calls: ctx.calls,
    sharedVehicles: ctx.sharedVehicles,
    transactionChains: ctx.transactionChains,
  } as AnalysisContext);
}

// ---------------------------------------------------------------------------
// 5. ANOMALIES — detect potentially unusual activity (new capability)
// ---------------------------------------------------------------------------

export async function detectAnomalies(
  ctx: AnalysisContext
): Promise<AnomalyResult[]> {
  return getAnomalyDetectorProvider().detect(ctx);
}