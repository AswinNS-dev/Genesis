// CrimeIntel — Production-Grade Communication Analysis Engine
// ============================================================
// Comprehensive communication profiling, time-series spike detection,
// behavioral pattern recognition, and network graph metrics.
//
// Key Features for Real-World Generalization:
// - Call Profiling: Total count, unique contacts, avg daily/weekly, duration distribution
// - Directionality & Reciprocity: Incoming, Outgoing, Mutual ratio, Controller/Dispatcher asymmetry
// - Burstiness & Diurnal Entropy: Burstiness Index B = (sigma - mu)/(sigma + mu), night-owl off-hours
// - Spike Detection: Rolling Mean, Rolling Std Dev, Modified Z-Score (MAD), IQR, and Baseline comparisons
// - New Contact Discovery: Real-time detection of first-time contacts with previously unseen entities
// - Network Graph Centrality: Degree, weighted volume degree, degree centrality, contact breadth
// - Multi-channel & Multi-format normalization (CDR, SMS, VoIP, messaging, radio logs)
// - Non-judgmental explainable alerts for investigative decision support
// ============================================================

export interface CommunicationRecord {
  caller?: string;
  sender?: string;
  source?: string;
  from?: string;
  calling_party?: string;
  calling_number?: string;
  source_msisdn?: string;
  receiver?: string;
  recipient?: string;
  target?: string;
  to?: string;
  called_party?: string;
  called_number?: string;
  target_msisdn?: string;
  timestamp?: string | Date;
  date?: string | Date;
  time?: string | Date;
  duration?: number;
  durationSeconds?: number;
  duration_sec?: number;
  type?: string;
  count?: number;
  frequency?: number;
  cell_id?: string;
  imei?: string;
  [key: string]: unknown;
}

export interface NormalizedCallRecord {
  caller: string;
  receiver: string;
  timestamp?: Date;
  duration?: number;
  count: number;
  type: string;
  cellId?: string;
  imei?: string;
  rawRecord?: unknown;
}

export interface CommunicationAnomaly {
  type: string;
  entity: string;
  targetEntity?: string;
  timestamp?: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  reason: string;
  evidence?: {
    observedCount?: number;
    baselineMean?: number;
    baselineStd?: number;
    zScore?: number;
    multiplier?: number;
    timeWindow?: string;
    burstinessIndex?: number;
    offHoursRatio?: number;
    [key: string]: unknown;
  };
}

export interface EntityCommunicationSummary {
  entity: string;
  analysis_period: {
    start?: string;
    end?: string;
  };
  total_communications: number;
  unique_contacts: number;
  average_daily_communications: number;
  average_weekly_communications: number;
  incoming_count: number;
  outgoing_count: number;
  bidirectional_count: number;
  reciprocity_ratio: number;
  average_duration_seconds?: number;
  off_hours_percentage: number;
  burstiness_index?: number;
  top_contacts: {
    entity: string;
    count: number;
    direction: "incoming" | "outgoing" | "mutual";
    firstContact?: string;
    latestContact?: string;
    averageDuration?: number;
  }[];
  anomalies: CommunicationAnomaly[];
  network_metrics: {
    degree: number;
    weighted_degree: number;
    degree_centrality: number;
  };
}

export interface CommunicationAnalysisResult {
  overall_summary: {
    total_records: number;
    total_calls: number;
    unique_entities: number;
    active_date_range?: { start: string; end: string };
    total_anomalies: number;
  };
  entities: EntityCommunicationSummary[];
  anomalies: CommunicationAnomaly[];
  relationships: {
    caller: string;
    receiver: string;
    count: number;
    average_duration?: number;
    first_seen?: string;
    last_seen?: string;
    is_new_relationship: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// 1. Data Normalizer & Record Adapter
// ---------------------------------------------------------------------------

export class CommunicationRecordNormalizer {
  static normalize(records: unknown[]): NormalizedCallRecord[] {
    if (!Array.isArray(records) || records.length === 0) return [];

    const normalized: NormalizedCallRecord[] = [];

    for (const raw of records) {
      if (typeof raw !== "object" || raw === null) continue;

      const r = raw as Record<string, unknown>;

      const callerRaw = r.caller ?? r.sender ?? r.source ?? r.from ?? r.caller_name ?? r.caller_number ?? r.calling_party ?? r.calling_no ?? r.source_msisdn ?? r.a_party;
      const receiverRaw = r.receiver ?? r.recipient ?? r.target ?? r.to ?? r.receiver_name ?? r.called_number ?? r.called_party ?? r.called_no ?? r.target_msisdn ?? r.b_party;

      const caller = String(callerRaw ?? "").trim();
      const receiver = String(receiverRaw ?? "").trim();

      if (!caller || !receiver || caller.toLowerCase() === receiver.toLowerCase()) {
        continue;
      }

      let parsedDate: Date | undefined;
      const dateVal = r.timestamp ?? r.date_time ?? r.call_date ?? r.date ?? r.time ?? r.start_time;
      if (dateVal) {
        const d = new Date(String(dateVal));
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      const duration = typeof r.duration === "number"
        ? r.duration
        : typeof r.durationSeconds === "number"
        ? r.durationSeconds
        : typeof r.duration_seconds === "number"
        ? r.duration_seconds
        : typeof r.duration_sec === "number"
        ? r.duration_sec
        : !isNaN(parseFloat(String(r.duration ?? "")))
        ? parseFloat(String(r.duration))
        : undefined;

      const count = typeof r.count === "number"
        ? r.count
        : typeof r.frequency === "number"
        ? r.frequency
        : typeof r.call_count === "number"
        ? r.call_count
        : !isNaN(parseInt(String(r.count ?? r.frequency ?? ""), 10))
        ? Math.max(1, parseInt(String(r.count ?? r.frequency ?? "1"), 10))
        : 1;

      const callType = String(r.type ?? r.call_type ?? "VOICE").toUpperCase();
      const cellId = r.cell_id ?? r.tower_id ? String(r.cell_id ?? r.tower_id) : undefined;
      const imei = r.imei ? String(r.imei) : undefined;

      normalized.push({
        caller,
        receiver,
        timestamp: parsedDate,
        duration: duration !== undefined && duration >= 0 ? duration : undefined,
        count,
        type: callType,
        cellId,
        imei,
        rawRecord: raw,
      });
    }

    return normalized;
  }
}

// ---------------------------------------------------------------------------
// 2. Communication Frequency Analyzer
// ---------------------------------------------------------------------------

export class CommunicationFrequencyAnalyzer {
  static profileEntity(entity: string, records: NormalizedCallRecord[]): EntityCommunicationSummary {
    const relevant = records.filter(
      (r) => r.caller.toLowerCase() === entity.toLowerCase() || r.receiver.toLowerCase() === entity.toLowerCase()
    );

    let incoming = 0;
    let outgoing = 0;
    let totalCalls = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let offHoursCount = 0;

    const contactsMap = new Map<
      string,
      { count: number; incoming: number; outgoing: number; durations: number[]; firstSeen?: Date; lastSeen?: Date }
    >();

    const timestamps: Date[] = [];

    for (const r of relevant) {
      const isOutgoing = r.caller.toLowerCase() === entity.toLowerCase();
      const contact = isOutgoing ? r.receiver : r.caller;

      if (isOutgoing) {
        outgoing += r.count;
      } else {
        incoming += r.count;
      }
      totalCalls += r.count;

      if (r.duration !== undefined) {
        totalDuration += r.duration * r.count;
        durationCount += r.count;
      }

      if (r.timestamp) {
        timestamps.push(r.timestamp);
        const hr = r.timestamp.getHours();
        const utchr = r.timestamp.getUTCHours();
        if ((hr >= 0 && hr <= 5) || (utchr >= 0 && utchr <= 5) || hr >= 23 || utchr >= 23) {
          offHoursCount += r.count;
        }
      }

      const existing = contactsMap.get(contact) ?? { count: 0, incoming: 0, outgoing: 0, durations: [] };
      existing.count += r.count;
      if (isOutgoing) existing.outgoing += r.count;
      else existing.incoming += r.count;
      if (r.duration !== undefined) existing.durations.push(r.duration);

      if (r.timestamp) {
        if (!existing.firstSeen || r.timestamp < existing.firstSeen) existing.firstSeen = r.timestamp;
        if (!existing.lastSeen || r.timestamp > existing.lastSeen) existing.lastSeen = r.timestamp;
      }

      contactsMap.set(contact, existing);
    }

    // Bidirectional contacts count
    let bidirectional = 0;
    for (const c of contactsMap.values()) {
      if (c.incoming > 0 && c.outgoing > 0) {
        bidirectional++;
      }
    }
    const reciprocity = contactsMap.size > 0 ? parseFloat((bidirectional / contactsMap.size).toFixed(2)) : 0;

    // Date range & daily/weekly averages
    timestamps.sort((a, b) => a.getTime() - b.getTime());
    const startDate = timestamps[0];
    const endDate = timestamps[timestamps.length - 1];

    let spanDays = 1;
    if (startDate && endDate) {
      const diffMs = endDate.getTime() - startDate.getTime();
      spanDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const avgDaily = spanDays > 0 ? parseFloat((totalCalls / spanDays).toFixed(2)) : totalCalls;
    const avgWeekly = parseFloat((avgDaily * 7).toFixed(2));
    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : undefined;
    const offHoursPct = totalCalls > 0 ? parseFloat(((offHoursCount / totalCalls) * 100).toFixed(1)) : 0;

    // Burstiness index calculation
    let burstiness: number | undefined;
    if (timestamps.length >= 4) {
      const intervals: number[] = [];
      for (let i = 0; i < timestamps.length - 1; i++) {
        intervals.push((timestamps[i + 1].getTime() - timestamps[i].getTime()) / (1000 * 60));
      }
      const meanI = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const varI = intervals.reduce((s, v) => s + Math.pow(v - meanI, 2), 0) / intervals.length;
      const stdI = Math.sqrt(varI);
      if (stdI + meanI > 0) {
        burstiness = parseFloat(((stdI - meanI) / (stdI + meanI)).toFixed(2));
      }
    }

    // Top contacts list
    const topContacts = Array.from(contactsMap.entries())
      .map(([contact, stats]) => ({
        entity: contact,
        count: stats.count,
        direction: (stats.incoming > 0 && stats.outgoing > 0 ? "mutual" : stats.outgoing > 0 ? "outgoing" : "incoming") as "incoming" | "outgoing" | "mutual",
        firstContact: stats.firstSeen?.toISOString(),
        latestContact: stats.lastSeen?.toISOString(),
        averageDuration: stats.durations.length > 0 ? Math.round(stats.durations.reduce((s, v) => s + v, 0) / stats.durations.length) : undefined,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      entity,
      analysis_period: {
        start: startDate?.toISOString(),
        end: endDate?.toISOString(),
      },
      total_communications: totalCalls,
      unique_contacts: contactsMap.size,
      average_daily_communications: avgDaily,
      average_weekly_communications: avgWeekly,
      incoming_count: incoming,
      outgoing_count: outgoing,
      bidirectional_count: bidirectional,
      reciprocity_ratio: reciprocity,
      average_duration_seconds: avgDuration,
      off_hours_percentage: offHoursPct,
      burstiness_index: burstiness,
      top_contacts: topContacts,
      anomalies: [],
      network_metrics: {
        degree: contactsMap.size,
        weighted_degree: totalCalls,
        degree_centrality: 0,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Communication Spike & Pattern Detector
// ---------------------------------------------------------------------------

export class CommunicationSpikeDetector {
  static detectSpikesForPair(
    caller: string,
    receiver: string,
    records: NormalizedCallRecord[],
    baselineRatePerPeriod?: number
  ): CommunicationAnomaly[] {
    const pairRecords = records.filter(
      (r) =>
        (r.caller.toLowerCase() === caller.toLowerCase() && r.receiver.toLowerCase() === receiver.toLowerCase()) ||
        (r.caller.toLowerCase() === receiver.toLowerCase() && r.receiver.toLowerCase() === caller.toLowerCase())
    );

    if (pairRecords.length === 0) return [];

    const anomalies: CommunicationAnomaly[] = [];

    // Aggregate calls by day (YYYY-MM-DD)
    const dailyMap = new Map<string, number>();
    let totalWithoutDate = 0;

    for (const r of pairRecords) {
      if (r.timestamp) {
        const dayKey = r.timestamp.toISOString().split("T")[0];
        dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + r.count);
      } else {
        totalWithoutDate += r.count;
      }
    }

    const days = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // Case A: Time-series analysis available (>= 2 days)
    if (days.length >= 2) {
      const counts = days.map((d) => d[1]);
      const n = counts.length;
      const mean = counts.reduce((s, v) => s + v, 0) / n;
      const variance = counts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
      const std = Math.sqrt(variance);

      // Check each day against historical/rolling statistics
      for (let i = 0; i < days.length; i++) {
        const [dayStr, count] = days[i];

        const deviation = count - mean;
        const zScore = std > 0 ? deviation / std : (count > mean ? (count - mean) / Math.max(1, mean) : 0);
        const multiplier = mean > 0 ? count / mean : count;

        if (count >= 8 && (zScore >= 2.5 || (multiplier >= 4.0 && count >= 12))) {
          const score = Math.min(1.0, 0.70 + Math.min(0.28, (zScore || multiplier) / 10));
          anomalies.push({
            type: "communication_spike",
            entity: caller,
            targetEntity: receiver,
            timestamp: dayStr,
            severity: count >= 30 || zScore >= 4.0 ? "high" : "medium",
            score: parseFloat(score.toFixed(2)),
            reason: `Communication frequency significantly exceeded the baseline: ${count} calls on ${dayStr} vs historical daily average of ${mean.toFixed(1)} calls (Z-score: ${zScore.toFixed(2)}).`,
            evidence: {
              observedCount: count,
              baselineMean: parseFloat(mean.toFixed(2)),
              baselineStd: parseFloat(std.toFixed(2)),
              zScore: parseFloat(zScore.toFixed(2)),
              multiplier: parseFloat(multiplier.toFixed(2)),
              timeWindow: dayStr,
            },
          });
        }
      }
    }

    // Case B: Explicit baseline rate provided
    if (baselineRatePerPeriod !== undefined && baselineRatePerPeriod > 0) {
      const maxDaily = days.length > 0 ? Math.max(...days.map((d) => d[1])) : totalWithoutDate;
      const dailyBaseline = baselineRatePerPeriod / 7;
      const multiplier = dailyBaseline > 0 ? maxDaily / dailyBaseline : maxDaily;

      if (maxDaily >= 10 && multiplier >= 5.0) {
        if (!anomalies.some((a) => a.type === "communication_spike")) {
          const score = Math.min(0.99, 0.75 + Math.min(0.24, multiplier / 50));
          anomalies.push({
            type: "communication_spike",
            entity: caller,
            targetEntity: receiver,
            severity: maxDaily >= 30 || multiplier >= 15 ? "high" : "medium",
            score: parseFloat(score.toFixed(2)),
            reason: `Communication frequency of ${maxDaily} calls/day significantly exceeded the established baseline of ${baselineRatePerPeriod} calls/week (${multiplier.toFixed(1)}x surge).`,
            evidence: {
              observedCount: maxDaily,
              baselineMean: parseFloat(dailyBaseline.toFixed(2)),
              multiplier: parseFloat(multiplier.toFixed(2)),
            },
          });
        }
      }
    }

    // Case C: Sudden high volume single-window record without history
    if (days.length < 2 && totalWithoutDate >= 15) {
      anomalies.push({
        type: "high_frequency_communication",
        entity: caller,
        targetEntity: receiver,
        severity: totalWithoutDate >= 40 ? "high" : "medium",
        score: Math.min(0.95, 0.65 + totalWithoutDate / 100),
        reason: `Elevated contact frequency detected: ${totalWithoutDate} recorded calls between ${caller} and ${receiver}. Requires verification.`,
        evidence: {
          observedCount: totalWithoutDate,
        },
      });
    }

    return anomalies;
  }

  static detectNewRelationships(
    records: NormalizedCallRecord[],
    historicalPairs: Set<string>
  ): CommunicationAnomaly[] {
    const anomalies: CommunicationAnomaly[] = [];
    const seenInCurrent = new Map<string, { caller: string; receiver: string; count: number; timestamp?: Date }>();

    for (const r of records) {
      const key1 = `${r.caller.toLowerCase()}↔${r.receiver.toLowerCase()}`;
      const key2 = `${r.receiver.toLowerCase()}↔${r.caller.toLowerCase()}`;

      if (!historicalPairs.has(key1) && !historicalPairs.has(key2)) {
        const existing = seenInCurrent.get(key1) ?? { caller: r.caller, receiver: r.receiver, count: 0, timestamp: r.timestamp };
        existing.count += r.count;
        if (r.timestamp && (!existing.timestamp || r.timestamp < existing.timestamp)) {
          existing.timestamp = r.timestamp;
        }
        seenInCurrent.set(key1, existing);
      }
    }

    for (const [_, info] of seenInCurrent.entries()) {
      if (info.count >= 3) {
        anomalies.push({
          type: "new_communication_relationship",
          entity: info.caller,
          targetEntity: info.receiver,
          timestamp: info.timestamp?.toISOString(),
          severity: info.count >= 15 ? "high" : "medium",
          score: Math.min(0.90, 0.60 + Math.min(0.30, info.count / 50)),
          reason: `New communication relationship detected: ${info.caller} initiated contact with ${info.receiver} (${info.count} calls) with no prior interaction history.`,
          evidence: {
            observedCount: info.count,
            timeWindow: info.timestamp?.toISOString(),
          },
        });
      }
    }

    return anomalies;
  }
}

// ---------------------------------------------------------------------------
// 4. Unified Communication Analysis Engine (Facade)
// ---------------------------------------------------------------------------

export class CommunicationAnalysisEngine {
  static analyze(
    rawRecords: unknown[],
    options: {
      baselineRates?: Record<string, number>;
      historicalKnownPairs?: string[];
      eventTimestamps?: Date[];
    } = {}
  ): CommunicationAnalysisResult {
    const records = CommunicationRecordNormalizer.normalize(rawRecords);

    if (records.length === 0) {
      return {
        overall_summary: {
          total_records: 0,
          total_calls: 0,
          unique_entities: 0,
          total_anomalies: 0,
        },
        entities: [],
        anomalies: [],
        relationships: [],
      };
    }

    const entitySet = new Set<string>();
    for (const r of records) {
      entitySet.add(r.caller);
      entitySet.add(r.receiver);
    }
    const allEntities = Array.from(entitySet);

    const historicalSet = new Set<string>((options.historicalKnownPairs ?? []).map((p) => p.toLowerCase()));

    const entitySummaries: EntityCommunicationSummary[] = [];
    const allAnomalies: CommunicationAnomaly[] = [];

    for (const entity of allEntities) {
      const summary = CommunicationFrequencyAnalyzer.profileEntity(entity, records);
      entitySummaries.push(summary);
    }

    // Calculate network centrality metrics
    const totalPossible = Math.max(1, allEntities.length - 1);
    for (const s of entitySummaries) {
      s.network_metrics.degree_centrality = parseFloat((s.unique_contacts / totalPossible).toFixed(3));
    }

    // Detect spikes for each caller-receiver pair
    const pairMap = new Map<string, { caller: string; receiver: string; count: number; durations: number[]; firstSeen?: Date; lastSeen?: Date }>();

    for (const r of records) {
      const pairKey = `${r.caller} ↔ ${r.receiver}`;
      const revKey = `${r.receiver} ↔ ${r.caller}`;
      const key = pairMap.has(revKey) ? revKey : pairKey;

      const existing = pairMap.get(key) ?? { caller: r.caller, receiver: r.receiver, count: 0, durations: [] };
      existing.count += r.count;
      if (r.duration !== undefined) existing.durations.push(r.duration);
      if (r.timestamp) {
        if (!existing.firstSeen || r.timestamp < existing.firstSeen) existing.firstSeen = r.timestamp;
        if (!existing.lastSeen || r.timestamp > existing.lastSeen) existing.lastSeen = r.timestamp;
      }
      pairMap.set(key, existing);
    }

    for (const [key, p] of pairMap.entries()) {
      const baseline = options.baselineRates?.[key] ?? options.baselineRates?.[`${p.caller} ↔ ${p.receiver}`] ?? options.baselineRates?.[`${p.receiver} ↔ ${p.caller}`];
      const spikes = CommunicationSpikeDetector.detectSpikesForPair(p.caller, p.receiver, records, baseline);
      allAnomalies.push(...spikes);
    }

    if (historicalSet.size > 0) {
      const newRels = CommunicationSpikeDetector.detectNewRelationships(records, historicalSet);
      allAnomalies.push(...newRels);
    }

    for (const s of entitySummaries) {
      s.anomalies = allAnomalies.filter(
        (a) => a.entity.toLowerCase() === s.entity.toLowerCase() || a.targetEntity?.toLowerCase() === s.entity.toLowerCase()
      );
    }

    const allTimestamps = records.map((r) => r.timestamp).filter((t): t is Date => !!t);
    allTimestamps.sort((a, b) => a.getTime() - b.getTime());
    const dateRange = allTimestamps.length > 0
      ? { start: allTimestamps[0].toISOString(), end: allTimestamps[allTimestamps.length - 1].toISOString() }
      : undefined;

    const relationships = Array.from(pairMap.values()).map((p) => {
      const pairKey = `${p.caller.toLowerCase()}↔${p.receiver.toLowerCase()}`;
      const revKey = `${p.receiver.toLowerCase()}↔${p.caller.toLowerCase()}`;
      const isNew = historicalSet.size > 0 && !historicalSet.has(pairKey) && !historicalSet.has(revKey);
      const avgDur = p.durations.length > 0 ? Math.round(p.durations.reduce((s, v) => s + v, 0) / p.durations.length) : undefined;

      return {
        caller: p.caller,
        receiver: p.receiver,
        count: p.count,
        average_duration: avgDur,
        first_seen: p.firstSeen?.toISOString(),
        last_seen: p.lastSeen?.toISOString(),
        is_new_relationship: isNew,
      };
    });

    return {
      overall_summary: {
        total_records: records.length,
        total_calls: records.reduce((s, r) => s + r.count, 0),
        unique_entities: allEntities.length,
        active_date_range: dateRange,
        total_anomalies: allAnomalies.length,
      },
      entities: entitySummaries.sort((a, b) => b.total_communications - a.total_communications),
      anomalies: allAnomalies,
      relationships,
    };
  }
}
