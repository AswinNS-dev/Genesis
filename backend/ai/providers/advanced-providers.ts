// CrimeIntel — Advanced AI/ML Providers
// ============================================================
// Pluggable providers implementing the core intelligence interfaces using
// the dedicated Relationship Extraction and Anomaly Detection Engines.
// ============================================================

import type {
  RelationshipDetectorProvider,
  AnomalyDetectorProvider,
  ExtractionProvider,
  DetectedRelationship,
  AnomalyResult,
  AnalysisContext,
  ExtractionResult,
} from "../../intelligence/interfaces";
import {
  RelationshipExtractionEngine,
  EntityDetector,
} from "../../intelligence/relationship-extraction";
import {
  AnomalyDetectionEngine,
} from "../../intelligence/anomaly-detection";

export class AdvancedRelationshipDetectorProvider implements RelationshipDetectorProvider {
  readonly name = "advanced";
  readonly version = "2.0.0";

  async detect(
    entities: { id: string; name: string; type: string }[],
    records: unknown[]
  ): Promise<DetectedRelationship[]> {
    const idMap = new Map<string, string>();
    for (const e of entities) {
      idMap.set(e.name, e.id);
    }

    // Process structured records if provided
    const structuredRecords = Array.isArray(records)
      ? (records.filter((r) => typeof r === "object" && r !== null) as Record<string, unknown>[])
      : [];

    const extracted = RelationshipExtractionEngine.extract(
      { records: structuredRecords },
      { knownEntities: entities.map((e) => ({ name: e.name, type: e.type as never, id: e.id })) }
    );

    return RelationshipExtractionEngine.toDetectedRelationships(extracted, idMap);
  }
}

export class AdvancedAnomalyDetectorProvider implements AnomalyDetectorProvider {
  readonly name = "advanced";
  readonly version = "2.0.0";

  async detect(context: AnalysisContext): Promise<AnomalyResult[]> {
    const anomalies = AnomalyDetectionEngine.detect(context);
    return AnomalyDetectionEngine.toAnomalyResults(anomalies);
  }
}

export class AdvancedExtractionProvider implements ExtractionProvider {
  readonly name = "advanced";
  readonly version = "2.0.0";

  async extract(text: string, hints?: string[]): Promise<ExtractionResult[]> {
    const known = (hints ?? []).map((h) => ({ name: h, type: "PERSON" as const }));
    const detected = EntityDetector.extractEntities(text, known);

    return detected.map((d) => ({
      type: d.type,
      value: d.name,
      context: text.slice(Math.max(0, (d.startOffset ?? 0) - 30), Math.min(text.length, (d.endOffset ?? text.length) + 30)),
      confidence: Math.round(d.confidence * 100),
    }));
  }
}
