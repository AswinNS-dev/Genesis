// Comprehensive Test Suite: Communication Analysis Module
// ============================================================
// Tests all 9 required test cases for Communication Analysis:
// 1. Normal communication
// 2. High-frequency communication
// 3. Communication spike
// 4. New communication relationship
// 5. Empty dataset
// 6. Missing values / malformed records
// 7. Insufficient historical data
// 8. Zero standard deviation
// 9. Multiple entities
// ============================================================

import {
  CommunicationAnalysisEngine,
  CommunicationRecordNormalizer,
  CommunicationFrequencyAnalyzer,
  CommunicationSpikeDetector,
} from "../communication-analysis";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

function runTests() {
  console.log("\n========================================================");
  console.log("RUNNING COMMUNICATION ANALYSIS TEST SUITE");
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
  // Test Case 1: Normal communication
  // -------------------------------------------------------------------------
  test("1. Normal communication profiling (baseline calculation)", () => {
    const records = [
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-01T10:00:00Z", duration: 120 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-02T11:00:00Z", duration: 180 },
      { caller: "Person B", receiver: "Person A", timestamp: "2026-08-03T09:30:00Z", duration: 90 },
      { caller: "Person A", receiver: "Person C", timestamp: "2026-08-03T14:00:00Z", duration: 60 },
    ];

    const result = CommunicationAnalysisEngine.analyze(records);

    assert(result.overall_summary.total_records === 4, "4 total records processed");
    assert(result.overall_summary.unique_entities === 3, "3 unique entities (Person A, B, C)");
    assert(result.anomalies.length === 0, "No false anomalies in normal communication");

    const personA = result.entities.find((e) => e.entity === "Person A");
    assert(!!personA, "Person A summary created");
    assert(personA!.total_communications === 4, "Person A has 4 total communications");
    assert(personA!.outgoing_count === 3, "Person A has 3 outgoing calls");
    assert(personA!.incoming_count === 1, "Person A has 1 incoming call");
    assert(personA!.bidirectional_count === 1, "Person A has 1 bidirectional contact (Person B)");
    assert(personA!.unique_contacts === 2, "Person A has 2 unique contacts (Person B, Person C)");
  });

  // -------------------------------------------------------------------------
  // Test Case 2: High-frequency communication
  // -------------------------------------------------------------------------
  test("2. High-frequency communication pattern", () => {
    const highFreqRecords = [
      { caller: "Person A", receiver: "Person B", count: 85, duration: 150 },
    ];

    const result = CommunicationAnalysisEngine.analyze(highFreqRecords);
    const personA = result.entities.find((e) => e.entity === "Person A");

    assert(!!personA, "Profiled high frequency entity");
    assert(personA!.total_communications === 85, "Total communications is 85");
    assert(result.anomalies.length >= 1, "Detected high frequency anomaly");
    assert(result.anomalies[0].type === "high_frequency_communication", "Anomaly type is high_frequency_communication");
    assert(result.anomalies[0].score >= 0.70, "Anomaly score is elevated");
  });

  // -------------------------------------------------------------------------
  // Test Case 3: Communication spike
  // -------------------------------------------------------------------------
  test("3. Communication spike detection (sudden surge vs baseline)", () => {
    // Baseline: Day 1 (2 calls), Day 2 (3 calls), Day 3 (1 call), Day 4 (2 calls), Day 5 (3 calls)
    // Sudden spike: Day 6 (25 calls)
    const records = [
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-01T10:00:00Z", count: 2 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-02T10:00:00Z", count: 3 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-03T10:00:00Z", count: 1 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-04T10:00:00Z", count: 2 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-05T10:00:00Z", count: 3 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-06T10:00:00Z", count: 25 }, // Sudden spike
    ];

    const result = CommunicationAnalysisEngine.analyze(records);
    const spike = result.anomalies.find((a) => a.type === "communication_spike");

    assert(!!spike, "Found communication_spike anomaly");
    assert(spike!.entity === "Person A" && spike!.targetEntity === "Person B", "Entities: Person A, Person B");
    assert(spike!.severity === "medium" || spike!.severity === "high", "Severity is medium/high");
    assert(spike!.score >= 0.80, `Score is elevated (got: ${spike!.score})`);
    assert(spike!.reason.includes("baseline") || spike!.reason.includes("Z-score"), "Explainable reason generated");
    assert(spike!.evidence?.observedCount === 25, "Observed count in evidence is 25");
  });

  // -------------------------------------------------------------------------
  // Test Case 4: New communication relationship
  // -------------------------------------------------------------------------
  test("4. New communication relationship (first contact with previously unseen entity)", () => {
    const historicalKnownPairs = ["person a↔person b", "person a↔person c"];
    const currentRecords = [
      { caller: "Person A", receiver: "Person B", count: 5, timestamp: "2026-08-10T10:00:00Z" },
      { caller: "Person A", receiver: "Person D", count: 20, timestamp: "2026-08-10T12:00:00Z" }, // Brand new relationship
    ];

    const result = CommunicationAnalysisEngine.analyze(currentRecords, { historicalKnownPairs });
    const newRel = result.anomalies.find((a) => a.type === "new_communication_relationship");

    assert(!!newRel, "Detected new_communication_relationship anomaly");
    assert(newRel!.entity === "Person A" && newRel!.targetEntity === "Person D", "Identified new link: Person A -> Person D");
    assert(newRel!.reason.includes("New communication relationship detected"), "Clear non-judgmental reason");
  });

  // -------------------------------------------------------------------------
  // Test Case 5: Empty dataset
  // -------------------------------------------------------------------------
  test("5. Empty dataset handling (graceful return with zero errors)", () => {
    const result = CommunicationAnalysisEngine.analyze([]);

    assert(result.overall_summary.total_records === 0, "0 total records");
    assert(result.overall_summary.total_calls === 0, "0 total calls");
    assert(result.entities.length === 0, "0 entity summaries");
    assert(result.anomalies.length === 0, "0 anomalies");
    assert(result.relationships.length === 0, "0 relationships");
  });

  // -------------------------------------------------------------------------
  // Test Case 6: Missing values / malformed records
  // -------------------------------------------------------------------------
  test("6. Missing values & malformed records handling", () => {
    const malformed = [
      null,
      undefined,
      {},
      { caller: "", receiver: "Person B" }, // missing caller
      { caller: "Person A", receiver: "" }, // missing receiver
      { caller: "Person A", receiver: "Person A" }, // self-loop
      { caller: "Person A", receiver: "Person B", duration: "invalid", count: "nan", timestamp: "invalid-date" }, // valid entities, invalid metadata
    ];

    const result = CommunicationAnalysisEngine.analyze(malformed);

    assert(result.overall_summary.total_records === 1, "Only 1 valid record accepted");
    assert(result.overall_summary.unique_entities === 2, "2 entities (Person A, Person B)");
    assert(result.entities.length === 2, "Entities profiled without crashing");
  });

  // -------------------------------------------------------------------------
  // Test Case 7: Insufficient historical data
  // -------------------------------------------------------------------------
  test("7. Insufficient historical data (single call records without false statistical flags)", () => {
    const records = [
      { caller: "Officer X", receiver: "Officer Y", timestamp: "2026-08-01T10:00:00Z", count: 1 },
    ];

    const result = CommunicationAnalysisEngine.analyze(records);

    assert(result.overall_summary.total_records === 1, "1 record processed");
    assert(result.anomalies.length === 0, "No false positive anomalies generated for insufficient history");
  });

  // -------------------------------------------------------------------------
  // Test Case 8: Zero standard deviation
  // -------------------------------------------------------------------------
  test("8. Zero standard deviation handling (uniform activity over multiple days)", () => {
    // 5 calls every single day (variance = 0, std = 0)
    const uniformRecords = [
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-01T10:00:00Z", count: 5 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-02T10:00:00Z", count: 5 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-03T10:00:00Z", count: 5 },
      { caller: "Person A", receiver: "Person B", timestamp: "2026-08-04T10:00:00Z", count: 5 },
    ];

    const result = CommunicationAnalysisEngine.analyze(uniformRecords);

    assert(result.overall_summary.total_calls === 20, "20 total calls counted");
    assert(result.anomalies.length === 0, "Zero division prevented, no false anomaly when std is 0");
  });

  // -------------------------------------------------------------------------
  // Test Case 9: Multiple entities & network graph metrics
  // -------------------------------------------------------------------------
  test("9. Multiple entities & network degree metrics", () => {
    const multiRecords = [
      { caller: "Hub A", receiver: "Node 1", count: 10 },
      { caller: "Hub A", receiver: "Node 2", count: 15 },
      { caller: "Hub A", receiver: "Node 3", count: 20 },
      { caller: "Node 2", receiver: "Node 3", count: 5 },
    ];

    const result = CommunicationAnalysisEngine.analyze(multiRecords);

    assert(result.overall_summary.unique_entities === 4, "4 unique entities in network");
    const hub = result.entities.find((e) => e.entity === "Hub A");
    assert(!!hub, "Hub A summary present");
    assert(hub!.network_metrics.degree === 3, "Hub A degree is 3");
    assert(hub!.network_metrics.weighted_degree === 45, "Hub A weighted degree is 45");
    assert(hub!.network_metrics.degree_centrality === 1.0, "Hub A degree centrality is 1.0 (connected to all other nodes)");
    assert(result.relationships.length === 4, "4 pair relationships aggregated");
  });

  console.log("\n========================================================");
  console.log(`COMMUNICATION ANALYSIS TESTS COMPLETE: ${passed}/${total} PASSED`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Only ${passed}/${total} tests passed.`);
  }
}

runTests();
