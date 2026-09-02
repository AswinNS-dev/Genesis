// Comprehensive Test Suite: Anomaly Detection & Scoring Module
// ============================================================
// Tests all 8 required test cases for Anomaly Detection:
// 1. Normal call activity (No false positive)
// 2. Communication spike (e.g., 2 calls/week -> 45 calls/day)
// 3. Large transaction (e.g., ₹5,000-₹20,000 normal -> ₹5,00,000 sudden)
// 4. Transaction frequency anomaly (rapid bursts / structuring)
// 5. New communication relationship
// 6. Location anomaly (impossible travel velocity / rapid geographic jumps)
// 7. Network bridge detection (Betweenness Centrality connecting communities)
// 8. Normal behavior that should NOT be flagged (false-positive minimization)
// ============================================================

import {
  AnomalyDetectionEngine,
  StatisticalAnomalyDetector,
  GraphAnomalyDetector,
  DomainAnomalyDetector,
} from "../anomaly-detection";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

function runTests() {
  console.log("\n========================================================");
  console.log("RUNNING ANOMALY DETECTION TEST SUITE");
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
  // Test Case 1: Normal call activity (NO false positive)
  // -------------------------------------------------------------------------
  test("1. Normal call activity (should produce baseline / no false anomaly)", () => {
    const normalCalls = [
      { a: "Ravi", b: "Suresh", count: 2, durations: [120, 180] },
      { a: "Amit", b: "Priya", count: 3, durations: [90, 150, 200] },
    ];
    const anomalies = DomainAnomalyDetector.detectCallAnomalies(normalCalls, {
      "Ravi ↔ Suresh": 2, // baseline: 2 calls/week
      "Amit ↔ Priya": 3,  // baseline: 3 calls/week
    });

    assert(anomalies.length === 0, `Normal call activity produced 0 anomalies (got: ${anomalies.length})`);
  });

  // -------------------------------------------------------------------------
  // Test Case 2: Communication spike (e.g. 2 calls/week -> 45 calls/day)
  // -------------------------------------------------------------------------
  test("2. Communication spike (2 calls/week -> 45 calls/day)", () => {
    const spikeCalls = [
      { a: "Ravi", b: "Suresh", count: 45, durations: Array(45).fill(120) },
    ];
    const anomalies = DomainAnomalyDetector.detectCallAnomalies(spikeCalls, {
      "Ravi ↔ Suresh": 2, // baseline: 2 calls/week
    });

    assert(anomalies.length >= 1, "Communication spike detected");
    const spike = anomalies.find((a) => a.anomalyType === "COMMUNICATION_SPIKE");
    assert(!!spike, "Anomaly type is COMMUNICATION_SPIKE");
    assert(spike!.score >= 0.85, `Score is high (got: ${spike!.score})`);
    assert(spike!.severity === "HIGH", `Severity is HIGH (got: ${spike!.severity})`);
    assert(spike!.affectedEntities.includes("Ravi") && spike!.affectedEntities.includes("Suresh"), "Entities: Ravi, Suresh");
    assert(spike!.evidence.normal_frequency === 2, "Evidence baseline is 2 calls/week");
    assert(spike!.evidence.observed_frequency === 45, "Evidence observed is 45 calls/day");
    assert(spike!.explanation.includes("increased from an average of 2 calls/week to 45 calls/day"), "Explainable narrative provided");
  });

  // -------------------------------------------------------------------------
  // Test Case 3: Large transaction (e.g. ₹5,000–₹20,000 normal -> ₹5,00,000 sudden)
  // -------------------------------------------------------------------------
  test("3. Large transaction amount outlier (₹5,000-₹20,000 -> ₹5,00,000)", () => {
    const txs = [
      { sender: "Ravi", receiver: "Vendor A", amount: 5000 },
      { sender: "Ravi", receiver: "Vendor B", amount: 12000 },
      { sender: "Ravi", receiver: "Vendor C", amount: 8000 },
      { sender: "Ravi", receiver: "Vendor D", amount: 15000 },
      { sender: "Ravi", receiver: "Vendor E", amount: 20000 },
      { sender: "Ravi", receiver: "Vendor F", amount: 10000 },
      { sender: "Ravi", receiver: "Vendor G", amount: 7500 },
      { sender: "Ravi", receiver: "Arun", amount: 500000 }, // Sudden huge transfer
    ];

    const anomalies = DomainAnomalyDetector.detectTransactionAnomalies(txs);
    assert(anomalies.length >= 1, "Detected transaction amount outlier");
    const largeTx = anomalies.find((a) => a.anomalyType === "UNUSUAL_TRANSACTION_AMOUNT");
    assert(!!largeTx, "Anomaly type is UNUSUAL_TRANSACTION_AMOUNT");
    assert(largeTx!.score >= 0.90, `Anomaly score >= 0.90 (got: ${largeTx!.score})`);
    assert(largeTx!.severity === "HIGH", "Severity is HIGH");
    assert(largeTx!.affectedEntities.includes("Ravi") && largeTx!.affectedEntities.includes("Arun"), "Affected entities identified");
    assert(largeTx!.explanation.includes("deviates significantly"), "Explainable narrative provided");
  });

  // -------------------------------------------------------------------------
  // Test Case 4: Transaction frequency anomaly (burst / structuring)
  // -------------------------------------------------------------------------
  test("4. Transaction frequency anomaly (rapid bursts)", () => {
    const burstTxs = [
      { sender: "Subject X", receiver: "Account 1", amount: 48000, count: 6 },
    ];

    const anomalies = DomainAnomalyDetector.detectTransactionAnomalies(burstTxs);
    const burst = anomalies.find((a) => a.anomalyType === "TRANSACTION_FREQUENCY_ANOMALY");
    assert(!!burst, "Flagged high frequency / burst transaction anomaly");
    assert(burst!.affectedEntities.includes("Subject X"), "Entity Subject X flagged");
  });

  // -------------------------------------------------------------------------
  // Test Case 5: New communication relationship & off-hours activity
  // -------------------------------------------------------------------------
  test("5. Off-hours communication & long call anomaly", () => {
    const nightCalls = [
      {
        a: "Subject A",
        b: "Subject B",
        count: 4,
        timestamps: [
          new Date("2026-08-12T01:15:00Z"),
          new Date("2026-08-12T02:30:00Z"),
          new Date("2026-08-12T03:45:00Z"),
        ],
        durations: [2400, 3600], // 40m, 60m calls
      },
    ];

    const anomalies = DomainAnomalyDetector.detectCallAnomalies(nightCalls);
    const offHours = anomalies.find((a) => a.anomalyType === "OFF_HOURS_COMMUNICATION");
    const longCall = anomalies.find((a) => a.anomalyType === "UNUSUAL_CALL_DURATION");

    assert(!!offHours, "Detected OFF_HOURS_COMMUNICATION");
    assert(!!longCall, "Detected UNUSUAL_CALL_DURATION");
    assert(offHours!.explanation.includes("00:00–05:00"), "Off-hours explanation mentions night window");
  });

  // -------------------------------------------------------------------------
  // Test Case 6: Location anomaly (Impossible travel velocity)
  // -------------------------------------------------------------------------
  test("6. Location anomaly (impossible travel speed between distant locations)", () => {
    const movements = [
      { entity: "Subject Y", location: "Delhi Sector 18", timestamp: "2026-08-15T10:00:00.000Z" },
      { entity: "Subject Y", location: "Mumbai Central", timestamp: "2026-08-15T10:15:00.000Z" }, // 15 mins later in Mumbai
    ];

    const anomalies = DomainAnomalyDetector.detectLocationAnomalies([], movements);
    assert(anomalies.length >= 1, "Detected impossible travel velocity");
    const locAnomaly = anomalies.find((a) => a.anomalyType === "IMPOSSIBLE_TRAVEL_VELOCITY");
    assert(!!locAnomaly, "Anomaly type is IMPOSSIBLE_TRAVEL_VELOCITY");
    assert(locAnomaly!.score >= 0.90, `Score is high: ${locAnomaly!.score}`);
    assert(locAnomaly!.explanation.includes("15 minutes"), "Explanation mentions 15 minutes elapsed time");
  });

  // -------------------------------------------------------------------------
  // Test Case 7: Network bridge detection (Betweenness Centrality & Communities)
  // -------------------------------------------------------------------------
  test("7. Network bridge detection (connecting separate communities)", () => {
    // Community 1: A, B, C (fully connected)
    // Community 2: D, E, F (fully connected)
    // Bridge: "Ravi" connects Community 1 and Community 2
    const nodes = ["A", "B", "C", "D", "E", "F", "Ravi"];
    const edges = [
      // Community 1
      { source: "A", target: "B" },
      { source: "B", target: "C" },
      { source: "A", target: "C" },
      // Bridge links
      { source: "A", target: "Ravi" },
      { source: "B", target: "Ravi" },
      { source: "D", target: "Ravi" },
      { source: "E", target: "Ravi" },
      // Community 2
      { source: "D", target: "E" },
      { source: "E", target: "F" },
      { source: "D", target: "F" },
    ];

    const anomalies = DomainAnomalyDetector.detectNetworkAnomalies(nodes, edges);
    assert(anomalies.length >= 1, "Detected network structural anomaly");
    const bridge = anomalies.find((a) => a.anomalyType === "NETWORK_BRIDGE_NODE");
    assert(!!bridge, "Found NETWORK_BRIDGE_NODE");
    assert(bridge!.affectedEntities.includes("Ravi"), "Ravi identified as bridge node");
    assert(bridge!.score >= 0.85, `Score >= 0.85 (got: ${bridge!.score})`);
    assert(bridge!.explanation.includes("direct connections") && bridge!.explanation.includes("communities"), "Explainable network narrative provided");
  });

  // -------------------------------------------------------------------------
  // Test Case 8: Normal behavior that should NOT be flagged (False Positive Minimization)
  // -------------------------------------------------------------------------
  test("8. Normal behavior that should NOT be flagged (Minimizing False Positives)", () => {
    const normalContext = {
      calls: [
        { a: "Officer A", b: "Officer B", count: 2 },
      ],
      transactions: [
        { sender: "Person A", receiver: "Shop", amount: 1500 },
        { sender: "Person B", receiver: "Shop", amount: 2200 },
      ],
      locations: [
        { name: "Public Office", entities: ["Person A"] },
      ],
      relationships: [
        { type: "COMMUNICATION", sourceName: "Officer A", targetName: "Officer B", strength: 20 },
      ],
    };

    const results = AnomalyDetectionEngine.detect(normalContext);
    // Should either return only BASELINE status with low score or 0 severe anomalies
    const severeAnomalies = results.filter((r) => r.anomalyType !== "BASELINE" && r.severity === "HIGH");
    assert(severeAnomalies.length === 0, `No false positive high severity anomalies flagged (got: ${severeAnomalies.length})`);
    assert(results[0].anomalyType === "BASELINE", "Returns clean baseline assessment");
    assert(results[0].score <= 0.2, "Baseline score is low");
  });

  console.log("\n========================================================");
  console.log(`ANOMALY DETECTION TESTS COMPLETE: ${passed}/${total} PASSED`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Only ${passed}/${total} tests passed.`);
  }
}

runTests();
