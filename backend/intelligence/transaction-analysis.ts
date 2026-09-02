// CrimeIntel — Transaction Analysis Module
// ============================================================
// Performs in-depth financial transaction analysis:
// - Outlier amount detection (Z-Score, IQR, historical entity baselines).
// - Transaction frequency & velocity surge detection.
// - New counterparty relationship discovery.
// - Sudden behavioral shift detection (structuring, fan-out/fan-in).
// - Financial flow chains and network metrics.
//
// Conforms to SIH26189 specification:
// - Non-judgmental investigative decision-support system.
// - Handles missing/null values, zero std dev, and empty datasets gracefully.
// ============================================================

export interface TransactionRecord {
  sender?: string;
  source?: string;
  debitedParty?: string;
  from?: string;
  payer?: string;
  sourceAccount?: string;
  receiver?: string;
  beneficiary?: string;
  creditedParty?: string;
  to?: string;
  payee?: string;
  targetAccount?: string;
  amount?: number | string;
  currency?: string;
  timestamp?: string | Date;
  date?: string | Date;
  time?: string | Date;
  transactionId?: string;
  txId?: string;
  channel?: string;
  paymentMode?: string;
  [key: string]: unknown;
}

export interface NormalizedTransaction {
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  timestamp?: Date;
  transactionId?: string;
  channel?: string;
  rawRecord?: unknown;
}

export interface TransactionAnomaly {
  type: string;
  account: string;
  counterparty?: string;
  amount?: number;
  currency?: string;
  timestamp?: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  reason: string;
  evidence?: {
    observedAmount?: number;
    baselineMean?: number;
    baselineMedian?: number;
    baselineStd?: number;
    zScore?: number;
    upperIqrBound?: number;
    observedCount?: number;
    timeWindow?: string;
    [key: string]: unknown;
  };
}

export interface NewTransactionRelationship {
  entity: string;
  counterparty: string;
  direction: "outgoing" | "incoming";
  first_transaction?: string;
  latest_transaction?: string;
  transaction_count: number;
  total_amount: number;
  currency: string;
}

export interface AccountTransactionSummary {
  account: string;
  analysis_period: {
    start?: string;
    end?: string;
  };
  total_transactions: number;
  total_incoming: number;
  total_outgoing: number;
  net_flow: number;
  average_transaction: number;
  median_transaction: number;
  incoming_count: number;
  outgoing_count: number;
  currency: string;
  new_relationships: NewTransactionRelationship[];
  anomalies: TransactionAnomaly[];
  network_metrics: {
    in_degree: number;
    out_degree: number;
    unique_counterparties: number;
  };
}

export interface TransactionChain {
  path: string[];
  total_amount: number;
  transaction_count: number;
  currency: string;
}

export interface TransactionAnalysisResult {
  overall_summary: {
    total_records: number;
    total_volume: number;
    unique_accounts: number;
    currency: string;
    date_range?: { start: string; end: string };
    total_anomalies: number;
  };
  accounts: AccountTransactionSummary[];
  anomalies: TransactionAnomaly[];
  new_relationships: NewTransactionRelationship[];
  chains: TransactionChain[];
}

// ---------------------------------------------------------------------------
// 1. Transaction Record Normalizer
// ---------------------------------------------------------------------------

export class TransactionRecordNormalizer {
  static normalize(records: unknown[]): NormalizedTransaction[] {
    if (!Array.isArray(records) || records.length === 0) return [];

    const normalized: NormalizedTransaction[] = [];

    for (const raw of records) {
      if (typeof raw !== "object" || raw === null) continue;

      const r = raw as Record<string, unknown>;

      const senderRaw = r.sender ?? r.source ?? r.debitedParty ?? r.debited_party ?? r.from ?? r.payer ?? r.sourceAccount ?? r.source_account;
      const receiverRaw = r.receiver ?? r.beneficiary ?? r.creditedParty ?? r.credited_party ?? r.to ?? r.payee ?? r.targetAccount ?? r.target_account;

      const sender = String(senderRaw ?? "").trim();
      const receiver = String(receiverRaw ?? "").trim();

      if (!sender || !receiver || sender.toLowerCase() === receiver.toLowerCase()) {
        continue;
      }

      // Amount parsing
      let amount = 0;
      const amtVal = r.amount ?? r.tx_amount ?? r.transfer_amount ?? r.value ?? r.sum;
      if (typeof amtVal === "number") {
        amount = amtVal;
      } else if (typeof amtVal === "string") {
        const clean = amtVal.replace(/[^0-9.]/g, "");
        amount = parseFloat(clean) || 0;
      }

      if (amount <= 0 || isNaN(amount)) {
        continue;
      }

      // Date parsing
      let parsedDate: Date | undefined;
      const dateVal = r.timestamp ?? r.date ?? r.tx_date ?? r.time ?? r.date_time;
      if (dateVal) {
        const d = new Date(String(dateVal));
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      const currency = String(r.currency ?? (String(amtVal).includes("$") ? "USD" : "INR")).toUpperCase();
      const txId = r.transactionId ?? r.transaction_id ?? r.txId ?? r.tx_id ?? r.reference_no ?? r.utr;
      const channel = r.channel ?? r.paymentMode ?? r.payment_mode ?? (amount >= 200000 ? "RTGS" : "UPI");

      normalized.push({
        sender,
        receiver,
        amount,
        currency,
        timestamp: parsedDate,
        transactionId: txId ? String(txId) : undefined,
        channel: channel ? String(channel) : undefined,
        rawRecord: raw,
      });
    }

    return normalized;
  }
}

// ---------------------------------------------------------------------------
// 2. Statistical Amount & Frequency Analyzers
// ---------------------------------------------------------------------------

export class TransactionAmountAnalyzer {
  /**
   * Evaluates individual transaction amounts against historical distribution.
   */
  static analyzeAccountAmounts(
    account: string,
    transactions: NormalizedTransaction[]
  ): TransactionAnomaly[] {
    const relevant = transactions.filter(
      (t) => t.sender.toLowerCase() === account.toLowerCase() || t.receiver.toLowerCase() === account.toLowerCase()
    );

    if (relevant.length < 2) return [];

    const anomalies: TransactionAnomaly[] = [];
    const amounts = relevant.map((t) => t.amount);
    const n = amounts.length;

    // 1. Mean & Standard Deviation
    const mean = amounts.reduce((s, v) => s + v, 0) / n;
    const variance = amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    // 2. Quartiles & IQR
    const sorted = [...amounts].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const upperIqrExtreme = q3 + 3.0 * iqr;

    for (const t of relevant) {
      const zScore = std > 0 ? (t.amount - mean) / std : 0;
      const multiplier = median > 0 ? t.amount / median : (mean > 0 ? t.amount / mean : 1);

      // Flag if: Z-Score >= 2.5 or amount exceeds extreme IQR threshold or multiplier >= 10x median
      const isExtreme = (zScore >= 2.5 && t.amount >= 50000) || (iqr > 0 && t.amount > upperIqrExtreme && t.amount >= 50000) || (multiplier >= 10 && t.amount >= 100000);

      if (isExtreme) {
        const score = Math.min(0.99, 0.75 + Math.min(0.24, Math.max(zScore / 5, multiplier / 25)));
        const otherParty = t.sender.toLowerCase() === account.toLowerCase() ? t.receiver : t.sender;
        const dirStr = t.sender.toLowerCase() === account.toLowerCase() ? `outgoing to ${t.receiver}` : `incoming from ${t.sender}`;

        anomalies.push({
          type: "unusual_amount",
          account,
          counterparty: otherParty,
          amount: t.amount,
          currency: t.currency,
          timestamp: t.timestamp?.toISOString(),
          severity: t.amount >= 500000 || zScore >= 3.5 ? "high" : "medium",
          score: parseFloat(score.toFixed(2)),
          reason: `Unusual transaction amount detected: ${t.currency} ${t.amount.toLocaleString()} (${dirStr}) compared with historical median of ${t.currency} ${median.toLocaleString()} (Z-score: ${zScore.toFixed(2)}, ${multiplier.toFixed(1)}x baseline).`,
          evidence: {
            observedAmount: t.amount,
            baselineMean: parseFloat(mean.toFixed(2)),
            baselineMedian: median,
            baselineStd: parseFloat(std.toFixed(2)),
            zScore: parseFloat(zScore.toFixed(2)),
            upperIqrBound: upperIqrExtreme,
            timeWindow: t.timestamp?.toISOString(),
          },
        });
      }
    }

    return anomalies;
  }
}

// ---------------------------------------------------------------------------
// 3. Transaction Frequency & Behavior Shifts
// ---------------------------------------------------------------------------

export class TransactionFrequencyAnalyzer {
  /**
   * Detects sudden surges in transaction frequency and velocity shifts.
   */
  static analyzeFrequency(
    account: string,
    transactions: NormalizedTransaction[],
    baselineTxsPerPeriod?: number
  ): TransactionAnomaly[] {
    const relevant = transactions.filter(
      (t) => t.sender.toLowerCase() === account.toLowerCase() || t.receiver.toLowerCase() === account.toLowerCase()
    );

    if (relevant.length === 0) return [];

    const anomalies: TransactionAnomaly[] = [];

    // Group by Day (YYYY-MM-DD)
    const dailyMap = new Map<string, { count: number; totalAmt: number }>();
    let noDateCount = 0;
    let noDateAmt = 0;

    for (const t of relevant) {
      if (t.timestamp) {
        const dayKey = t.timestamp.toISOString().split("T")[0];
        const existing = dailyMap.get(dayKey) ?? { count: 0, totalAmt: 0 };
        existing.count++;
        existing.totalAmt += t.amount;
        dailyMap.set(dayKey, existing);
      } else {
        noDateCount++;
        noDateAmt += t.amount;
      }
    }

    const days = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // 1. Time-Series Daily Comparison
    if (days.length >= 2) {
      const counts = days.map((d) => d[1].count);
      const mean = counts.reduce((s, v) => s + v, 0) / counts.length;
      const variance = counts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / counts.length;
      const std = Math.sqrt(variance);

      for (const [dayStr, stat] of days) {
        const zScore = std > 0 ? (stat.count - mean) / std : (stat.count > mean ? (stat.count - mean) / Math.max(1, mean) : 0);
        const multiplier = mean > 0 ? stat.count / mean : stat.count;

        if (stat.count >= 6 && (zScore >= 2.5 || multiplier >= 4.0)) {
          const score = Math.min(0.98, 0.70 + Math.min(0.25, stat.count / 30));
          anomalies.push({
            type: "transaction_frequency_anomaly",
            account,
            timestamp: dayStr,
            severity: stat.count >= 20 || zScore >= 3.5 ? "high" : "medium",
            score: parseFloat(score.toFixed(2)),
            reason: `Unusual transaction frequency detected: ${stat.count} transactions on ${dayStr} compared with average of ${mean.toFixed(1)} transactions/day.`,
            evidence: {
              observedCount: stat.count,
              baselineMean: parseFloat(mean.toFixed(2)),
              baselineStd: parseFloat(std.toFixed(2)),
              zScore: parseFloat(zScore.toFixed(2)),
              timeWindow: dayStr,
            },
          });
        }
      }
    }

    // 2. Baseline comparison (e.g. 2 txs/week -> 35 txs/day surge)
    if (baselineTxsPerPeriod !== undefined && baselineTxsPerPeriod > 0) {
      const maxDaily = days.length > 0 ? Math.max(...days.map((d) => d[1].count)) : noDateCount;
      const dailyBaseline = baselineTxsPerPeriod / 7;
      const multiplier = dailyBaseline > 0 ? maxDaily / dailyBaseline : maxDaily;

      if (maxDaily >= 6 && multiplier >= 4.0) {
        anomalies.push({
          type: "transaction_frequency_anomaly",
          account,
          severity: maxDaily >= 25 || multiplier >= 10 ? "high" : "medium",
          score: Math.min(0.98, 0.72 + Math.min(0.24, multiplier / 30)),
          reason: `Unusual transaction frequency detected: ${maxDaily} transactions/day significantly exceeded the baseline of ${baselineTxsPerPeriod} transactions/week (${multiplier.toFixed(1)}x surge).`,
          evidence: {
            observedCount: maxDaily,
            baselineMean: parseFloat(dailyBaseline.toFixed(2)),
            multiplier: parseFloat(multiplier.toFixed(2)),
          },
        });
      }
    }

    // 3. Structuring / Rapid Micro-bursts detection (e.g. 5+ transfers under threshold in 1 day)
    for (const [dayStr, stat] of days) {
      if (stat.count >= 5 && stat.totalAmt >= 100000 && stat.totalAmt / stat.count < 50000) {
        if (!anomalies.some((a) => a.type === "structuring_pattern" && a.timestamp === dayStr)) {
          anomalies.push({
            type: "structuring_pattern",
            account,
            timestamp: dayStr,
            severity: "high",
            score: 0.88,
            reason: `Potential structuring pattern detected: ${stat.count} split transactions totaling ${relevant[0]?.currency ?? "INR"} ${stat.totalAmt.toLocaleString()} on ${dayStr}.`,
            evidence: {
              observedCount: stat.count,
              observedAmount: stat.totalAmt,
              timeWindow: dayStr,
            },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Identifies newly appeared transaction relationships compared to historical set.
   */
  static detectNewRelationships(
    transactions: NormalizedTransaction[],
    knownHistoricalPairs: Set<string>
  ): NewTransactionRelationship[] {
    const newRels: NewTransactionRelationship[] = [];
    const pairMap = new Map<
      string,
      { sender: string; receiver: string; count: number; totalAmt: number; currency: string; first?: Date; last?: Date }
    >();

    for (const t of transactions) {
      const pairKey = `${t.sender.toLowerCase()}→${t.receiver.toLowerCase()}`;
      if (!knownHistoricalPairs.has(pairKey)) {
        const existing = pairMap.get(pairKey) ?? {
          sender: t.sender,
          receiver: t.receiver,
          count: 0,
          totalAmt: 0,
          currency: t.currency,
        };
        existing.count++;
        existing.totalAmt += t.amount;
        if (t.timestamp) {
          if (!existing.first || t.timestamp < existing.first) existing.first = t.timestamp;
          if (!existing.last || t.timestamp > existing.last) existing.last = t.timestamp;
        }
        pairMap.set(pairKey, existing);
      }
    }

    for (const [_, info] of pairMap.entries()) {
      newRels.push({
        entity: info.sender,
        counterparty: info.receiver,
        direction: "outgoing",
        first_transaction: info.first?.toISOString(),
        latest_transaction: info.last?.toISOString(),
        transaction_count: info.count,
        total_amount: info.totalAmt,
        currency: info.currency,
      });
    }

    return newRels;
  }
}

// ---------------------------------------------------------------------------
// 4. Transaction Network & Flow Chains
// ---------------------------------------------------------------------------

export class TransactionNetworkAnalyzer {
  /**
   * Discovers financial transfer chains (e.g. A -> B -> C).
   */
  static findTransactionChains(transactions: NormalizedTransaction[]): TransactionChain[] {
    const adj = new Map<string, Set<string>>();
    const edgeAmounts = new Map<string, { totalAmt: number; count: number; currency: string }>();

    for (const t of transactions) {
      const s = t.sender;
      const r = t.receiver;
      const neighbors = adj.get(s) ?? new Set<string>();
      neighbors.add(r);
      adj.set(s, neighbors);

      const edgeKey = `${s}→${r}`;
      const existing = edgeAmounts.get(edgeKey) ?? { totalAmt: 0, count: 0, currency: t.currency };
      existing.totalAmt += t.amount;
      existing.count++;
      edgeAmounts.set(edgeKey, existing);
    }

    const chains: TransactionChain[] = [];

    // Find 2-hop chains: A -> B -> C
    for (const [nodeA, targetsB] of adj.entries()) {
      for (const nodeB of targetsB) {
        if (nodeB === nodeA) continue;
        const targetsC = adj.get(nodeB);
        if (targetsC) {
          for (const nodeC of targetsC) {
            if (nodeC === nodeA || nodeC === nodeB) continue;

            const edge1 = edgeAmounts.get(`${nodeA}→${nodeB}`);
            const edge2 = edgeAmounts.get(`${nodeB}→${nodeC}`);

            if (edge1 && edge2) {
              chains.push({
                path: [nodeA, nodeB, nodeC],
                total_amount: edge1.totalAmt + edge2.totalAmt,
                transaction_count: edge1.count + edge2.count,
                currency: edge1.currency,
              });
            }
          }
        }
      }
    }

    return chains.slice(0, 10);
  }
}

// ---------------------------------------------------------------------------
// 5. Unified Transaction Analysis Engine (Facade)
// ---------------------------------------------------------------------------

export class TransactionAnalysisEngine {
  /**
   * Analyzes financial transaction records and returns account summaries,
   * amount & frequency anomalies, new counterparties, and flow chains.
   */
  static analyze(
    rawRecords: unknown[],
    options: {
      historicalKnownPairs?: string[];
      baselineRatesPerPeriod?: Record<string, number>;
    } = {}
  ): TransactionAnalysisResult {
    const transactions = TransactionRecordNormalizer.normalize(rawRecords);

    if (transactions.length === 0) {
      return {
        overall_summary: {
          total_records: 0,
          total_volume: 0,
          unique_accounts: 0,
          currency: "INR",
          total_anomalies: 0,
        },
        accounts: [],
        anomalies: [],
        new_relationships: [],
        chains: [],
      };
    }

    const accountSet = new Set<string>();
    let totalVolume = 0;
    const defaultCurrency = transactions[0]?.currency ?? "INR";

    for (const t of transactions) {
      accountSet.add(t.sender);
      accountSet.add(t.receiver);
      totalVolume += t.amount;
    }

    const allAccounts = Array.from(accountSet);
    const historicalSet = new Set<string>((options.historicalKnownPairs ?? []).map((p) => p.toLowerCase()));

    // Discover new relationships
    const newRelationships = historicalSet.size > 0
      ? TransactionFrequencyAnalyzer.detectNewRelationships(transactions, historicalSet)
      : [];

    // Discover flow chains
    const chains = TransactionNetworkAnalyzer.findTransactionChains(transactions);

    const allAnomalies: TransactionAnomaly[] = [];
    const accountSummaries: AccountTransactionSummary[] = [];

    for (const account of allAccounts) {
      const sentTxs = transactions.filter((t) => t.sender.toLowerCase() === account.toLowerCase());
      const receivedTxs = transactions.filter((t) => t.receiver.toLowerCase() === account.toLowerCase());
      const relevantTxs = [...sentTxs, ...receivedTxs];

      const incomingTotal = receivedTxs.reduce((s, t) => s + t.amount, 0);
      const outgoingTotal = sentTxs.reduce((s, t) => s + t.amount, 0);
      const totalTxs = relevantTxs.length;

      const amounts = relevantTxs.map((t) => t.amount).sort((a, b) => a - b);
      const avgAmt = totalTxs > 0 ? Math.round((incomingTotal + outgoingTotal) / totalTxs) : 0;
      const medianAmt = totalTxs > 0 ? amounts[Math.floor(totalTxs * 0.5)] : 0;

      // Dates
      const timestamps = relevantTxs.map((t) => t.timestamp).filter((t): t is Date => !!t).sort((a, b) => a.getTime() - b.getTime());
      const startDate = timestamps[0]?.toISOString();
      const endDate = timestamps[timestamps.length - 1]?.toISOString();

      // Amount & Frequency anomalies
      const amountAnomalies = TransactionAmountAnalyzer.analyzeAccountAmounts(account, transactions);
      const baseline = options.baselineRatesPerPeriod?.[account];
      const freqAnomalies = TransactionFrequencyAnalyzer.analyzeFrequency(account, transactions, baseline);

      // Account's new relationships
      const accNewRels = newRelationships.filter((r) => r.entity.toLowerCase() === account.toLowerCase());

      // If new relationships found, add as anomalies
      for (const nr of accNewRels) {
        allAnomalies.push({
          type: "new_transaction_relationship",
          account: nr.entity,
          counterparty: nr.counterparty,
          amount: nr.total_amount,
          currency: nr.currency,
          timestamp: nr.first_transaction,
          severity: nr.total_amount >= 100000 ? "high" : "medium",
          score: Math.min(0.90, 0.60 + Math.min(0.30, nr.total_amount / 200000)),
          reason: `New transaction relationship detected: ${nr.entity} transferred ${nr.currency} ${nr.total_amount.toLocaleString()} to ${nr.counterparty} with no prior financial history.`,
          evidence: {
            observedAmount: nr.total_amount,
            observedCount: nr.transaction_count,
            timeWindow: nr.first_transaction,
          },
        });
      }

      const accAnomalies = [...amountAnomalies, ...freqAnomalies];
      allAnomalies.push(...accAnomalies);

      // Unique counterparties
      const counterparties = new Set<string>();
      for (const t of sentTxs) counterparties.add(t.receiver);
      for (const t of receivedTxs) counterparties.add(t.sender);

      accountSummaries.push({
        account,
        analysis_period: {
          start: startDate,
          end: endDate,
        },
        total_transactions: totalTxs,
        total_incoming: incomingTotal,
        total_outgoing: outgoingTotal,
        net_flow: incomingTotal - outgoingTotal,
        average_transaction: avgAmt,
        median_transaction: medianAmt,
        incoming_count: receivedTxs.length,
        outgoing_count: sentTxs.length,
        currency: defaultCurrency,
        new_relationships: accNewRels,
        anomalies: accAnomalies,
        network_metrics: {
          in_degree: receivedTxs.length,
          out_degree: sentTxs.length,
          unique_counterparties: counterparties.size,
        },
      });
    }

    // Deduplicate allAnomalies by account + type + timestamp/amount
    const dedupedAnomalies: TransactionAnomaly[] = [];
    const seen = new Set<string>();
    for (const a of allAnomalies) {
      const key = `${a.account}:${a.type}:${a.amount ?? 0}:${a.timestamp ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedupedAnomalies.push(a);
      }
    }

    const allDates = transactions.map((t) => t.timestamp).filter((t): t is Date => !!t).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = allDates.length > 0
      ? { start: allDates[0].toISOString(), end: allDates[allDates.length - 1].toISOString() }
      : undefined;

    return {
      overall_summary: {
        total_records: transactions.length,
        total_volume: totalVolume,
        unique_accounts: allAccounts.length,
        currency: defaultCurrency,
        date_range: dateRange,
        total_anomalies: dedupedAnomalies.length,
      },
      accounts: accountSummaries.sort((a, b) => (b.total_incoming + b.total_outgoing) - (a.total_incoming + a.total_outgoing)),
      anomalies: dedupedAnomalies,
      new_relationships: newRelationships,
      chains,
    };
  }
}
