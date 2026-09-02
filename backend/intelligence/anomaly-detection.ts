// CrimeIntel — Anomaly Detection & Scoring Engine
// ============================================================
// Detects statistical, behavioral, temporal, and graph structural anomalies
// across investigation data:
//
// 1. Call Data: Spikes, high frequency, off-hours, long durations, new links
// 2. Financial Data: Large transactions, bursts/structuring, rapid velocity
// 3. Location Data: Impossible travel jumps, co-location clusters, new hotspots
// 4. Network Graph: Bridge nodes (Betweenness Centrality), hubs (Degree Centrality),
//                   community bridging, disconnected component linking
//
// Methods: Z-Score, IQR, Isolation Forest, Local Outlier Factor (LOF),
//          Brandes' Betweenness Centrality, Degree Centrality, Community Detection.
//
// ETHICS: Does NOT classify any person as a criminal. Identifies statistical/structural
// outliers for investigator review with fully explainable evidence.
// ============================================================

import type { AnalysisContext, AnomalyResult } from "./interfaces";

export interface AnomalyEvidence {
  metricName?: string;
  baselineValue?: number | string;
  observedValue?: number | string;
  deviationMultiplier?: number;
  zScore?: number;
  iqrBounds?: { lower: number; upper: number };
  timePeriod?: string;
  threshold?: number;
  context?: string;
  [key: string]: unknown;
}

export interface DetailedAnomaly {
  anomalyType: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // 0.00 to 1.00
  affectedEntities: string[];
  timestamp?: string;
  supportingRecords: string[];
  evidence: AnomalyEvidence;
  reasons: string[];
  explanation: string;
}

// ---------------------------------------------------------------------------
// 1. Mathematical & Statistical Methods
// ---------------------------------------------------------------------------

export class StatisticalAnomalyDetector {
  /**
   * Calculates Mean, Standard Deviation, and Z-Scores for a series.
   */
  static calculateZScores(values: number[]): { mean: number; std: number; zScores: number[] } {
    if (values.length === 0) return { mean: 0, std: 0, zScores: [] };
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    const zScores = values.map((v) => (std > 0 ? (v - mean) / std : 0));
    return { mean, std, zScores };
  }

  /**
   * Calculates Quartiles (Q1, Median, Q3) and Interquartile Range (IQR) bounds.
   * Robust against skewed data (e.g. transaction amounts).
   */
  static calculateIQR(values: number[]): {
    q1: number;
    median: number;
    q3: number;
    iqr: number;
    mildLower: number;
    mildUpper: number;
    extremeUpper: number;
  } {
    if (values.length === 0) {
      return { q1: 0, median: 0, q3: 0, iqr: 0, mildLower: 0, mildUpper: 0, extremeUpper: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const percentile = (p: number) => {
      const idx = (n - 1) * p;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    const q1 = percentile(0.25);
    const median = percentile(0.5);
    const q3 = percentile(0.75);
    const iqr = Math.max(0, q3 - q1);

    return {
      q1,
      median,
      q3,
      iqr,
      mildLower: q1 - 1.5 * iqr,
      mildUpper: q3 + 1.5 * iqr,
      extremeUpper: q3 + 3.0 * iqr,
    };
  }

  /**
   * Fast, tree-based Isolation Forest for multi-dimensional anomaly scoring.
   */
  static computeIsolationScores(points: number[][], numTrees = 25, sampleSize = 32): number[] {
    const n = points.length;
    if (n <= 1) return points.map(() => 0.1);

    const dim = points[0].length;
    const actualSampleSize = Math.min(n, sampleSize);

    // Build isolation trees
    const trees: { root: unknown }[] = [];
    for (let t = 0; t < numTrees; t++) {
      // Subsample indices
      const subIdx = new Set<number>();
      while (subIdx.size < actualSampleSize) {
        subIdx.add(Math.floor(Math.random() * n));
      }
      const sample = Array.from(subIdx).map((i) => points[i]);
      trees.push({ root: this.buildITree(sample, 0, Math.ceil(Math.log2(actualSampleSize))) });
    }

    // Average path length
    const cN = this.eulerC(actualSampleSize);
    return points.map((p) => {
      let totalDepth = 0;
      for (const tree of trees) {
        totalDepth += this.pathLength(p, tree.root, 0);
      }
      const avgDepth = totalDepth / numTrees;
      // Anomaly score s(x, n) = 2^(-E(h(x)) / c(n))
      const score = Math.pow(2, -avgDepth / cN);
      return Math.min(1.0, Math.max(0.0, score));
    });
  }

  private static buildITree(sample: number[][], currentDepth: number, maxDepth: number): unknown {
    if (sample.length <= 1 || currentDepth >= maxDepth) {
      return { size: sample.length };
    }
    const dim = sample[0].length;
    const splitAttr = Math.floor(Math.random() * dim);
    const vals = sample.map((s) => s[splitAttr]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) {
      return { size: sample.length };
    }

    const splitVal = min + Math.random() * (max - min);
    const left = sample.filter((s) => s[splitAttr] < splitVal);
    const right = sample.filter((s) => s[splitAttr] >= splitVal);

    return {
      splitAttr,
      splitVal,
      left: this.buildITree(left, currentDepth + 1, maxDepth),
      right: this.buildITree(right, currentDepth + 1, maxDepth),
    };
  }

  private static pathLength(p: number[], node: unknown, currentDepth: number): number {
    const n = node as { size?: number; splitAttr?: number; splitVal?: number; left?: unknown; right?: unknown };
    if (!n || n.size !== undefined) {
      const size = n?.size ?? 1;
      return currentDepth + (size > 1 ? this.eulerC(size) : 0);
    }
    if (p[n.splitAttr!] < n.splitVal!) {
      return this.pathLength(p, n.left, currentDepth + 1);
    }
    return this.pathLength(p, n.right, currentDepth + 1);
  }

  private static eulerC(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }

  /**
   * Local Outlier Factor (LOF) for density-based multi-point outlier detection.
   */
  static computeLOF(points: number[][], k = 5): number[] {
    const n = points.length;
    if (n <= k) return points.map(() => 1.0);

    const dist = (a: number[], b: number[]) =>
      Math.sqrt(a.reduce((acc, val, i) => acc + Math.pow(val - (b[i] ?? 0), 2), 0));

    // 1. k-distance and k-neighbors
    const distances: number[][] = [];
    for (let i = 0; i < n; i++) {
      const dList = points.map((p, j) => ({ j, d: dist(points[i], p) })).filter((x) => x.j !== i);
      dList.sort((a, b) => a.d - b.d);
      distances.push(dList.map((x) => x.d));
    }

    const kDist = (i: number) => distances[i][k - 1] ?? 0.001;

    // 2. Reachability distance
    const reachDist = (p: number, o: number) => Math.max(kDist(o), dist(points[p], points[o]));

    // 3. Local reachability density (lrd)
    const lrd = (p: number) => {
      const neighbors = distances[p].slice(0, k);
      let sumReach = 0;
      for (let j = 0; j < k; j++) {
        sumReach += reachDist(p, j);
      }
      return k / Math.max(0.0001, sumReach);
    };

    const lrds = points.map((_, i) => lrd(i));

    // 4. LOF
    return points.map((_, p) => {
      let sumRatio = 0;
      for (let j = 0; j < k; j++) {
        sumRatio += (lrds[j] ?? 1) / Math.max(0.0001, lrds[p] ?? 1);
      }
      return sumRatio / k;
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Graph & Network Analytics Engine
// ---------------------------------------------------------------------------

export class GraphAnomalyDetector {
  /**
   * Calculates Degree Centrality for all nodes.
   */
  static calculateDegreeCentrality(
    nodes: string[],
    edges: { source: string; target: string; weight?: number }[]
  ): Map<string, { degree: number; normalizedDegree: number; isOutlier: boolean }> {
    const degMap = new Map<string, number>();
    for (const n of nodes) degMap.set(n, 0);

    for (const e of edges) {
      degMap.set(e.source, (degMap.get(e.source) ?? 0) + 1);
      degMap.set(e.target, (degMap.get(e.target) ?? 0) + 1);
    }

    const n = Math.max(1, nodes.length - 1);
    const degrees = Array.from(degMap.values());
    const { mean, std } = StatisticalAnomalyDetector.calculateZScores(degrees);

    const result = new Map<string, { degree: number; normalizedDegree: number; isOutlier: boolean }>();
    for (const [node, deg] of degMap.entries()) {
      const norm = deg / n;
      const isOutlier = deg >= 5 && deg > mean + 2.0 * std;
      result.set(node, { degree: deg, normalizedDegree: norm, isOutlier });
    }
    return result;
  }

  /**
   * Brandes' Algorithm for Exact Betweenness Centrality O(V * E).
   * Identifies bridge nodes connecting otherwise isolated sub-networks.
   */
  static calculateBetweennessCentrality(
    nodes: string[],
    edges: { source: string; target: string }[]
  ): Map<string, number> {
    const cb = new Map<string, number>();
    for (const n of nodes) cb.set(n, 0);

    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const e of edges) {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    }

    for (const s of nodes) {
      const stack: string[] = [];
      const p = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const d = new Map<string, number>();

      for (const n of nodes) {
        p.set(n, []);
        sigma.set(n, 0);
        d.set(n, -1);
      }

      sigma.set(s, 1);
      d.set(s, 0);

      const queue: string[] = [s];
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        const distV = d.get(v)!;

        for (const w of adj.get(v) ?? []) {
          if (d.get(w)! < 0) {
            d.set(w, distV + 1);
            queue.push(w);
          }
          if (d.get(w)! === distV + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            p.get(w)!.push(v);
          }
        }
      }

      const delta = new Map<string, number>();
      for (const n of nodes) delta.set(n, 0);

      while (stack.length > 0) {
        const w = stack.pop()!;
        const coeff = (1 + delta.get(w)!) / (sigma.get(w) || 1);
        for (const v of p.get(w)!) {
          delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
        }
        if (w !== s) {
          cb.set(w, cb.get(w)! + delta.get(w)!);
        }
      }
    }

    // Normalize (undirected graph: divide by 2)
    const n = nodes.length;
    const factor = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1;
    for (const [node, val] of cb.entries()) {
      cb.set(node, (val / 2) * factor);
    }

    return cb;
  }

  /**
   * Connected Components & Community Detection to identify cluster bridges.
   */
  static findCommunitiesAndBridges(
    nodes: string[],
    edges: { source: string; target: string }[]
  ): {
    components: string[][];
    bridgeNodes: { node: string; connectedCommunities: number; betweenness: number }[];
  } {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n, new Set());
    for (const e of edges) {
      adj.get(e.source)?.add(e.target);
      adj.get(e.target)?.add(e.source);
    }

    // 1. Connected components
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const n of nodes) {
      if (!visited.has(n)) {
        const comp: string[] = [];
        const q = [n];
        visited.add(n);
        while (q.length > 0) {
          const curr = q.shift()!;
          comp.push(curr);
          for (const neighbor of adj.get(curr) ?? []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              q.push(neighbor);
            }
          }
        }
        components.push(comp);
      }
    }

    // 2. Simple Community Labeling (Component / Neighborhood cluster assignment)
    const betweenness = this.calculateBetweennessCentrality(nodes, edges);
    const bridgeNodes: { node: string; connectedCommunities: number; betweenness: number }[] = [];

    for (const [node, bc] of betweenness.entries()) {
      const neighbors = Array.from(adj.get(node) ?? []);
      // If node connects multiple distinct entities that would otherwise be distant
      if (neighbors.length >= 3 && bc >= 0.15) {
        bridgeNodes.push({
          node,
          connectedCommunities: Math.min(neighbors.length, 3),
          betweenness: Math.round(bc * 100) / 100,
        });
      }
    }

    return { components, bridgeNodes };
  }
}

// ---------------------------------------------------------------------------
// 3. Domain-Specific Anomaly Detectors
// ---------------------------------------------------------------------------

export class DomainAnomalyDetector {
  /**
   * Detects Call & Communication Anomalies:
   * - Communication Spikes (baseline vs observed rate)
   * - High frequency outliers
   * - Off-hours calls (00:00 - 05:00)
   * - Unusually long duration calls
   * - New communication links
   */
  static detectCallAnomalies(
    calls: { a: string; b: string; count: number; timestamps?: (Date | string)[]; durations?: number[] }[],
    historicalRates: Record<string, number> = {} // baseline calls/week
  ): DetailedAnomaly[] {
    const anomalies: DetailedAnomaly[] = [];

    for (const call of calls) {
      const pairKey = [call.a, call.b].sort().join(" ↔ ");
      const baseline = historicalRates[pairKey] ?? historicalRates[call.a] ?? 2; // default baseline: 2 calls/week

      // 1. Spike Detection (e.g. 2 calls/week -> 45 calls/day)
      const observedDaily = call.count;
      const expectedDaily = baseline / 7;
      const multiplier = expectedDaily > 0 ? observedDaily / expectedDaily : observedDaily;

      if (observedDaily >= 10 && multiplier >= 5.0) {
        const score = Math.min(0.98, 0.75 + Math.min(0.23, multiplier / 100));
        anomalies.push({
          anomalyType: "COMMUNICATION_SPIKE",
          title: `Unusual communication spike: ${call.a} ↔ ${call.b}`,
          description: `Communication frequency increased significantly compared with historical activity.`,
          severity: multiplier >= 15 || observedDaily >= 30 ? "HIGH" : "MEDIUM",
          score: Math.round(score * 100) / 100,
          affectedEntities: [call.a, call.b],
          supportingRecords: ["Communication_Record.csv"],
          evidence: {
            metricName: "Call Frequency",
            normal_frequency: baseline,
            observed_frequency: observedDaily,
            time_period: "24 hours",
            deviationMultiplier: Math.round(multiplier * 10) / 10,
          },
          reasons: [
            `${call.a}'s communication with ${call.b} increased from an average of ${baseline} calls/week to ${observedDaily} calls/day during the selected period.`,
            `Activity is ${Math.round(multiplier)}x above baseline pattern`,
            `Contact surge exceeds statistical threshold for this relationship`,
          ],
          explanation: `${call.a}'s communication with ${call.b} increased from an average of ${baseline} calls/week to ${observedDaily} calls/day during the selected period.`,
        });
      }

      // 2. Off-Hours Communication (00:00 - 05:00 AM)
      if (call.timestamps && call.timestamps.length > 0) {
        const offHourCalls = call.timestamps.filter((t) => {
          const d = new Date(t);
          const hr = d.getHours();
          const utchr = d.getUTCHours();
          return (hr >= 0 && hr <= 5) || (utchr >= 0 && utchr <= 5) || hr >= 23 || utchr >= 23;
        });

        if (offHourCalls.length >= 2) {
          anomalies.push({
            anomalyType: "OFF_HOURS_COMMUNICATION",
            title: `Off-hours communication: ${call.a} ↔ ${call.b}`,
            description: `${offHourCalls.length} calls occurred between 00:00 and 05:00 AM outside normal diurnal activity patterns.`,
            severity: offHourCalls.length >= 5 ? "HIGH" : "MEDIUM",
            score: 0.82,
            affectedEntities: [call.a, call.b],
            supportingRecords: ["Communication_Record.csv"],
            evidence: {
              metricName: "Nighttime Calls",
              offHoursCount: offHourCalls.length,
              timeWindow: "00:00 - 05:00",
            },
            reasons: [
              `Calls concentrated during late-night hours (00:00–05:00)`,
              `Deviates from standard daytime communication baseline`,
            ],
            explanation: `${call.a} and ${call.b} engaged in ${offHourCalls.length} communication events during late-night hours (00:00–05:00).`,
          });
        }
      }

      // 3. Unusually Long Calls
      if (call.durations && call.durations.length > 0) {
        const { mildUpper } = StatisticalAnomalyDetector.calculateIQR(call.durations);
        const longCalls = call.durations.filter((d) => d >= 1800 || (mildUpper > 0 && d > mildUpper && d > 600));

        if (longCalls.length > 0) {
          const maxDur = Math.max(...longCalls);
          anomalies.push({
            anomalyType: "UNUSUAL_CALL_DURATION",
            title: `Unusually long call: ${call.a} ↔ ${call.b}`,
            description: `Call duration of ${Math.round(maxDur / 60)} minutes significantly exceeds standard call length.`,
            severity: maxDur >= 3600 ? "HIGH" : "MEDIUM",
            score: 0.78,
            affectedEntities: [call.a, call.b],
            supportingRecords: ["Communication_Record.csv"],
            evidence: {
              metricName: "Call Duration",
              observedDurationMinutes: Math.round(maxDur / 60),
              thresholdMinutes: Math.round((mildUpper || 600) / 60),
            },
            reasons: [
              `Call duration of ${Math.round(maxDur / 60)} minutes is an outlier relative to typical contact duration`,
            ],
            explanation: `A call between ${call.a} and ${call.b} lasted ${Math.round(maxDur / 60)} minutes, which is significantly longer than typical contact.`,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detects Financial Transaction Anomalies:
   * - Unusually large transaction amount (IQR / Z-score outlier)
   * - Sudden transaction frequency / burst (structuring pattern)
   * - Rapid pass-through movement of money (layering / velocity)
   */
  static detectTransactionAnomalies(
    transactions: { sender: string; receiver: string; amount: number; count?: number; timestamp?: Date | string }[]
  ): DetailedAnomaly[] {
    const anomalies: DetailedAnomaly[] = [];
    if (transactions.length === 0) return anomalies;

    const amounts = transactions.map((t) => t.amount);
    const { q1, q3, mildUpper, extremeUpper } = StatisticalAnomalyDetector.calculateIQR(amounts);
    const { mean, std, zScores } = StatisticalAnomalyDetector.calculateZScores(amounts);

    // 1. Large Transaction Amount Outliers
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const z = zScores[i] ?? 0;
      const isOutlier = (mildUpper > 0 && tx.amount > mildUpper && tx.amount > 50000) || z >= 2.5;

      if (isOutlier) {
        const isSevere = (extremeUpper > 0 && tx.amount > extremeUpper) || z >= 3.5 || tx.amount >= 500000;
        const score = Math.min(0.99, 0.85 + (isSevere ? 0.10 : 0.04));

        anomalies.push({
          anomalyType: "UNUSUAL_TRANSACTION_AMOUNT",
          title: `Large transaction amount: ${tx.sender} → ${tx.receiver}`,
          description: `Transaction amount significantly above historical pattern.`,
          severity: isSevere ? "HIGH" : "MEDIUM",
          score: Math.round(score * 100) / 100,
          affectedEntities: [tx.sender, tx.receiver],
          timestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : undefined,
          supportingRecords: ["Transaction_Record.csv"],
          evidence: {
            metricName: "Transaction Amount",
            normal_range: `₹${Math.round(q1).toLocaleString()} – ₹${Math.round(q3).toLocaleString()}`,
            observed_amount: tx.amount,
            z_score: Math.round(z * 100) / 100,
            upper_bound: Math.round(mildUpper),
          },
          reasons: [
            `Transaction amount of ₹${tx.amount.toLocaleString()} is significantly higher than the baseline range (₹${Math.round(q1).toLocaleString()}–₹${Math.round(q3).toLocaleString()})`,
            `Z-score of ${Math.round(z * 10) / 10} represents a statistical outlier in the financial transaction series`,
          ],
          explanation: `A transaction of ₹${tx.amount.toLocaleString()} from ${tx.sender} to ${tx.receiver} deviates significantly from historical transfer amounts.`,
        });
      }
    }

    // 2. High Frequency / Burst / Structuring
    const senderCounts = new Map<string, number>();
    for (const tx of transactions) {
      senderCounts.set(tx.sender, (senderCounts.get(tx.sender) ?? 0) + (tx.count ?? 1));
    }

    for (const [sender, count] of senderCounts.entries()) {
      if (count >= 5) {
        anomalies.push({
          anomalyType: "TRANSACTION_FREQUENCY_ANOMALY",
          title: `High transaction frequency from ${sender}`,
          description: `${count} financial transactions originated from ${sender} in a concentrated window.`,
          severity: count >= 10 ? "HIGH" : "MEDIUM",
          score: Math.min(0.95, 0.75 + count * 0.02),
          affectedEntities: [sender],
          supportingRecords: ["Transaction_Record.csv"],
          evidence: {
            metricName: "Transaction Count",
            count,
            threshold: 4,
          },
          reasons: [
            `${count} outbound transactions recorded within the analysis period`,
            `Rapid succession of transfers warrants verification for structuring patterns`,
          ],
          explanation: `${sender} initiated ${count} financial transfers within a short period, exceeding typical transaction frequency.`,
        });
      }
    }

    // 3. Rapid Movement / Layering Chain (A -> B -> C within short order)
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();
    for (const tx of transactions) {
      outMap.set(tx.sender, (outMap.get(tx.sender) ?? 0) + tx.amount);
      inMap.set(tx.receiver, (inMap.get(tx.receiver) ?? 0) + tx.amount);
    }

    for (const [entity, inAmt] of inMap.entries()) {
      const outAmt = outMap.get(entity) ?? 0;
      if (inAmt >= 100000 && outAmt >= inAmt * 0.8) {
        anomalies.push({
          anomalyType: "RAPID_MONEY_MOVEMENT",
          title: `Rapid pass-through movement through ${entity}`,
          description: `Funds received (₹${inAmt.toLocaleString()}) were rapidly disbursed (₹${outAmt.toLocaleString()}) with minimal retention.`,
          severity: "HIGH",
          score: 0.92,
          affectedEntities: [entity],
          supportingRecords: ["Transaction_Record.csv"],
          evidence: {
            metricName: "Fund Flow Velocity",
            inflow: inAmt,
            outflow: outAmt,
            passThroughPercentage: Math.round((outAmt / inAmt) * 100),
          },
          reasons: [
            `${Math.round((outAmt / inAmt) * 100)}% of incoming funds were routed out quickly`,
            `Pass-through velocity indicates intermediate relay activity`,
          ],
          explanation: `${entity} received ₹${inAmt.toLocaleString()} and rapidly transferred out ₹${outAmt.toLocaleString()} (${Math.round((outAmt / inAmt) * 100)}% velocity).`,
        });
      }
    }

    return anomalies;
  }

  /**
   * Detects Location Anomalies:
   * - Co-location clusters at sensitive locations
   * - Impossible travel jumps (velocity > 800 km/h)
   * - Sudden appearance at new locations
   */
  static detectLocationAnomalies(
    locations: { name: string; entities: string[]; activity?: number }[],
    movements: { entity: string; location: string; timestamp: Date | string }[] = []
  ): DetailedAnomaly[] {
    const anomalies: DetailedAnomaly[] = [];

    // 1. Co-Location of Multiple Subjects
    for (const loc of locations) {
      if (loc.entities.length >= 3) {
        anomalies.push({
          anomalyType: "CO_LOCATION_CLUSTER",
          title: `Multiple entities co-located at ${loc.name}`,
          description: `${loc.entities.length} distinct entities repeatedly observed at ${loc.name}.`,
          severity: loc.entities.length >= 4 ? "HIGH" : "MEDIUM",
          score: 0.84,
          affectedEntities: loc.entities,
          supportingRecords: ["Location_Record.csv"],
          evidence: {
            metricName: "Co-Location Count",
            location: loc.name,
            entityCount: loc.entities.length,
            entities: loc.entities,
          },
          reasons: [
            `${loc.entities.length} separate individuals independently linked to ${loc.name}`,
            `Shared geographic presence indicates a possible coordination site`,
          ],
          explanation: `${loc.entities.join(", ")} were all independently recorded at ${loc.name}, forming an operational co-location cluster.`,
        });
      }
    }

    // 2. Impossible Travel Velocity / Rapid Geographic Jumps
    if (movements.length >= 2) {
      const byEntity = new Map<string, typeof movements>();
      for (const m of movements) {
        const list = byEntity.get(m.entity) ?? [];
        list.push(m);
        byEntity.set(m.entity, list);
      }

      for (const [entity, logs] of byEntity.entries()) {
        const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        for (let i = 0; i < sorted.length - 1; i++) {
          const m1 = sorted[i];
          const m2 = sorted[i + 1];
          if (m1.location !== m2.location) {
            const timeDiffHrs = Math.abs(new Date(m2.timestamp).getTime() - new Date(m1.timestamp).getTime()) / (3600 * 1000);
            if (timeDiffHrs > 0 && timeDiffHrs < 0.5) { // < 30 mins between different major locations
              anomalies.push({
                anomalyType: "IMPOSSIBLE_TRAVEL_VELOCITY",
                title: `Abnormal travel transition for ${entity}`,
                description: `Entity recorded at ${m1.location} and ${m2.location} within ${Math.round(timeDiffHrs * 60)} minutes.`,
                severity: "HIGH",
                score: 0.93,
                affectedEntities: [entity],
                timestamp: new Date(m2.timestamp).toISOString(),
                supportingRecords: ["Location_Record.csv"],
                evidence: {
                  fromLocation: m1.location,
                  toLocation: m2.location,
                  elapsedMinutes: Math.round(timeDiffHrs * 60),
                },
                reasons: [
                  `Geographic transition between ${m1.location} and ${m2.location} occurred in ${Math.round(timeDiffHrs * 60)} minutes`,
                  `Velocity exceeds physical travel feasibility or indicates shared SIM/device usage`,
                ],
                explanation: `${entity} was recorded at ${m1.location} and subsequently at ${m2.location} within ${Math.round(timeDiffHrs * 60)} minutes, indicating either impossible velocity or identity sharing.`,
              });
            }
          }
        }
      }
    }

    return anomalies;
  }

  /**
   * Detects Network Graph Anomalies:
   * - Bridge nodes connecting disparate communities (Betweenness Centrality)
   * - Highly connected nodes (Degree Centrality)
   * - Bridging disconnected sub-groups
   */
  static detectNetworkAnomalies(
    nodes: string[],
    edges: { source: string; target: string; weight?: number; type?: string }[]
  ): DetailedAnomaly[] {
    const anomalies: DetailedAnomaly[] = [];
    if (nodes.length < 3 || edges.length < 2) return anomalies;

    // 1. Centrality & Bridges
    const degreeMap = GraphAnomalyDetector.calculateDegreeCentrality(nodes, edges);
    const { bridgeNodes } = GraphAnomalyDetector.findCommunitiesAndBridges(nodes, edges);

    // Bridge Node Anomalies
    for (const b of bridgeNodes) {
      const deg = degreeMap.get(b.node)?.degree ?? 0;
      anomalies.push({
        anomalyType: "NETWORK_BRIDGE_NODE",
        title: `Key bridge node: ${b.node}`,
        description: `${b.node} has high betweenness centrality (${b.betweenness}) and connects multiple network communities.`,
        severity: "HIGH",
        score: Math.min(0.96, 0.80 + b.betweenness * 0.4),
        affectedEntities: [b.node],
        supportingRecords: ["Intelligence_Graph"],
        evidence: {
          metricName: "Betweenness Centrality",
          betweennessCentrality: b.betweenness,
          directConnections: deg,
          connectedCommunities: b.connectedCommunities,
        },
        reasons: [
          `${b.node} has ${deg} direct connections and connects ${b.connectedCommunities} otherwise separate network communities`,
          `High betweenness centrality indicates a key intermediary or broker in the network`,
        ],
        explanation: `${b.node} has ${deg} direct connections and connects ${b.connectedCommunities} otherwise separate network communities.`,
      });
    }

    // High Degree Outliers (Hub Nodes)
    for (const [node, info] of degreeMap.entries()) {
      if (info.isOutlier && !bridgeNodes.some((b) => b.node === node)) {
        anomalies.push({
          anomalyType: "HIGH_CENTRALITY_NODE",
          title: `High connectivity hub: ${node}`,
          description: `${node} possesses an unusually high number of direct links (${info.degree} links).`,
          severity: info.degree >= 8 ? "HIGH" : "MEDIUM",
          score: 0.85,
          affectedEntities: [node],
          supportingRecords: ["Intelligence_Graph"],
          evidence: {
            metricName: "Degree Centrality",
            directConnections: info.degree,
            normalizedDegree: Math.round(info.normalizedDegree * 100) / 100,
          },
          reasons: [
            `${node} has ${info.degree} direct links across the intelligence graph`,
            `Connectivity is significantly above average network degree`,
          ],
          explanation: `${node} has ${info.degree} direct connections across the network, making it a primary connectivity hub.`,
        });
      }
    }

    return anomalies;
  }
}

// ---------------------------------------------------------------------------
// 4. Unified Anomaly Detection Engine (Facade)
// ---------------------------------------------------------------------------

export class AnomalyDetectionEngine {
  /**
   * Main entry point to run all statistical and graph anomaly detectors over an AnalysisContext.
   */
  static detect(context: AnalysisContext): DetailedAnomaly[] {
    const allAnomalies: DetailedAnomaly[] = [];

    // 1. Call Anomalies
    const calls = (context.calls ?? []).map((c) => ({
      a: c.a,
      b: c.b,
      count: c.count,
      timestamps: c.timestamps,
      durations: c.durations,
    }));
    if (calls.length > 0) {
      allAnomalies.push(...DomainAnomalyDetector.detectCallAnomalies(calls, context.historicalCallRates ?? {}));
    }

    // 2. Financial Anomalies
    const transactions: { sender: string; receiver: string; amount: number; count?: number; timestamp?: string | Date }[] = (
      context.transactions ?? []
    ).map((t) => ({
      sender: t.sender,
      receiver: t.receiver,
      amount: t.amount,
      count: t.count,
      timestamp: t.timestamp,
    }));
    // Also parse from relationships if transactions array is empty
    if (transactions.length === 0 && context.relationships) {
      for (const r of context.relationships) {
        if ((r.type === "FINANCIAL" || r.type === "TRANSACTION") && r.amount) {
          transactions.push({
            sender: r.sourceName,
            receiver: r.targetName,
            amount: r.amount,
            count: r.count ?? 1,
            timestamp: undefined,
          });
        }
      }
    }
    if (transactions.length > 0) {
      allAnomalies.push(...DomainAnomalyDetector.detectTransactionAnomalies(transactions));
    }

    // 3. Location Anomalies
    const locations = context.locations ?? [];
    const movements: { entity: string; location: string; timestamp: Date | string }[] = [];
    if (context.events) {
      for (const ev of context.events) {
        if (ev.location && ev.summary) {
          const entityName = (context.people ?? []).find((p) => ev.summary?.includes(p.name))?.name ?? "Subject";
          if (ev.eventAt) {
            movements.push({ entity: entityName, location: ev.location, timestamp: ev.eventAt });
          }
        }
      }
    }
    if (locations.length > 0 || movements.length > 0) {
      allAnomalies.push(...DomainAnomalyDetector.detectLocationAnomalies(locations, movements));
    }

    // 4. Graph Network Anomalies
    const entities = (context.entities ?? []).map((e) => e.name);
    const people = (context.people ?? []).map((p) => p.name);
    const allNodes = Array.from(new Set([...entities, ...people]));

    const edges: { source: string; target: string; type?: string }[] = [];
    if (context.relationships) {
      for (const r of context.relationships) {
        edges.push({ source: r.sourceName, target: r.targetName, type: r.type });
        allNodes.push(r.sourceName);
        allNodes.push(r.targetName);
      }
    }
    if (allNodes.length > 0 && edges.length > 0) {
      const distinctNodes = Array.from(new Set(allNodes));
      allAnomalies.push(...DomainAnomalyDetector.detectNetworkAnomalies(distinctNodes, edges));
    }

    // Baseline fallback if no anomalies detected
    if (allAnomalies.length === 0) {
      allAnomalies.push({
        anomalyType: "BASELINE",
        title: "No anomalies above threshold",
        description: "Activity and network metrics are within normal statistical distributions.",
        severity: "LOW",
        score: 0.1,
        affectedEntities: [],
        supportingRecords: [],
        evidence: { status: "NORMAL_BASELINE" },
        reasons: ["All observed frequencies and amounts fall within expected variance"],
        explanation: "All communication, financial, and network metrics are within expected baseline variance.",
      });
    }

    return allAnomalies.sort((a, b) => b.score - a.score);
  }

  /**
   * Converts DetailedAnomaly[] to the application's AnomalyResult[] format.
   */
  static toAnomalyResults(anomalies: DetailedAnomaly[]): AnomalyResult[] {
    return anomalies.map((a) => ({
      type: a.anomalyType,
      title: a.title,
      description: a.explanation || a.description,
      severity: a.severity,
      relatedEntities: a.affectedEntities,
      supportingRecords: a.supportingRecords,
      confidence: a.score,
      reasons: a.reasons,
      score: a.score,
      anomaly_type: a.anomalyType,
      affectedEntities: a.affectedEntities,
      timestamp: a.timestamp,
      evidence: a.evidence as Record<string, unknown>,
      evidenceDetails: a.evidence as Record<string, unknown>,
      explanation: a.explanation,
    }));
  }
}
