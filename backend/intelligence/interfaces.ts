// CrimeIntel — Intelligence & AI/ML Abstraction Layer
// ============================================================
// Defines the pluggable interfaces for all analysis capabilities.
//
// The rest of the application should depend on these interfaces, not on
// any single concrete implementation. New algorithms / AI models can be
// added by implementing an interface and registering it — without
// rewriting the frontend or the surrounding application.
// ============================================================

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type EntityType =
  | "PERSON"
  | "PHONE"
  | "VEHICLE"
  | "LOCATION"
  | "ORGANIZATION"
  | "FINANCIAL"
  | "DATE"
  | "EVENT"
  | "BANK_ACCOUNT"
  | "CASE"
  | "FIR"
  | "TRANSACTION";

export interface ExtractionResult {
  type: EntityType;
  value: string;
  context?: string;
  confidence: number;
  source?: {
    // Source traceability
    fileName?: string;
    rowNumber?: number;
    pageNumber?: number;
    sourceText?: string;
  };
}

export interface MatchResult {
  entityAId: string;
  entityBId: string;
  entityAName: string;
  entityBName: string;
  confidence: number;
  reasons: string[];
  strongSignals: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface DetectedRelationship {
  sourceId: string;
  targetId: string;
  type: string; // COMMUNICATION | TRANSACTION | LOCATION | OWNERSHIP | CASE | CONNECTED_TO | ...
  label: string;
  frequency: number;
  timestamp?: Date | string;
  confidence: number;
  supportingRecords: string[];
  // Extended metadata for investigation and knowledge graph
  source?: string;
  sourceType?: string;
  target?: string;
  targetType?: string;
  relationship?: string;
  amount?: number;
  currency?: string;
  duration?: number;
  period?: string;
  channel?: string;
  evidenceText?: string;
  sourceRecord?: string;
  metadata?: Record<string, unknown>;
  explanation?: string;
}

export interface DetectedPattern {
  type: string;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
  evidence: string[];
  relevance: number;
  entities?: string[];
  isPotential: boolean; // always true — nothing is conclusive
}

export interface AnomalyResult {
  type: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  relatedEntities: string[];
  supportingRecords: string[];
  confidence: number;
  reasons: string[];
  // Extended explainable anomaly fields
  score?: number; // Normalized continuous score 0.0 to 1.0
  anomaly_type?: string;
  affectedEntities?: string[];
  timestamp?: Date | string;
  evidence?: Record<string, unknown>;
  evidenceDetails?: Record<string, unknown>;
  explanation?: string;
}

export interface InvestigationSummary {
  overview: string;
  keyEntities: string[];
  majorRelationships: string[];
  importantPatterns: string[];
  timelineHighlights: string[];
  investigationAreas: string[];
  caveat: string;
}

export interface InvestigationLead {
  title: string;
  detail: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  relatedEntities?: string[];
}

export interface StructuredCallRecord {
  caller: string;
  receiver: string;
  timestamp?: string | Date;
  durationSeconds?: number;
  callType?: string;
  towerId?: string;
  sourceRecord?: string;
}

export interface StructuredTransactionRecord {
  sender: string;
  receiver: string;
  amount: number;
  currency?: string;
  timestamp?: string | Date;
  channel?: string; // UPI, RTGS, IMPS, CASH, WIRE
  transactionId?: string;
  sourceRecord?: string;
}

export interface StructuredLocationRecord {
  entity: string;
  location: string;
  timestamp?: string | Date;
  durationMinutes?: number;
  latitude?: number;
  longitude?: number;
  sourceRecord?: string;
}

export interface AnalysisContext {
  entities?: { id?: string; type: string; name: string; value?: string }[];
  relationships?: {
    type: string;
    sourceName: string;
    targetName: string;
    strength?: number;
    count?: number;
    amount?: number;
    records?: string[];
  }[];
  events?: { type?: string; summary?: string; eventAt?: Date; location?: string; detail?: string }[];
  locations?: { name: string; entities: string[]; activity?: number }[];
  calls?: { a: string; b: string; count: number; timestamps?: (Date | string)[]; durations?: number[] }[];
  transactions?: { sender: string; receiver: string; amount: number; count?: number; timestamp?: Date | string }[];
  sharedVehicles?: { vehicle: string; people: string[] }[];
  transactionChains?: string[];
  people?: { name: string; events: { type: string; location?: string; eventAt?: Date }[] }[];
  organizations?: string[];
  crossCases?: { name: string; caseIds: string[] }[];
  dataSources?: { name: string; sources: string[] }[];
  financialAccounts?: { account: string; entities: string[] }[];
  historicalCallRates?: Record<string, number>; // baseline rates (e.g. calls/week)
  caseId?: string;
}

// ---------------------------------------------------------------------------
// Core intelligence interfaces (pluggable)
// ---------------------------------------------------------------------------

export interface ExtractionProvider {
  readonly name: string;
  readonly version: string;
  extract(text: string, hints?: string[]): Promise<ExtractionResult[]>;
}

export interface SummarizerProvider {
  readonly name: string;
  readonly version: string;
  summarize(context: AnalysisContext): Promise<InvestigationSummary>;
}

export interface LeadGeneratorProvider {
  readonly name: string;
  readonly version: string;
  generateLeads(context: AnalysisContext): Promise<InvestigationLead[]>;
}

export interface PatternDetectorProvider {
  readonly name: string;
  readonly version: string;
  detectPatterns(context: AnalysisContext): Promise<DetectedPattern[]>;
}

export interface EntityMatcherProvider {
  readonly name: string;
  readonly version: string;
  match(
    source: { id: string; name: string; type: string; aliases?: string[] }[],
    target: { id: string; name: string; type: string; aliases?: string[] }[]
  ): Promise<MatchResult[]>;
}

export interface RelationshipDetectorProvider {
  readonly name: string;
  readonly version: string;
  detect(
    entities: { id: string; name: string; type: string }[],
    records: unknown[]
  ): Promise<DetectedRelationship[]>;
}

export interface AnomalyDetectorProvider {
  readonly name: string;
  readonly version: string;
  detect(context: AnalysisContext): Promise<AnomalyResult[]>;
}
