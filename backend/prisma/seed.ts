import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  sha256,
  hashBlock,
  evidenceContent,
  genesisDataHash,
  genesisTimestamp,
} from "../lib/blockchain";

const prisma = new PrismaClient();

// ============================================================
// Demo login users (FICTIONAL)
// ============================================================
const demoUsers = [
  { email: "admin@crimeintel.demo", name: "DCP Operations — Admin", password: "Admin@1234", role: "ADMIN" },
  { email: "investigator@crimeintel.demo", name: "Insp. A. Rane (CID)", password: "Inv3stigator!", role: "INVESTIGATOR" },
  { email: "analyst@crimeintel.demo", name: "Analyst S. Iyer", password: "An@lyst2024", role: "ANALYST" },
  { email: "viewer@crimeintel.demo", name: "Reader V. Rao", password: "V1ewer_Only", role: "VIEWER" },
];

// ============================================================
// Demo master data — all FICTIONAL
// ============================================================

const caseDefs = [
  {
    caseId: "CR-2026-1042",
    title: "Sector 18 logistics network probe",
    description:
      "Investigation into coordinated cargo movement and communication among individuals operating around Sector 18 and the Industrial Area. Fictional demonstration case.",
    status: "OPEN",
    classification: "RESTRICTED",
    assignedInvestigator: "Insp. A. Rane (CID)",
    daysAgo: 36,
    entities: ["Rahul Kumar", "Amit Sharma", "Priya Singh", "Kavita Nair", "ABC Logistics"],
    relationships: ["Rahul Kumar↔Amit Sharma", "Amit Sharma↔Priya Singh", "Priya Singh↔Kavita Nair"],
  },
  {
    caseId: "CR-2026-1051",
    title: "Industrial Area trafficking inquiry",
    description:
      "Follow-on inquiry linked to vehicle and communication patterns near the Industrial Area. All data fictional.",
    status: "OPEN",
    classification: "SECRET",
    assignedInvestigator: "Insp. A. Rane (CID)",
    daysAgo: 21,
    entities: ["Suresh Verma", "Arjun Mehta", "Vikram Rao", "Mehta Imports"],
    relationships: ["Suresh Verma↔Arjun Mehta", "Arjun Mehta↔Vikram Rao"],
  },
  {
    caseId: "CR-2026-1033",
    title: "Central Market finance trail",
    description:
      "Analysis of financial transactions and repeated communication in the Central Market corridor. Fictional data.",
    status: "CLOSED",
    classification: "RESTRICTED",
    assignedInvestigator: "Analyst S. Iyer",
    daysAgo: 60,
    entities: ["Amit Sharma", "R. Kumar", "Skyline Traders"],
    relationships: ["Amit Sharma↔R. Kumar", "R. Kumar↔Skyline Traders"],
  },
];

// Fictional people, phones, vehicles, locations, orgs
const persons = [
  { name: "Rahul Kumar", value: null },
  { name: "Amit Sharma", value: null },
  { name: "Suresh Verma", value: null },
  { name: "Priya Singh", value: null },
  { name: "Arjun Mehta", value: null },
  { name: "R. Kumar", value: "alias of Rahul Kumar (fictional)" },
  { name: "Kavita Nair", value: null },
  { name: "Vikram Rao", value: null },
];

const phones = [
  { name: "9876512345", value: "DL - prepaid" },
  { name: "9822013345", value: "MH - postpaid" },
  { name: "9988776655", value: "KA - prepaid" },
  { name: "9811223344", value: "DL - postpaid" },
];

const vehicles = [
  { name: "DL01AB1234", value: "HGV — logistics" },
  { name: "KA05XY6789", value: "sedan" },
  { name: "MH12CD5678", value: "van" },
];

const locations = [
  { name: "Sector 18", value: "commercial district" },
  { name: "Central Market", value: "market corridor" },
  { name: "Industrial Area", value: "warehouse zone" },
  { name: "Vasant Vihar", value: "residential" },
  { name: "Nehru Place", value: "commercial tech park" },
];

const organizations = [
  { name: "ABC Logistics", value: "transport provider" },
  { name: "Sharma Pharma", value: "pharmaceutical distributor" },
  { name: "Mehta Imports", value: "import/export" },
  { name: "Skyline Traders", value: "wholesale trader" },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Seeding CrimeIntel demo dataset…");

  // --- Users ---
  for (const u of demoUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, role: u.role, status: "ACTIVE" },
      create: { email: u.email, name: u.name, passwordHash, role: u.role, status: "ACTIVE" },
    });
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@crimeintel.demo" } });
  const investigator = await prisma.user.findUniqueOrThrow({ where: { email: "investigator@crimeintel.demo" } });
  console.log("  ✓ users");

  // --- Clean existing domain data (idempotent re-seed) ---
  await prisma.pattern.deleteMany();
  await prisma.aIAlert.deleteMany();
  await prisma.extractionCandidate.deleteMany();
  await prisma.blockchainRecord.deleteMany();
  await prisma.evidenceVerification.deleteMany();
  await prisma.evidenceDocument.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.entityMatch.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.caseNote.deleteMany();
  await prisma.caseActivity.deleteMany();
  await prisma.investigationCase.deleteMany();

  // --- Cases ---
  const caseById: Record<string, string> = {};
  const today = new Date("2026-03-20T10:00:00.000Z");
  for (const c of caseDefs) {
    const created = new Date(today.getTime() - c.daysAgo * 24 * 3600 * 1000);
    const createdCase = await prisma.investigationCase.create({
      data: {
        caseId: c.caseId,
        title: c.title,
        description: c.description,
        status: c.status,
        classification: c.classification,
        assignedInvestigator: c.assignedInvestigator,
        createdById: investigator.id,
        createdAt: created,
        updatedAt: created,
      },
    });
    caseById[c.caseId] = createdCase.id;
    // Activity + note for each case.
    await prisma.caseActivity.create({
      data: { caseId: createdCase.id, action: "CASE_CREATED", detail: "Case docket opened", actor: c.assignedInvestigator, createdAt: created },
    });
    await prisma.caseNote.create({
      data: { caseId: createdCase.id, body: "Initial assessment: review entity links and communication records. Fictional demo data.", author: c.assignedInvestigator, authorId: investigator.id, createdAt: created },
    });
  }
  console.log("  ✓ cases");

  // --- Entities ---
  const entityId: Record<string, string> = {};
  let entityIdx = 0;
  async function addEntity(type: string, name: string, value: string | null, caseKey?: string, aliases?: string[]) {
    const e = await prisma.entity.create({
      data: {
        type,
        name,
        value,
        aliases: aliases ? JSON.stringify(aliases) : null,
        caseId: caseKey ? caseById[caseKey] : undefined,
      },
    });
    entityId[name] = e.id;
    entityIdx++;
    return e;
  }

  for (const p of persons) await addEntity("PERSON", p.name, p.value, "CR-2026-1042", p.name === "Rahul Kumar" ? ["R. Kumar", "Rahul K."] : undefined);
  for (const ph of phones) await addEntity("PHONE", ph.name, ph.value);
  for (const v of vehicles) await addEntity("VEHICLE", v.name, v.value);
  for (const l of locations) await addEntity("LOCATION", l.name, l.value);
  for (const o of organizations) await addEntity("ORGANIZATION", o.name, o.value, "CR-2026-1042");
  console.log(`  ✓ ${entityIdx} entities`);

  // --- Entity matches (duplicates) ---
  const matchDefs = [
    { a: "Rahul Kumar", b: "R. Kumar", confidence: 87, reasons: ["Similar name", "Same phone number", "Same location"] },
    { a: "Amit Sharma", b: "R. Kumar", confidence: 41, reasons: ["Shared location only"] },
  ];
  for (const m of matchDefs) {
    await prisma.entityMatch.create({
      data: { entityAId: entityId[m.a], entityBId: entityId[m.b], confidence: m.confidence, reasons: JSON.stringify(m.reasons) },
    });
  }
  console.log("  ✓ entity matches");

  // --- Relationships (graph edges) ---
  const relDefs: {
    type: string; a: string; b: string; strength: number; count: number;
    label?: string; records?: string[]; caseKey?: string;
  }[] = [
    // Communication edges
    { type: "COMMUNICATION", a: "Rahul Kumar", b: "Amit Sharma", strength: 88, count: 12, records: ["Communication_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "COMMUNICATION", a: "Amit Sharma", b: "Priya Singh", strength: 71, count: 7, records: ["Communication_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "COMMUNICATION", a: "Priya Singh", b: "Kavita Nair", strength: 64, count: 5, records: ["Communication_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "COMMUNICATION", a: "Rahul Kumar", b: "Kavita Nair", strength: 52, count: 4, records: ["Communication_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "COMMUNICATION", a: "Suresh Verma", b: "Arjun Mehta", strength: 82, count: 9, records: ["Communication_Record_filtered.csv"], caseKey: "CR-2026-1051" },
    { type: "COMMUNICATION", a: "Arjun Mehta", b: "Vikram Rao", strength: 66, count: 6, records: ["Communication_Record_filtered.csv"], caseKey: "CR-2026-1051" },
    { type: "COMMUNICATION", a: "Amit Sharma", b: "R. Kumar", strength: 74, count: 8, records: ["Communication_Record_archive.csv"], caseKey: "CR-2026-1033" },
    { type: "COMMUNICATION", a: "Amit Sharma", b: "Skyline Traders", strength: 40, count: 2, records: ["Communication_Record_archive.csv"], caseKey: "CR-2026-1033" },

    // Ownership edges (person -> phone/vehicle/org)
    { type: "OWNERSHIP", a: "Rahul Kumar", b: "9876512345", strength: 90, count: 1, records: ["Subscriber_Registry"], caseKey: "CR-2026-1042" },
    { type: "OWNERSHIP", a: "Amit Sharma", b: "9822013345", strength: 90, count: 1, records: ["Subscriber_Registry"], caseKey: "CR-2026-1042" },
    { type: "OWNERSHIP", a: "Suresh Verma", b: "9988776655", strength: 88, count: 1, records: ["Subscriber_Registry"], caseKey: "CR-2026-1051" },
    { type: "OWNERSHIP", a: "Priya Singh", b: "9811223344", strength: 85, count: 1, records: ["Subscriber_Registry"], caseKey: "CR-2026-1042" },
    { type: "OWNERSHIP", a: "Rahul Kumar", b: "DL01AB1234", strength: 92, count: 1, records: ["Vehicle_Registry.csv"], caseKey: "CR-2026-1042" },
    { type: "OWNERSHIP", a: "Arjun Mehta", b: "KA05XY6789", strength: 86, count: 1, records: ["Vehicle_Registry.csv"], caseKey: "CR-2026-1051" },
    { type: "OWNERSHIP", a: "Rahul Kumar", b: "ABC Logistics", strength: 80, count: 1, records: ["Company_Registry"], caseKey: "CR-2026-1042" },
    { type: "OWNERSHIP", a: "Arjun Mehta", b: "Mehta Imports", strength: 84, count: 1, records: ["Company_Registry"], caseKey: "CR-2026-1051" },
    { type: "OWNERSHIP", a: "Rahul Kumar", b: "MH12CD5678", strength: 70, count: 1, records: ["Vehicle_Registry.csv"], caseKey: "CR-2026-1042" },

    // Location edges
    { type: "LOCATION", a: "Rahul Kumar", b: "Sector 18", strength: 82, count: 8, records: ["Location_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "LOCATION", a: "Amit Sharma", b: "Sector 18", strength: 60, count: 5, records: ["Location_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "LOCATION", a: "Amit Sharma", b: "Central Market", strength: 70, count: 6, records: ["Location_Record.csv"], caseKey: "CR-2026-1033" },
    { type: "LOCATION", a: "R. Kumar", b: "Central Market", strength: 74, count: 7, records: ["Location_Record_archive.csv"], caseKey: "CR-2026-1033" },
    { type: "LOCATION", a: "Suresh Verma", b: "Industrial Area", strength: 78, count: 9, records: ["Location_Record.csv"], caseKey: "CR-2026-1051" },
    { type: "LOCATION", a: "Arjun Mehta", b: "Industrial Area", strength: 68, count: 6, records: ["Location_Record.csv"], caseKey: "CR-2026-1051" },
    { type: "LOCATION", a: "Kavita Nair", b: "Vasant Vihar", strength: 55, count: 3, records: ["Location_Record.csv"], caseKey: "CR-2026-1042" },
    { type: "LOCATION", a: "Arjun Mehta", b: "Nehru Place", strength: 50, count: 4, records: ["Location_Record.csv"], caseKey: "CR-2026-1051" },
    { type: "LOCATION", a: "DL01AB1234", b: "Sector 18", strength: 76, count: 9, records: ["Vehicle_Movement_Log.csv"], caseKey: "CR-2026-1042" },
    { type: "LOCATION", a: "DL01AB1234", b: "Industrial Area", strength: 62, count: 6, records: ["Vehicle_Movement_Log.csv"], caseKey: "CR-2026-1042" },
    { type: "LOCATION", a: "KA05XY6789", b: "Industrial Area", strength: 58, count: 5, records: ["Vehicle_Movement_Log.csv"], caseKey: "CR-2026-1051" },

    // Financial / transaction edges
    { type: "FINANCIAL", a: "Amit Sharma", b: "Rahul Kumar", strength: 66, count: 3, records: ["Transaction_Record"], caseKey: "CR-2026-1042" },
    { type: "FINANCIAL", a: "Skyline Traders", b: "Amit Sharma", strength: 60, count: 4, records: ["Transaction_Record"], caseKey: "CR-2026-1033" },
    { type: "FINANCIAL", a: "Suresh Verma", b: "Arjun Mehta", strength: 72, count: 5, records: ["Transaction_Record"], caseKey: "CR-2026-1051" },
    { type: "FINANCIAL", a: "Rahul Kumar", b: "Suresh Verma", strength: 54, count: 2, records: ["Transaction_Record"], caseKey: "CR-2026-1042" },

    // Case links (cross-case)
    { type: "CASE", a: "Rahul Kumar", b: "Amit Sharma", strength: 40, count: 1, records: ["Case_Registry"], caseKey: "CR-2026-1033" },
  ];

  for (const r of relDefs) {
    await prisma.relationship.create({
      data: {
        type: r.type,
        label: r.label ?? r.type.toLowerCase(),
        sourceId: entityId[r.a],
        targetId: entityId[r.b],
        strength: r.strength,
        count: r.count,
        records: r.records ? JSON.stringify(r.records) : null,
        caseId: r.caseKey ? caseById[r.caseKey] : undefined,
      },
    });
  }
  console.log(`  ✓ relationships`);
  const relCount = relDefs.length;

  // --- Timeline events ---
  const eventDefs = [
    { type: "COMMUNICATION", summary: "Call between Amit Sharma and Rahul Kumar", detail: "Duration 6m 12s — 9822013345 → 9876512345", entity: "Rahul Kumar", caseKey: "CR-2026-1042", day: 30 },
    { type: "COMMUNICATION", summary: "Call between Rahul Kumar and Kavita Nair", detail: "Duration 2m 41s", entity: "Rahul Kumar", caseKey: "CR-2026-1042", day: 28 },
    { type: "VISIT", summary: "Amit Sharma visited Sector 18", detail: "Observed near ABC Logistics facility", entity: "Amit Sharma", caseKey: "CR-2026-1042", day: 25 },
    { type: "FINANCIAL", summary: "Transaction: Skyline Traders → Amit Sharma", detail: "₹ 80,000 — bank transfer", entity: "Amit Sharma", caseKey: "CR-2026-1033", day: 22 },
    { type: "VEHICLE", summary: "Vehicle DL01AB1234 detected at Sector 18", detail: "Toll + ANPR log match", entity: "DL01AB1234", caseKey: "CR-2026-1042", day: 20 },
    { type: "COMMUNICATION", summary: "Call between Amit Sharma and R. Kumar", detail: "Duration 4m 05s", entity: "R. Kumar", caseKey: "CR-2026-1033", day: 18 },
    { type: "VISIT", summary: "Suresh Verma visited Industrial Area", detail: "Warehouse B site", entity: "Suresh Verma", caseKey: "CR-2026-1051", day: 15 },
    { type: "FINANCIAL", summary: "Transaction: Suresh Verma → Arjun Mehta", detail: "₹ 1,20,000 — RTGS", entity: "Suresh Verma", caseKey: "CR-2026-1051", day: 12 },
    { type: "VEHICLE", summary: "Vehicle KA05XY6789 detected at Industrial Area", detail: "Observed at loading bay", entity: "KA05XY6789", caseKey: "CR-2026-1051", day: 9 },
    { type: "COMMUNICATION", summary: "Call between Amit Sharma and Priya Singh", detail: "Duration 3m 30s — evening cluster", entity: "Amit Sharma", caseKey: "CR-2026-1042", day: 5 },
    { type: "LOCATION", summary: "Co-location: Rahul Kumar + Amit Sharma at Sector 18", detail: "Both present in same hour", entity: "Rahul Kumar", caseKey: "CR-2026-1042", day: 3 },
    { type: "FINANCIAL", summary: "Transaction: Amit Sharma → Rahul Kumar", detail: "₹ 45,000 — UPI", entity: "Rahul Kumar", caseKey: "CR-2026-1042", day: 1 },
    { type: "COMMUNICATION", summary: "Call between Priya Singh and Kavita Nair", detail: "Duration 1m 55s", entity: "Priya Singh", caseKey: "CR-2026-1042", day: 0 },
    { type: "VISIT", summary: "Kavita Nair visited Vasant Vihar", detail: "Residential premise", entity: "Kavita Nair", caseKey: "CR-2026-1042", day: 0 },
  ];

  for (const ev of eventDefs) {
    const eventAt = new Date(today.getTime() - ev.day * 24 * 3600 * 1000);
    await prisma.timelineEvent.create({
      data: {
        type: ev.type,
        summary: ev.summary,
        detail: ev.detail,
        eventAt,
        entityId: entityId[ev.entity],
        caseId: caseById[ev.caseKey],
      },
    });
  }
  console.log("  ✓ timeline events");

  // --- Evidence documents + blockchain records ---
  // Chain the blocks properly: genesis -> evidence blocks.
  const genesisBlock = {
    index: 0,
    timestamp: genesisTimestamp(),
    dataHash: genesisDataHash(),
    previousHash: "0".repeat(64),
    hash: "",
    action: "GENESIS",
    note: "CrimeIntel prototype ledger genesis block",
  };
  genesisBlock.hash = hashBlock(genesisBlock);

  const evdDefs = [
    { name: "FIR_1024.pdf", caseKey: "CR-2026-1042", desc: "First Information Report (fictional)" },
    { name: "Communication_Record.csv", caseKey: "CR-2026-1042", desc: "Call detail records (fictional)" },
    { name: "Transaction_Record.csv", caseKey: "CR-2026-1042", desc: "Financial transaction log (fictional)" },
    { name: "Location_Record.csv", caseKey: "CR-2026-1042", desc: "Geo-location observations (fictional)" },
    { name: "Vehicle_Movement_Log.xlsx", caseKey: "CR-2026-1042", desc: "ANPR / toll movement log (fictional)" },
    { name: "Assessment_Report.pdf", caseKey: "CR-2026-1051", desc: "Analyst assessment (fictional)" },
  ];

  let blockIndex = 1;
  for (const d of evdDefs) {
    const content = evidenceContent(d.name, d.caseKey);
    const dataHash = sha256(content);
    const doc = await prisma.evidenceDocument.create({
      data: {
        name: d.name,
        description: d.desc,
        contentType: d.name.endsWith(".csv") ? "text/csv" : d.name.endsWith(".xlsx") ? "application/vnd.ms-excel" : "application/pdf",
        sizeBytes: content.length * 2,
        sha256: dataHash,
        caseId: caseById[d.caseKey],
        uploadedById: investigator.id,
      },
    });
    // Create a chained block.
    const prev = await prisma.blockchainRecord.findFirst({ orderBy: { index: "desc" } });
    const prevHash = prev ? prev.hash : genesisBlock.hash;
    const blk: { index: number; timestamp: Date; dataHash: string; previousHash: string; action: string; note: string } = {
      index: blockIndex,
      timestamp: new Date(today.getTime() - 15 * 24 * 3600 * 1000),
      dataHash,
      previousHash: prevHash,
      action: "EVIDENCE_HASH",
      note: `Notarized ${d.name} (${d.caseKey})`,
    };
    const hash = hashBlock(blk);
    await prisma.blockchainRecord.create({
      data: { ...blk, hash, evidenceId: doc.id },
    });
    blockIndex++;
  }
  console.log("  ✓ evidence + blockchain");

  // --- AI patterns ---
  const patternDefs = [
    {
      type: "REPEATED_COMMUNICATION",
      title: "Frequent communication: Rahul Kumar ↔ Amit Sharma",
      summary: "12 recorded communication events between Rahul Kumar and Amit Sharma across the window. Elevated contact frequency warrants review.",
      severity: "HIGH",
      entityNames: ["Rahul Kumar", "Amit Sharma"],
      reasons: ["12 communication records", "Contact frequency elevated relative to baseline"],
      evidence: ["Communication_Record.csv"],
      relevance: 84,
    },
    {
      type: "REPEATED_LOCATION",
      title: "Repeated co-location at Sector 18",
      summary: "Rahul Kumar, Amit Sharma and vehicle DL01AB1234 have each been independently associated with Sector 18. May indicate a shared operational location.",
      severity: "MEDIUM",
      entityNames: ["Rahul Kumar", "Amit Sharma", "DL01AB1234"],
      reasons: ["3 distinct entities linked to the same location", "Overlapping presence periods"],
      evidence: ["Location_Record.csv", "Vehicle_Movement_Log.xlsx"],
      relevance: 78,
    },
    {
      type: "TRANSACTION_CHAIN",
      title: "Transaction chain: Skyline Traders → Amit Sharma → Rahul Kumar",
      summary: "A chain of financial transfers links Skyline Traders, Amit Sharma and Rahul Kumar. Funds movement across entities warrants financial review.",
      severity: "HIGH",
      entityNames: ["Skyline Traders", "Amit Sharma", "Rahul Kumar"],
      reasons: ["Multiple linked transfers form a connected chain", "Recipients overlap with flagged individuals"],
      evidence: ["Transaction_Record.csv"],
      relevance: 81,
    },
    {
      type: "SHARED_VEHICLE",
      title: "Shared vehicle DL01AB1234",
      summary: "Rahul Kumar and Amit Sharma have each been linked to vehicle DL01AB1234. Shared transport usage is a potentially significant pattern.",
      severity: "MEDIUM",
      entityNames: ["DL01AB1234", "Rahul Kumar", "Amit Sharma"],
      reasons: ["Multiple individuals associated with one vehicle", "Vehicle appears in related cases"],
      evidence: ["Vehicle_Registry.csv"],
      relevance: 72,
    },
    {
      type: "CROSS_CASE",
      title: "Cross-case entity: Rahul Kumar / R. Kumar",
      summary: "Rahul Kumar and R. Kumar appear across CR-2026-1042 and CR-2026-1033. Possible duplicate entity — confirm before merging.",
      severity: "MEDIUM",
      entityNames: ["Rahul Kumar", "R. Kumar"],
      reasons: ["Similar name", "Same phone number", "Same location"],
      evidence: ["Case_Registry", "Communication_Record_archive.csv"],
      relevance: 80,
    },
  ];

  for (const p of patternDefs) {
    await prisma.pattern.create({
      data: {
        type: p.type,
        title: p.title,
        summary: p.summary,
        severity: p.severity,
        entities: JSON.stringify(p.entityNames),
        reasons: JSON.stringify(p.reasons),
        evidence: JSON.stringify(p.evidence),
        relevance: p.relevance,
        createdAt: new Date(today.getTime() - 5 * 24 * 3600 * 1000),
      },
    });
  }
  console.log("  ✓ ai patterns");

  // --- AI alerts ---
  const alertDefs = [
    { type: "NEW_RELATIONSHIP", severity: "HIGH", message: "New relationship detected: Amit Sharma ↔ Priya Singh", detail: "7 communication records observed" },
    { type: "CROSS_CASE_MATCH", severity: "MEDIUM", message: "Cross-case entity match: Rahul Kumar ↔ R. Kumar", detail: "87% match confidence" },
    { type: "REPEATED_LOCATION", severity: "MEDIUM", message: "Repeated location detected: Sector 18", detail: "Multiple independent associations" },
    { type: "PATTERN", severity: "HIGH", message: "Transaction chain detected involving Amit Sharma", detail: "Potential funds movement — requires verification" },
  ];
  for (const a of alertDefs) {
    await prisma.aIAlert.create({
      data: { ...a, createdAt: new Date(today.getTime() - 3 * 24 * 3600 * 1000) },
    });
  }
  console.log("  ✓ ai alerts");

  // --- Security seed ---
  const existingAttempt = await prisma.loginAttempt.findFirst({ where: { userId: admin.id } });
  if (!existingAttempt) {
    await prisma.loginAttempt.createMany({
      data: [
        { email: admin.email, userId: admin.id, success: true, ip: "127.0.0.1", userAgent: "Demo seed" },
        { email: "unknown@crimeintel.demo", success: false, ip: "203.0.113.7", userAgent: "Seed attempt", reason: "invalid credentials" },
      ],
    });
  }
  await prisma.securityAlert.create({
    data: {
      userId: admin.id,
      severity: "LOW",
      type: "RULE",
      message: "Prototype integrity module initialized",
      detail: "Blockchain ledger seeded with genesis block and 6 evidence notarizations.",
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_COMPLETE",
      detail: `Demo dataset seeded: ${caseById ? 3 : 0} cases, ${entityIdx} entities, ${relCount} relationships.`,
      ip: "127.0.0.1",
      status: "SUCCESS",
    },
  });
  console.log("  ✓ security seed");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
