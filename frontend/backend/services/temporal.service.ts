// CrimeIntel — Temporal Anomaly Detection Service
// ============================================================
// Detects unusual entity activity occurring BEFORE and AFTER a
// reference crime/event timestamp.
//
// Key Statistical & Ethical Principles:
// 1. Separate BEFORE and AFTER baselines comparable to window duration.
// 2. Population standard deviation: σ = sqrt((1/N) * Σ(Ci - μ)^2).
// 3. Only TimelineEvents with a valid entityId participate in entity scoring.
// 4. Clear data sufficiency marking (avoids NaN/Infinity).
// 5. Strictly ethical language: leads & anomaly signals only,
//    never determinations of guilt or criminal status.
// ============================================================

import { prisma } from "../lib/prisma";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BaselineStatus =
  | "STATISTICALLY_SUPPORTED"
  | "INSUFFICIENT_DATA"
  | "LOW_VARIANCE"
  | "NO_HISTORICAL_ACTIVITY";

export interface TemporalDetectionInput {
  caseId: string;
  crimeTimestamp?: string | Date | null;
  beforeWindowMinutes?: number;
  afterWindowMinutes?: number;
  baselineDays?: number;
}

export interface ActivityDetail {
  id: string;
  type: string;
  summary: string;
  detail: string | null;
  eventAt: string;
  entityId: string | null;
  entityName: string | null;
  entityType: string | null;
  timing: "BEFORE" | "AFTER" | "AT_CRIME";
  minutesFromCrime: number; // negative for before, positive for after
}

export interface EntityTemporalAnomaly {
  entityId: string;
  entityName: string;
  entityType: string;
  riskScore: number;
  
  // Counts in observation window
  beforeActivityCount: number;
  afterActivityCount: number;
  totalWindowActivity: number;

  // Before baseline & scoring
  beforeBaselineMean: number;
  beforeBaselineStd: number;
  beforeAnomalyScore: number;

  // After baseline & scoring
  afterBaselineMean: number;
  afterBaselineStd: number;
  afterAnomalyScore: number;

  // Overall metric & status
  overallTemporalScore: number;
  anomalyLevel: AnomalySeverity;
  baselineStatus: BaselineStatus;
  confidence: "HIGH" | "MEDIUM" | "LOW";

  // Evidence & Explainability
  reason: string;
  evidenceActivities: ActivityDetail[];
}

export interface TemporalDetectionResult {
  crime: {
    id: string;
    caseId: string;
    title: string;
    description: string | null;
    status: string;
    category: string | null;
    jurisdiction: string | null;
    incidentDate: string | null;
    referenceTimestamp: string;
  };
  window: {
    beforeMinutes: number;
    afterMinutes: number;
    baselineDays: number;
    beforeStart: string;
    afterEnd: string;
  };
  statistics: {
    totalWindowActivities: number;
    beforeActivitiesCount: number;
    afterActivitiesCount: number;
    unlinkedActivitiesCount: number;
    evaluatedEntitiesCount: number;
    anomalousEntitiesCount: number;
  };
  anomalies: EntityTemporalAnomaly[];
  timeline: ActivityDetail[];
  unassignedActivities: ActivityDetail[];
  summary: {
    overview: string;
    highRiskSignals: string[];
    investigativeNextSteps: string[];
    disclaimer: string;
  };
}

export class TemporalService {
  /**
   * Main Temporal Anomaly Detection engine.
   */
  async detectTemporalAnomalies(
    input: TemporalDetectionInput
  ): Promise<TemporalDetectionResult> {
    const beforeMinutes = Math.max(5, Math.min(10080, input.beforeWindowMinutes ?? 120));
    const afterMinutes = Math.max(5, Math.min(10080, input.afterWindowMinutes ?? 120));
    const baselineDays = Math.max(1, Math.min(365, input.baselineDays ?? 30));

    // 1. Fetch Crime / Case
    const crimeCase = await prisma.investigationCase.findFirst({
      where: {
        OR: [{ id: input.caseId }, { caseId: input.caseId }],
      },
      include: {
        entities: true,
      },
    });

    if (!crimeCase) {
      throw new Error(`Investigation case "${input.caseId}" was not found.`);
    }

    // Determine reference crime timestamp
    let crimeDate: Date;
    if (input.crimeTimestamp) {
      crimeDate = new Date(input.crimeTimestamp);
      if (isNaN(crimeDate.getTime())) {
        crimeDate = crimeCase.incidentDate ?? crimeCase.createdAt;
      }
    } else {
      crimeDate = crimeCase.incidentDate ?? crimeCase.createdAt;
    }

    const crimeTimeMs = crimeDate.getTime();
    const beforeStartMs = crimeTimeMs - beforeMinutes * 60 * 1000;
    const afterEndMs = crimeTimeMs + afterMinutes * 60 * 1000;
    const baselineStartMs = crimeTimeMs - baselineDays * 24 * 60 * 60 * 1000;

    const beforeStartDate = new Date(beforeStartMs);
    const afterEndDate = new Date(afterEndMs);
    const baselineStartDate = new Date(baselineStartMs);

    // 2. Fetch all TimelineEvents in [baselineStartDate, afterEndDate]
    const allEvents = await prisma.timelineEvent.findMany({
      where: {
        eventAt: {
          gte: baselineStartDate,
          lte: afterEndDate,
        },
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            riskScore: true,
          },
        },
      },
      orderBy: { eventAt: "asc" },
    });

    // 3. Separate events into Window Events vs Historical Baseline Events
    const windowEvents: ActivityDetail[] = [];
    const unassignedActivities: ActivityDetail[] = [];
    const historicalBeforeEventsByEntity = new Map<string, Date[]>();

    // Collect all unique entities
    const entityMap = new Map<
      string,
      { id: string; name: string; type: string; riskScore: number }
    >();

    // Pre-populate with case entities if available
    for (const ent of crimeCase.entities) {
      entityMap.set(ent.id, {
        id: ent.id,
        name: ent.name,
        type: ent.type,
        riskScore: ent.riskScore,
      });
    }

    for (const ev of allEvents) {
      const evTimeMs = ev.eventAt.getTime();
      const isInsideWindow = evTimeMs >= beforeStartMs && evTimeMs <= afterEndMs;
      const minutesFromCrime = Math.round((evTimeMs - crimeTimeMs) / (60 * 1000));

      let timing: "BEFORE" | "AFTER" | "AT_CRIME";
      if (minutesFromCrime < 0) {
        timing = "BEFORE";
      } else if (minutesFromCrime > 0) {
        timing = "AFTER";
      } else {
        timing = "AT_CRIME";
      }

      const activityItem: ActivityDetail = {
        id: ev.id,
        type: ev.type,
        summary: ev.summary,
        detail: ev.detail,
        eventAt: ev.eventAt.toISOString(),
        entityId: ev.entityId ?? null,
        entityName: ev.entity?.name ?? null,
        entityType: ev.entity?.type ?? null,
        timing,
        minutesFromCrime,
      };

      if (isInsideWindow) {
        windowEvents.push(activityItem);
        if (!ev.entityId) {
          unassignedActivities.push(activityItem);
        }
      }

      // Track entity if present (Section 6C rule: only valid entityId participates)
      if (ev.entityId && ev.entity) {
        if (!entityMap.has(ev.entityId)) {
          entityMap.set(ev.entityId, {
            id: ev.entity.id,
            name: ev.entity.name,
            type: ev.entity.type,
            riskScore: ev.entity.riskScore,
          });
        }

        // Add to historical arrays if strictly prior to the window start
        if (evTimeMs >= baselineStartMs && evTimeMs < beforeStartMs) {
          if (!historicalBeforeEventsByEntity.has(ev.entityId)) {
            historicalBeforeEventsByEntity.set(ev.entityId, []);
          }
          historicalBeforeEventsByEntity.get(ev.entityId)!.push(ev.eventAt);
        }
      }
    }

    // 4. Calculate Separate BEFORE & AFTER Baselines and Scores per Entity (Sections 6A, 6B, 6C, 6D)
    const entityAnomalies: EntityTemporalAnomaly[] = [];

    const historicalTotalMinutes = Math.max(
      1,
      Math.round((beforeStartMs - baselineStartMs) / (60 * 1000))
    );

    const numBeforeBins = Math.max(1, Math.floor(historicalTotalMinutes / beforeMinutes));
    const numAfterBins = Math.max(1, Math.floor(historicalTotalMinutes / afterMinutes));

    const entityEntries = Array.from(entityMap.entries());
    for (let i = 0; i < entityEntries.length; i++) {
      const [entityId, entityInfo] = entityEntries[i];
      // Observed window counts
      const beforeEvents = windowEvents.filter(
        (e) => e.entityId === entityId && e.minutesFromCrime < 0
      );
      const afterEvents = windowEvents.filter(
        (e) => e.entityId === entityId && e.minutesFromCrime >= 0
      );
      const allEntityWindowEvents = windowEvents.filter(
        (e) => e.entityId === entityId
      );

      const observedBefore = beforeEvents.length;
      const observedAfter = afterEvents.length;
      const totalWindowActivity = allEntityWindowEvents.length;

      // Historical events prior to window
      const histTimestamps = historicalBeforeEventsByEntity.get(entityId) ?? [];
      const totalHistCount = histTimestamps.length;

      // Calculate separate BEFORE baseline
      const {
        mean: beforeBaselineMean,
        std: beforeBaselineStd,
      } = this.calculateBinnedBaseline(
        histTimestamps,
        baselineStartMs,
        beforeStartMs,
        beforeMinutes,
        numBeforeBins
      );

      // Calculate separate AFTER baseline
      const {
        mean: afterBaselineMean,
        std: afterBaselineStd,
      } = this.calculateBinnedBaseline(
        histTimestamps,
        baselineStartMs,
        beforeStartMs,
        afterMinutes,
        numAfterBins
      );

      // Compute Z-Scores (Section 6B & 6D)
      const beforeAnomalyScore = this.computeScore(
        observedBefore,
        beforeBaselineMean,
        beforeBaselineStd,
        totalHistCount
      );

      const afterAnomalyScore = this.computeScore(
        observedAfter,
        afterBaselineMean,
        afterBaselineStd,
        totalHistCount
      );

      const overallTemporalScore = Number(
        Math.max(beforeAnomalyScore, afterAnomalyScore).toFixed(2)
      );

      // Determine composite Baseline Status & Confidence
      let baselineStatus: BaselineStatus = "STATISTICALLY_SUPPORTED";
      let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";

      if (totalHistCount === 0) {
        baselineStatus = "NO_HISTORICAL_ACTIVITY";
        confidence = "LOW";
      } else if (numBeforeBins < 5 || numAfterBins < 5) {
        baselineStatus = "INSUFFICIENT_DATA";
        confidence = "LOW";
      } else if (beforeBaselineStd === 0 && afterBaselineStd === 0) {
        baselineStatus = "LOW_VARIANCE";
        confidence = "MEDIUM";
      }

      // Anomaly level categorization
      let anomalyLevel: AnomalySeverity = "LOW";
      if (overallTemporalScore >= 3.5) {
        anomalyLevel = "CRITICAL";
      } else if (overallTemporalScore >= 2.5) {
        anomalyLevel = "HIGH";
      } else if (overallTemporalScore >= 1.5) {
        anomalyLevel = "MEDIUM";
      }

      // Generate explainable reason
      const reason = this.generateExplainableReason(
        entityInfo.name,
        observedBefore,
        observedAfter,
        beforeMinutes,
        afterMinutes,
        beforeBaselineMean,
        afterBaselineMean,
        overallTemporalScore,
        anomalyLevel,
        baselineStatus
      );

      // Include entities that have window activity or historical links to this case
      if (totalWindowActivity > 0 || totalHistCount > 0) {
        entityAnomalies.push({
          entityId,
          entityName: entityInfo.name,
          entityType: entityInfo.type,
          riskScore: entityInfo.riskScore,
          beforeActivityCount: observedBefore,
          afterActivityCount: observedAfter,
          totalWindowActivity,
          beforeBaselineMean: Number(beforeBaselineMean.toFixed(2)),
          beforeBaselineStd: Number(beforeBaselineStd.toFixed(2)),
          beforeAnomalyScore: Number(beforeAnomalyScore.toFixed(2)),
          afterBaselineMean: Number(afterBaselineMean.toFixed(2)),
          afterBaselineStd: Number(afterBaselineStd.toFixed(2)),
          afterAnomalyScore: Number(afterAnomalyScore.toFixed(2)),
          overallTemporalScore,
          anomalyLevel,
          baselineStatus,
          confidence,
          reason,
          evidenceActivities: allEntityWindowEvents,
        });
      }
    }

    // 5. Rank Entities by Overall Temporal Anomaly Score (descending)
    entityAnomalies.sort((a, b) => {
      if (b.overallTemporalScore !== a.overallTemporalScore) {
        return b.overallTemporalScore - a.overallTemporalScore;
      }
      return b.totalWindowActivity - a.totalWindowActivity;
    });

    // 6. Aggregate Statistics
    const beforeCount = windowEvents.filter((e) => e.minutesFromCrime < 0).length;
    const afterCount = windowEvents.filter((e) => e.minutesFromCrime >= 0).length;
    const anomalousEntitiesCount = entityAnomalies.filter(
      (a) => a.anomalyLevel === "HIGH" || a.anomalyLevel === "CRITICAL"
    ).length;

    // 7. Generate Investigation Summary & Action Items
    const summary = this.buildInvestigationSummary(
      crimeCase.caseId,
      crimeCase.title,
      crimeDate,
      beforeMinutes,
      afterMinutes,
      entityAnomalies
    );

    return {
      crime: {
        id: crimeCase.id,
        caseId: crimeCase.caseId,
        title: crimeCase.title,
        description: crimeCase.description,
        status: crimeCase.status,
        category: crimeCase.category,
        jurisdiction: crimeCase.jurisdiction,
        incidentDate: crimeCase.incidentDate ? crimeCase.incidentDate.toISOString() : null,
        referenceTimestamp: crimeDate.toISOString(),
      },
      window: {
        beforeMinutes,
        afterMinutes,
        baselineDays,
        beforeStart: beforeStartDate.toISOString(),
        afterEnd: afterEndDate.toISOString(),
      },
      statistics: {
        totalWindowActivities: windowEvents.length,
        beforeActivitiesCount: beforeCount,
        afterActivitiesCount: afterCount,
        unlinkedActivitiesCount: unassignedActivities.length,
        evaluatedEntitiesCount: entityAnomalies.length,
        anomalousEntitiesCount,
      },
      anomalies: entityAnomalies,
      timeline: windowEvents,
      unassignedActivities,
      summary,
    };
  }

  /**
   * Calculates mean and population standard deviation across non-overlapping historical bins.
   * Section 6A & 6B.
   */
  private calculateBinnedBaseline(
    timestamps: Date[],
    startMs: number,
    endMs: number,
    binMinutes: number,
    numBins: number
  ): { mean: number; std: number; status: BaselineStatus } {
    if (numBins <= 0 || timestamps.length === 0) {
      return { mean: 0, std: 0, status: "NO_HISTORICAL_ACTIVITY" };
    }

    const binDurationMs = binMinutes * 60 * 1000;
    const counts = new Array<number>(numBins).fill(0);

    for (const ts of timestamps) {
      const ms = ts.getTime();
      if (ms >= startMs && ms < endMs) {
        const binIndex = Math.min(
          numBins - 1,
          Math.floor((ms - startMs) / binDurationMs)
        );
        if (binIndex >= 0 && binIndex < numBins) {
          counts[binIndex]++;
        }
      }
    }

    // Population Mean: μ = (1/N) * Σ Ci
    const sum = counts.reduce((acc, c) => acc + c, 0);
    const mean = sum / numBins;

    // Population Standard Deviation: σ = sqrt((1/N) * Σ (Ci - μ)^2)
    const varianceSum = counts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0);
    const std = Math.sqrt(varianceSum / numBins);

    let status: BaselineStatus = "STATISTICALLY_SUPPORTED";
    if (std === 0) {
      status = "LOW_VARIANCE";
    }

    return { mean, std, status };
  }

  /**
   * Computes Z-Score with zero-variance & low-data safe handling.
   * Section 6B & 6D.
   */
  private computeScore(
    observed: number,
    mean: number,
    std: number,
    totalHistoricalObservations: number
  ): number {
    if (observed === 0 && mean === 0) {
      return 0.0;
    }

    // If standard deviation > 0, calculate standard Z-score
    if (std > 0) {
      const z = (observed - mean) / std;
      return Math.max(0, Number(z.toFixed(2)));
    }

    // Zero variance (σ = 0) handling (Section 6D)
    if (totalHistoricalObservations > 0) {
      if (observed > mean) {
        const boost = 1.0 + (observed - mean) * 0.5;
        return Math.min(5.0, Number(boost.toFixed(2)));
      }
      return 0.0;
    }

    // No historical data: rate-based bounded indicator
    if (observed > 0) {
      return Math.min(3.0, Number((0.5 + observed * 0.4).toFixed(2)));
    }

    return 0.0;
  }

  /**
   * Generates explainable, investigator-friendly narrative.
   * Strictly adheres to ethical terminology.
   */
  private generateExplainableReason(
    entityName: string,
    observedBefore: number,
    observedAfter: number,
    beforeMins: number,
    afterMins: number,
    beforeMean: number,
    afterMean: number,
    overallScore: number,
    anomalyLevel: AnomalySeverity,
    baselineStatus: BaselineStatus
  ): string {
    const parts: string[] = [];

    if (anomalyLevel === "CRITICAL" || anomalyLevel === "HIGH") {
      parts.push(
        `Entity "${entityName}" recorded a marked temporal activity anomaly (Score: ${overallScore.toFixed(2)}).`
      );
    } else if (anomalyLevel === "MEDIUM") {
      parts.push(
        `Entity "${entityName}" exhibited moderate activity elevation (Score: ${overallScore.toFixed(2)}).`
      );
    } else {
      parts.push(
        `Entity "${entityName}" activity is consistent with normal baseline levels (Score: ${overallScore.toFixed(2)}).`
      );
    }

    if (observedBefore > 0) {
      parts.push(
        `${observedBefore} events recorded in the ${beforeMins}m before the crime (historical avg: ${beforeMean.toFixed(1)}/window).`
      );
    }

    if (observedAfter > 0) {
      parts.push(
        `${observedAfter} events recorded in the ${afterMins}m after the crime (historical avg: ${afterMean.toFixed(1)}/window).`
      );
    }

    if (baselineStatus === "NO_HISTORICAL_ACTIVITY") {
      parts.push(
        `[Note: Limited historical baseline data available; score reflects direct window density and requires investigator verification.]`
      );
    } else if (baselineStatus === "LOW_VARIANCE") {
      parts.push(
        `[Note: Baseline shows near-uniform historical distribution; increase is statistically notable.]`
      );
    }

    parts.push(
      `Investigative signal only — does not imply culpability; investigator review required.`
    );

    return parts.join(" ");
  }

  /**
   * Constructs summary and prioritized leads.
   */
  private buildInvestigationSummary(
    caseId: string,
    caseTitle: string,
    crimeDate: Date,
    beforeMins: number,
    afterMins: number,
    anomalies: EntityTemporalAnomaly[]
  ) {
    const highEntities = anomalies.filter(
      (a) => a.anomalyLevel === "HIGH" || a.anomalyLevel === "CRITICAL"
    );

    const highSignals: string[] = [];
    for (const h of highEntities.slice(0, 4)) {
      highSignals.push(
        `Elevated activity for "${h.entityName}" (Score: ${h.overallTemporalScore}, ${h.beforeActivityCount} before / ${h.afterActivityCount} after).`
      );
    }

    const nextSteps: string[] = [
      "Review communication and location timestamps against independent surveillance or log records.",
      "Check co-occurrence of high-anomaly entities in the immediate before/after windows.",
      "Corroborate whether sudden post-event communication drops or surges align with secondary events.",
    ];

    return {
      overview: `Temporal anomaly analysis around reference event for Case ${caseId} ("${caseTitle}") at ${crimeDate.toLocaleString()} across a [-${beforeMins}m, +${afterMins}m] window. Identified ${highEntities.length} entities with notable activity spikes compared to their historical baselines.`,
      highRiskSignals: highSignals.length ? highSignals : ["No critical temporal spikes detected in the selected window."],
      investigativeNextSteps: nextSteps,
      disclaimer:
        "Ethical Reminder: Temporal anomaly detection highlights statistical outliers in event density around a reference timestamp. Results are investigative leads for human analysts and do NOT constitute proof of involvement or guilt.",
    };
  }
}

export const temporalService = new TemporalService();
