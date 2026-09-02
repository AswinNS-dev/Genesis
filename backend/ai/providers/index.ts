// CrimeIntel — AI/ML Provider Abstraction
// ============================================================
// Central registry for pluggable providers. The application talks to the
// registry (getExtractionProvider(), etc.), NOT to a concrete model.
//
// To swap a model later, implement the interface and register it here.
// No frontend / API changes required.
// ============================================================

import type {
  ExtractionProvider,
  SummarizerProvider,
  LeadGeneratorProvider,
  PatternDetectorProvider,
  EntityMatcherProvider,
  RelationshipDetectorProvider,
  AnomalyDetectorProvider,
} from "../../intelligence/interfaces";

// ---------------------------------------------------------------------------
// Registry maps
// ---------------------------------------------------------------------------

const extractionProviders = new Map<string, ExtractionProvider>();
const summarizerProviders = new Map<string, SummarizerProvider>();
const leadGeneratorProviders = new Map<string, LeadGeneratorProvider>();
const patternDetectorProviders = new Map<string, PatternDetectorProvider>();
const entityMatcherProviders = new Map<string, EntityMatcherProvider>();
const relationshipDetectorProviders = new Map<string, RelationshipDetectorProvider>();
const anomalyDetectorProviders = new Map<string, AnomalyDetectorProvider>();

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerExtractionProvider(p: ExtractionProvider): void {
  extractionProviders.set(p.name, p);
}
export function registerSummarizerProvider(p: SummarizerProvider): void {
  summarizerProviders.set(p.name, p);
}
export function registerLeadGeneratorProvider(p: LeadGeneratorProvider): void {
  leadGeneratorProviders.set(p.name, p);
}
export function registerPatternDetectorProvider(p: PatternDetectorProvider): void {
  patternDetectorProviders.set(p.name, p);
}
export function registerEntityMatcherProvider(p: EntityMatcherProvider): void {
  entityMatcherProviders.set(p.name, p);
}
export function registerRelationshipDetectorProvider(p: RelationshipDetectorProvider): void {
  relationshipDetectorProviders.set(p.name, p);
}
export function registerAnomalyDetectorProvider(p: AnomalyDetectorProvider): void {
  anomalyDetectorProviders.set(p.name, p);
}

// ---------------------------------------------------------------------------
// Retrieval (with fallbacks / defaults)
// ---------------------------------------------------------------------------

const defaultName = process.env.AI_PROVIDER ?? "mock";

export function getExtractionProvider(): ExtractionProvider {
  return extractionProviders.get(defaultName) ?? first(extractionProviders);
}
export function getSummarizerProvider(): SummarizerProvider {
  return summarizerProviders.get(defaultName) ?? first(summarizerProviders);
}
export function getLeadGeneratorProvider(): LeadGeneratorProvider {
  return leadGeneratorProviders.get(defaultName) ?? first(leadGeneratorProviders);
}
export function getPatternDetectorProvider(): PatternDetectorProvider {
  return patternDetectorProviders.get(defaultName) ?? first(patternDetectorProviders);
}
export function getEntityMatcherProvider(): EntityMatcherProvider {
  return entityMatcherProviders.get(defaultName) ?? first(entityMatcherProviders);
}
export function getRelationshipDetectorProvider(): RelationshipDetectorProvider {
  return relationshipDetectorProviders.get(defaultName) ?? first(relationshipDetectorProviders);
}
export function getAnomalyDetectorProvider(): AnomalyDetectorProvider {
  return anomalyDetectorProviders.get(defaultName) ?? first(anomalyDetectorProviders);
}

// List all registered provider names (for introspection / settings UI)
export function listProviders() {
  return {
    extraction: [...extractionProviders.keys()],
    summarizer: [...summarizerProviders.keys()],
    leadGenerator: [...leadGeneratorProviders.keys()],
    patternDetector: [...patternDetectorProviders.keys()],
    entityMatcher: [...entityMatcherProviders.keys()],
    relationshipDetector: [...relationshipDetectorProviders.keys()],
    anomalyDetector: [...anomalyDetectorProviders.keys()],
  };
}

function first<T>(map: Map<string, T>): T {
  return map.values().next().value as T;
}
