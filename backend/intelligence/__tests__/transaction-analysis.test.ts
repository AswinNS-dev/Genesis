// Comprehensive Test Suite: Transaction Analysis Module
// ============================================================
// Tests all 10 required test cases for Transaction Analysis:
// 1. Normal transaction amounts
// 2. Unusual transaction amount (statistical outlier)
// 3. High transaction frequency
// 4. New transaction relationship
// 5. Sudden behavior change (structuring / rapid micro-bursts)
// 6. Empty dataset
// 7. Missing values / malformed records
// 8. Insufficient historical data
// 9. Zero standard deviation
// 10. Multiple accounts & financial flow chains
// ============================================================

import {
  TransactionAnalysisEngine,
  TransactionRecordNormalizer,
  TransactionAmountAnalyzer,
  TransactionFrequencyAnalyzer,
  TransactionNetworkAnalyzer,
} from "../transaction-analysis";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

function runTests() {
  console.log("\n========================================================");
  console.log("RUNNING TRANSACTION ANALYSIS TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      console.log(`[TEST ${total}] ${name}`);
      fn();
      passed++;
    } catch (e) {
      console.error(`Error in test "${name}":`, e);
    }
  }

  // -------------------------------------------------------------------------
  // Test Case 1: Normal transaction amounts
  // -------------------------------------------------------------------------
  test("1. Normal transaction amounts (baseline profiling)", () => {
    const normalRecords = [
      { sender: "Account A", receiver: "Vendor 1", amount: 5000, timestamp: "2026-08-01T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 2", amount: 7000, timestamp: "2026-08-02T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 3", amount: 6500, timestamp: "2026-08-03T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 4", amount: 8000, timestamp: "2026-08-04T10:00:00Z" },
    ];

    const result = TransactionAnalysisEngine.analyze(normalRecords);

    assert(result.overall_summary.total_records === 4, "4 records parsed");
    assert(result.overall_summary.total_volume === 26500, "Total volume is 26,500");
    assert(result.anomalies.length === 0, "No false anomalies in normal transactions");

    const accA = result.accounts.find((a) => a.account === "Account A");
    assert(!!accA, "Account A summary generated");
    assert(accA!.total_outgoing === 26500, "Account A total outgoing is 26,500");
    assert(accA!.average_transaction === 6625, "Average transaction is 6,625");
  });

  // -------------------------------------------------------------------------
  // Test Case 2: Unusual transaction amount (statistical outlier)
  // -------------------------------------------------------------------------
  test("2. Unusual transaction amount outlier (₹5k-₹8k baseline -> ₹5,00,000 sudden)", () => {
    const records = [
      { sender: "Account A", receiver: "Vendor 1", amount: 5000, timestamp: "2026-08-01T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 2", amount: 7000, timestamp: "2026-08-02T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 3", amount: 6500, timestamp: "2026-08-03T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 4", amount: 8000, timestamp: "2026-08-04T10:00:00Z" },
      { sender: "Account A", receiver: "Account X", amount: 500000, timestamp: "2026-08-05T12:00:00Z" }, // Extreme outlier
    ];

    const result = TransactionAnalysisEngine.analyze(records);
    const amountAnomaly = result.anomalies.find((a) => a.type === "unusual_amount");

    assert(!!amountAnomaly, "Detected unusual_amount anomaly");
    assert(amountAnomaly!.account === "Account A", "Account is Account A");
    assert(amountAnomaly!.amount === 500000, "Amount is 500,000");
    assert(amountAnomaly!.severity === "high", "Severity is high");
    assert(amountAnomaly!.score >= 0.90, `Anomaly score >= 0.90 (got: ${amountAnomaly!.score})`);
    assert(amountAnomaly!.reason.includes("median") && (amountAnomaly!.reason.includes("500,000") || amountAnomaly!.reason.includes("5,00,000")), "Explainable reason compares to median");
  });

  // -------------------------------------------------------------------------
  // Test Case 3: High transaction frequency
  // -------------------------------------------------------------------------
  test("3. High transaction frequency surge (e.g. 2 txs/week -> 35 txs/day)", () => {
    const highFreqRecords = Array.from({ length: 35 }, (_, i) => ({
      sender: "Account A",
      receiver: `Merchant ${i + 1}`,
      amount: 1500,
      timestamp: "2026-08-10T14:00:00Z",
    }));

    const result = TransactionAnalysisEngine.analyze(highFreqRecords, {
      baselineRatesPerPeriod: { "Account A": 2 }, // Baseline: 2 txs/week
    });

    const freqAnomaly = result.anomalies.find((a) => a.type === "transaction_frequency_anomaly");
    assert(!!freqAnomaly, "Detected transaction_frequency_anomaly");
    assert(freqAnomaly!.account === "Account A", "Account is Account A");
    assert(freqAnomaly!.score >= 0.85, "Anomaly score is elevated");
    assert(freqAnomaly!.reason.includes("baseline"), "Explainable reason references baseline");
  });

  // -------------------------------------------------------------------------
  // Test Case 4: New transaction relationship
  // -------------------------------------------------------------------------
  test("4. New transaction relationship (previously unseen counterparty)", () => {
    const historicalKnownPairs = ["account a→vendor 1", "account a→vendor 2"];
    const currentRecords = [
      { sender: "Account A", receiver: "Vendor 1", amount: 4000, timestamp: "2026-08-10T09:00:00Z" },
      { sender: "Account A", receiver: "Account D", amount: 150000, timestamp: "2026-08-10T11:00:00Z" }, // New counterparty
    ];

    const result = TransactionAnalysisEngine.analyze(currentRecords, { historicalKnownPairs });
    const newRel = result.new_relationships.find((r) => r.counterparty === "Account D");

    assert(!!newRel, "Detected new counterparty Account D in new_relationships");
    assert(newRel!.total_amount === 150000, "New relationship tracks total amount 150,000");

    const newRelAnomaly = result.anomalies.find((a) => a.type === "new_transaction_relationship");
    assert(!!newRelAnomaly, "Generated new_transaction_relationship anomaly alert");
  });

  // -------------------------------------------------------------------------
  // Test Case 5: Sudden behavior change (structuring / rapid micro-bursts)
  // -------------------------------------------------------------------------
  test("5. Sudden behavior change (structuring pattern / multiple split transfers)", () => {
    const structuringRecords = [
      { sender: "Account B", receiver: "Vendor 1", amount: 45000, timestamp: "2026-08-12T10:00:00Z" },
      { sender: "Account B", receiver: "Vendor 2", amount: 48000, timestamp: "2026-08-12T10:15:00Z" },
      { sender: "Account B", receiver: "Vendor 3", amount: 49000, timestamp: "2026-08-12T10:30:00Z" },
      { sender: "Account B", receiver: "Vendor 4", amount: 47000, timestamp: "2026-08-12T10:45:00Z" },
      { sender: "Account B", receiver: "Vendor 5", amount: 46000, timestamp: "2026-08-12T11:00:00Z" },
    ];

    const result = TransactionAnalysisEngine.analyze(structuringRecords);
    const structuring = result.anomalies.find((a) => a.type === "structuring_pattern");

    assert(!!structuring, "Detected structuring_pattern anomaly");
    assert(structuring!.account === "Account B", "Account is Account B");
    assert(structuring!.reason.includes("structuring"), "Reason indicates potential structuring pattern");
  });

  // -------------------------------------------------------------------------
  // Test Case 6: Empty dataset
  // -------------------------------------------------------------------------
  test("6. Empty dataset handling (graceful return with zero errors)", () => {
    const result = TransactionAnalysisEngine.analyze([]);

    assert(result.overall_summary.total_records === 0, "0 records");
    assert(result.overall_summary.total_volume === 0, "0 volume");
    assert(result.accounts.length === 0, "0 accounts");
    assert(result.anomalies.length === 0, "0 anomalies");
    assert(result.chains.length === 0, "0 chains");
  });

  // -------------------------------------------------------------------------
  // Test Case 7: Missing values / malformed records
  // -------------------------------------------------------------------------
  test("7. Missing values & malformed records handling", () => {
    const malformed = [
      null,
      undefined,
      {},
      { sender: "", receiver: "Account B", amount: 5000 }, // missing sender
      { sender: "Account A", receiver: "", amount: 5000 }, // missing receiver
      { sender: "Account A", receiver: "Account A", amount: 5000 }, // self-transfer
      { sender: "Account A", receiver: "Account B", amount: "invalid-amount" }, // non-numeric amount
      { sender: "Account A", receiver: "Account B", amount: -500 }, // negative/zero amount
      { sender: "Account A", receiver: "Account B", amount: "₹12,500.50", timestamp: "invalid-date" }, // valid parsed string amount
    ];

    const result = TransactionAnalysisEngine.analyze(malformed);

    assert(result.overall_summary.total_records === 1, "Only 1 valid transaction record accepted");
    assert(result.overall_summary.total_volume === 12500.5, "Amount ₹12,500.50 accurately parsed as number");
    assert(result.accounts.length === 2, "2 accounts profiled without crashing");
  });

  // -------------------------------------------------------------------------
  // Test Case 8: Insufficient historical data
  // -------------------------------------------------------------------------
  test("8. Insufficient historical data (single transaction without false statistical flags)", () => {
    const singleTx = [
      { sender: "Account A", receiver: "Account B", amount: 10000, timestamp: "2026-08-01T10:00:00Z" },
    ];

    const result = TransactionAnalysisEngine.analyze(singleTx);

    assert(result.overall_summary.total_records === 1, "1 record processed");
    assert(result.anomalies.length === 0, "No false positive anomalies generated for single transaction");
  });

  // -------------------------------------------------------------------------
  // Test Case 9: Zero standard deviation
  // -------------------------------------------------------------------------
  test("9. Zero standard deviation handling (uniform amounts across all transactions)", () => {
    // 5 transactions of exactly ₹10,000 (std = 0)
    const uniformTxs = [
      { sender: "Account A", receiver: "Vendor 1", amount: 10000, timestamp: "2026-08-01T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 2", amount: 10000, timestamp: "2026-08-02T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 3", amount: 10000, timestamp: "2026-08-03T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 4", amount: 10000, timestamp: "2026-08-04T10:00:00Z" },
      { sender: "Account A", receiver: "Vendor 5", amount: 10000, timestamp: "2026-08-05T10:00:00Z" },
    ];

    const result = TransactionAnalysisEngine.analyze(uniformTxs);

    assert(result.overall_summary.total_volume === 50000, "50,000 total volume");
    assert(result.anomalies.length === 0, "Zero division prevented, no false anomaly when std is 0");
  });

  // -------------------------------------------------------------------------
  // Test Case 10: Multiple accounts & financial flow chains
  // -------------------------------------------------------------------------
  test("10. Multiple accounts & financial flow chains (A -> B -> C)", () => {
    const chainRecords = [
      { sender: "Skyline Traders", receiver: "Amit Sharma", amount: 50000 },
      { sender: "Amit Sharma", receiver: "Rahul Kumar", amount: 40000 },
      { sender: "Other Account", receiver: "Vendor Y", amount: 15000 },
    ];

    const result = TransactionAnalysisEngine.analyze(chainRecords);

    assert(result.overall_summary.unique_accounts === 5, "5 unique accounts identified");
    assert(result.chains.length >= 1, "Discovered financial flow chain");
    const chain = result.chains[0];
    assert(chain.path.join(" -> ") === "Skyline Traders -> Amit Sharma -> Rahul Kumar", "Chain path: Skyline Traders -> Amit Sharma -> Rahul Kumar");
    assert(chain.total_amount === 90000, "Chain total amount: 90,000");
  });

  console.log("\n========================================================");
  console.log(`TRANSACTION ANALYSIS TESTS COMPLETE: ${passed}/${total} PASSED`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Only ${passed}/${total} tests passed.`);
  }
}

runTests();
