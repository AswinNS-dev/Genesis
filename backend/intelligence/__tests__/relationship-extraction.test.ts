// Comprehensive Test Suite: Relationship Extraction Module
// ============================================================
// Tests all 8 required test cases for Relationship Extraction:
// 1. Person → calls → Person
// 2. Person → owns → Vehicle
// 3. Person → transfers → Account / Person
// 4. Person → visited → Location
// 5. Person → associated with → Case
// 6. Multiple relationships in one sentence
// 7. Missing/ambiguous entities (skipped safely, no hallucinations)
// 8. Duplicate entity names & alias handling
// ============================================================

import {
  RelationshipExtractionEngine,
  UnstructuredRelationshipExtractor,
  StructuredRelationshipExtractor,
  EntityDetector,
} from "../relationship-extraction";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

function runTests() {
  console.log("\n========================================================");
  console.log("RUNNING RELATIONSHIP EXTRACTION TEST SUITE");
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
  // Test Case 1: Person → calls → Person
  // -------------------------------------------------------------------------
  test("1. Person -> calls -> Person (Unstructured and Structured)", () => {
    // Unstructured text
    const text = "Ravi called Suresh 15 times during August.";
    const rels = UnstructuredRelationshipExtractor.extract(text, { sourceName: "FIR_1024" });

    assert(rels.length >= 1, "Extracted at least one relationship");
    const r = rels[0];
    assert(r.source === "Ravi", `Source is Ravi (got: ${r.source})`);
    assert(r.relationship === "CALLED", `Relationship is CALLED (got: ${r.relationship})`);
    assert(r.target === "Suresh", `Target is Suresh (got: ${r.target})`);
    assert(r.metadata?.frequency === 15, `Frequency is 15 (got: ${r.metadata?.frequency})`);
    assert(r.metadata?.period === "August", `Period is August (got: ${r.metadata?.period})`);
    assert(r.confidence >= 0.90, `Confidence is high: ${r.confidence}`);
    assert(r.evidenceText?.includes("Ravi called Suresh 15 times"), "Evidence text preserved");

    // Structured CDR row
    const cdrRows = [
      { caller: "Amit Sharma", receiver: "Priya Singh", duration_seconds: 320, timestamp: "2026-08-12T14:30:00Z", frequency: 5 },
    ];
    const structRels = StructuredRelationshipExtractor.extractFromRecords(cdrRows, "CDR_August.csv");
    assert(structRels.length === 1, "Structured CDR extracted");
    assert(structRels[0].source === "Amit Sharma", "Caller parsed");
    assert(structRels[0].target === "Priya Singh", "Receiver parsed");
    assert(structRels[0].metadata?.duration === 320, "Duration preserved");
    assert(structRels[0].metadata?.frequency === 5, "Frequency preserved");
  });

  // -------------------------------------------------------------------------
  // Test Case 2: Person → owns → Vehicle
  // -------------------------------------------------------------------------
  test("2. Person -> owns -> Vehicle", () => {
    const text = "Rahul Kumar owns vehicle DL01AB1234.";
    const rels = UnstructuredRelationshipExtractor.extract(text);

    assert(rels.length >= 1, "Extracted vehicle ownership relation");
    const r = rels.find((x) => x.relationship === "OWNS_VEHICLE");
    assert(!!r, "Relationship type is OWNS_VEHICLE");
    assert(r!.source === "Rahul Kumar", `Owner is Rahul Kumar (got: ${r!.source})`);
    assert(r!.target === "DL01AB1234", `Vehicle is DL01AB1234 (got: ${r!.target})`);
    assert(r!.targetType === "VEHICLE", "Target type is VEHICLE");

    // Structured vehicle log
    const struct = StructuredRelationshipExtractor.extractFromRecords([
      { driver: "Arjun Mehta", vehicle_reg: "KA05XY6789", vehicle_type: "Sedan" },
    ]);
    assert(struct.length === 1 && struct[0].relationship === "OWNS_VEHICLE", "Structured vehicle record extracted");
    assert(struct[0].source === "Arjun Mehta" && struct[0].target === "KA05XY6789", "Vehicle and driver matched");
  });

  // -------------------------------------------------------------------------
  // Test Case 3: Person → transfers → Account / Person
  // -------------------------------------------------------------------------
  test("3. Person -> transfers -> Account / Person", () => {
    const text = "Ravi transferred ₹250000 to Arun's bank account.";
    const rels = UnstructuredRelationshipExtractor.extract(text);

    assert(rels.length >= 1, "Extracted money transfer relation");
    const r = rels.find((x) => x.relationship === "TRANSFERRED_MONEY_TO");
    assert(!!r, "Relationship type is TRANSFERRED_MONEY_TO");
    assert(r!.source === "Ravi", `Sender is Ravi (got: ${r!.source})`);
    assert(r!.target === "Arun", `Recipient is Arun (got: ${r!.target})`);
    assert(r!.metadata?.amount === 250000, `Amount is 250000 (got: ${r!.metadata?.amount})`);
    assert(r!.metadata?.currency === "INR", `Currency is INR (got: ${r!.metadata?.currency})`);

    // Structured Financial record
    const struct = StructuredRelationshipExtractor.extractFromRecords([
      { sender: "Suresh Verma", beneficiary: "Arjun Mehta", amount: "120000", currency: "INR", transaction_id: "TXN998822" },
    ]);
    assert(struct.length === 1 && struct[0].relationship === "TRANSFERRED_MONEY_TO", "Structured transaction extracted");
    assert(struct[0].metadata?.amount === 120000, "Amount accurately parsed as number");
    assert(struct[0].metadata?.transactionId === "TXN998822", "Transaction reference preserved");
  });

  // -------------------------------------------------------------------------
  // Test Case 4: Person → visited → Location
  // -------------------------------------------------------------------------
  test("4. Person -> visited -> Location", () => {
    const text = "Priya Singh visited Sector 18 yesterday afternoon.";
    const rels = UnstructuredRelationshipExtractor.extract(text);

    assert(rels.length >= 1, "Extracted location visit");
    const r = rels.find((x) => x.relationship === "VISITED");
    assert(!!r, "Relationship type is VISITED");
    assert(r!.source === "Priya Singh", `Visitor is Priya Singh (got: ${r!.source})`);
    assert(r!.target.toLowerCase().includes("sector 18"), `Location is Sector 18 (got: ${r!.target})`);
    assert(r!.targetType === "LOCATION", "Target type is LOCATION");

    // Structured location ping
    const struct = StructuredRelationshipExtractor.extractFromRecords([
      { entity: "Amit Sharma", location: "Central Market", timestamp: "2026-08-10T11:00:00Z" },
    ]);
    assert(struct.length === 1 && struct[0].relationship === "VISITED", "Structured location ping extracted");
    assert(struct[0].source === "Amit Sharma" && struct[0].target === "Central Market", "Location ping matched entity");
  });

  // -------------------------------------------------------------------------
  // Test Case 5: Person → associated with → Case
  // -------------------------------------------------------------------------
  test("5. Person -> associated with -> Case", () => {
    const text = "Suresh Verma is associated with case CR-2026-1051.";
    const rels = UnstructuredRelationshipExtractor.extract(text);

    assert(rels.length >= 1, "Extracted case association");
    const r = rels.find((x) => x.relationship === "ASSOCIATED_WITH_CASE");
    assert(!!r, "Relationship type is ASSOCIATED_WITH_CASE");
    assert(r!.source === "Suresh Verma", `Person is Suresh Verma (got: ${r!.source})`);
    assert(r!.target === "CR-2026-1051", `Case is CR-2026-1051 (got: ${r!.target})`);
  });

  // -------------------------------------------------------------------------
  // Test Case 6: Multiple relationships in one sentence
  // -------------------------------------------------------------------------
  test("6. Multiple relationships in one sentence / compound statements", () => {
    const text = "Ravi called Suresh 15 times during August and transferred ₹250000 to Arun's bank account.";
    const rels = UnstructuredRelationshipExtractor.extract(text);

    assert(rels.length >= 2, `Extracted multiple relationships (found: ${rels.length})`);
    const callRel = rels.find((r) => r.relationship === "CALLED");
    const transferRel = rels.find((r) => r.relationship === "TRANSFERRED_MONEY_TO");

    assert(!!callRel, "Found CALLED relationship");
    assert(callRel!.source === "Ravi" && callRel!.target === "Suresh", "Call: Ravi -> Suresh");
    assert(callRel!.metadata?.frequency === 15, "Call frequency: 15");

    assert(!!transferRel, "Found TRANSFERRED_MONEY_TO relationship");
    assert(transferRel!.source === "Ravi" && transferRel!.target === "Arun", "Transfer: Ravi -> Arun");
    assert(transferRel!.metadata?.amount === 250000, "Transfer amount: ₹250,000");
  });

  // -------------------------------------------------------------------------
  // Test Case 7: Missing / Ambiguous entities (Safely skipped, no hallucinations)
  // -------------------------------------------------------------------------
  test("7. Missing/ambiguous entities handled safely without false hallucinations", () => {
    const ambiguousText = "Someone went somewhere and did something yesterday without any specific name.";
    const rels = UnstructuredRelationshipExtractor.extract(ambiguousText);

    assert(rels.length === 0, `No random relationships created for ambiguous text (found: ${rels.length})`);

    const incompleteText = "A payment of ₹500 was initiated.";
    const relsIncomplete = UnstructuredRelationshipExtractor.extract(incompleteText);
    assert(relsIncomplete.length === 0, "No relationship created when both sender and receiver are absent");
  });

  // -------------------------------------------------------------------------
  // Test Case 8: Duplicate entity names & alias handling
  // -------------------------------------------------------------------------
  test("8. Duplicate entity names, aliases and deduplication", () => {
    const knownEntities = [
      { name: "Rahul Kumar", type: "PERSON" as const, aliases: ["R. Kumar", "Rahul K."] },
    ];
    const text1 = "Rahul Kumar met Suresh Verma at Industrial Area.";
    const text2 = "R. Kumar met Suresh Verma at Industrial Area.";

    const rels1 = UnstructuredRelationshipExtractor.extract(text1, { knownEntities });
    const rels2 = UnstructuredRelationshipExtractor.extract(text2, { knownEntities });

    assert(rels1.length >= 1, "Extracted for full name");
    assert(rels2.length >= 1, "Extracted for alias");
    assert(rels1[0].source === "Rahul Kumar" || rels1[0].target === "Rahul Kumar", "Matched full name");
    assert(rels2[0].source === "Rahul Kumar" || rels2[0].target === "Rahul Kumar", "Alias normalized to Rahul Kumar");

    // Unified Engine Output Format Verification (SIH26189 KG Format)
    const detected = RelationshipExtractionEngine.toDetectedRelationships(rels1);
    assert(detected.length >= 1, "Converted to Knowledge Graph DetectedRelationship format");
    assert(detected[0].source === "Rahul Kumar" || detected[0].target === "Rahul Kumar", "KG format maintains source/target");
    assert(typeof detected[0].confidence === "number", "KG format has integer confidence score");
    assert(typeof detected[0].explanation === "string", "KG format provides explainable label");
  });

  console.log("\n========================================================");
  console.log(`RELATIONSHIP EXTRACTION TESTS COMPLETE: ${passed}/${total} PASSED`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Only ${passed}/${total} tests passed.`);
  }
}

runTests();
