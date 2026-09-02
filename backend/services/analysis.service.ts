// CrimeIntel — Analysis Service
// ============================================================
// Orchestrates the pluggable intelligence pipeline:
//
//   Entity Extraction → Relationship Detection → Pattern Detection
//     → Anomaly Detection → Summarization → Lead Generation
//
// The service depends only on the interfaces defined in
// `backend/intelligence/interfaces.ts` and the provider registry in
// `backend/ai/providers`. Swapping an algorithm/model is achieved by
// registering a different provider — no consumer changes.
// ============================================================

import type {
  ExtractionResult,
  DetectedRelationship,
  DetectedPattern,
  AnomalyResult,
  InvestigationSummary,
  InvestigationLead,
  AnalysisContext,
} from "../intelligence/interfaces";
import {
  getExtractionProvider,
  getSummarizerProvider,
  getLeadGeneratorProvider,
  getPatternDetectorProvider,
  getAnomalyDetectorProvider,
  getRelationshipDetectorProvider,
} from "../ai/providers";

export interface PipelineInput {
  text?: string;
  hints?: string[];
  context: AnalysisContext;
}

export interface PipelineOutput {
  entities: ExtractionResult[];
  relationships: DetectedRelationship[];
  patterns: DetectedPattern[];
  anomalies: AnomalyResult[];
  summary: InvestigationSummary;
  leads: InvestigationLead[];
}

export class AnalysisService {
  /**
   * Full analysis pipeline over textual + structured context.
   */
  async runPipeline(input: PipelineInput): Promise<PipelineOutput> {
    const [entities, relationships, patterns, anomalies, summary, leads] = await Promise.all([
      input.text
        ? getExtractionProvider().extract(input.text, input.hints)
        : Promise.resolve([] as ExtractionResult[]),
      getRelationshipDetectorProvider().detect(
        (input.context.entities ?? []).filter(
          (e): e is { id: string; name: string; type: string } => !!e.id
        ),
        []
      ),
      getPatternDetectorProvider().detectPatterns(input.context),
      getAnomalyDetectorProvider().detect(input.context),
      getSummarizerProvider().summarize(input.context),
      getLeadGeneratorProvider().generateLeads(input.context),
    ]);

    return { entities, relationships, patterns, anomalies, summary, leads };
  }

  /**
   * Extraction only — used during document / dataset ingestion.
   */
  async extract(text: string, hints?: string[]): Promise<ExtractionResult[]> {
    return getExtractionProvider().extract(text, hints);
  }

  /**
   * Pattern detection only.
   */
  async detectPatterns(context: AnalysisContext): Promise<DetectedPattern[]> {
    return getPatternDetectorProvider().detectPatterns(context);
  }

  /**
   * Anomaly detection only.
   */
  async detectAnomalies(context: AnalysisContext): Promise<AnomalyResult[]> {
    return getAnomalyDetectorProvider().detect(context);
  }

  /**
   * Summarization only.
   */
  async summarize(context: AnalysisContext): Promise<InvestigationSummary> {
    return getSummarizerProvider().summarize(context);
  }

  /**
   * Lead generation only.
   */
  async generateLeads(context: AnalysisContext): Promise<InvestigationLead[]> {
    return getLeadGeneratorProvider().generateLeads(context);
  }
}

// Export a singleton instance for convenience.
export const analysisService = new AnalysisService();