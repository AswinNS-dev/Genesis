import json
from datetime import datetime, timedelta
from backend.app.database import SessionLocal, init_db
from backend.app.database.models import (
    User, SecurityAlert, AuditLog,
    InvestigationCase, CaseNote, CaseActivity,
    Entity, EntityMatch, Relationship, TimelineEvent,
    EvidenceDocument, BlockchainRecord, EvidenceVerification,
    ExtractionCandidate, Pattern, AIAlert,
    Dataset, DatasetRecord, DatasetEntity
)
from backend.app.security import get_password_hash
from backend.app.blockchain import genesis_data_hash, genesis_timestamp, sha256
from backend.app.blockchain.hashing import compute_block_hash as hash_block

def evidence_content(name: str, case_id: str) -> bytes:
    return f"Forensic Evidence Document: {name} | Docket: {case_id}".encode("utf-8")

def seed_database():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()

    # Clear existing data
    print("Clearing existing data...")
    db.query(DatasetEntity).delete()
    db.query(DatasetRecord).delete()
    db.query(Dataset).delete()
    db.query(ExtractionCandidate).delete()
    db.query(Pattern).delete()
    db.query(AIAlert).delete()
    db.query(TimelineEvent).delete()
    db.query(Relationship).delete()
    db.query(EntityMatch).delete()
    db.query(Entity).delete()
    db.query(EvidenceVerification).delete()
    db.query(BlockchainRecord).delete()
    db.query(EvidenceDocument).delete()
    db.query(CaseActivity).delete()
    db.query(CaseNote).delete()
    db.query(InvestigationCase).delete()
    db.query(AuditLog).delete()
    db.query(SecurityAlert).delete()
    db.query(User).delete()
    db.commit()

    print("Seeding Users...")
    users = [
        User(
            email="admin@crimeintel.demo",
            name="Vikramaditya Rathore (Admin)",
            passwordHash=get_password_hash("Admin@1234"),
            role="ADMIN",
            status="ACTIVE",
        ),
        User(
            email="investigator@crimeintel.demo",
            name="ACP Sameer Sen (Lead Investigator)",
            passwordHash=get_password_hash("Inv3stigator!"),
            role="INVESTIGATOR",
            status="ACTIVE",
        ),
        User(
            email="analyst@crimeintel.demo",
            name="Dr. Ananya Roy (Senior Analyst)",
            passwordHash=get_password_hash("An@lyst2024"),
            role="ANALYST",
            status="ACTIVE",
        ),
        User(
            email="viewer@crimeintel.demo",
            name="Inspector Neha Joshi (Observer)",
            passwordHash=get_password_hash("V1ewer_Only"),
            role="VIEWER",
            status="ACTIVE",
        ),
    ]
    for u in users:
        db.add(u)
    db.commit()

    admin_user = users[0]
    inv_user = users[1]

    print("Seeding Investigation Cases...")
    cases = [
        InvestigationCase(
            caseId="CR-2026-1042",
            title="Operation Silverline — Illegal Cargo & Hawala Network",
            description="Multi-jurisdiction investigation into coordinated unauthorized cargo movements and shell company transfers across northern logistics hubs.",
            status="OPEN",
            classification="SECRET",
            category="Financial Fraud",
            caseSource="Surveillance",
            incidentDate=datetime.utcnow() - timedelta(days=45),
            jurisdiction="Northern Zone — Sector 18",
            assignedInvestigator=inv_user.name,
            createdById=inv_user.id,
        ),
        InvestigationCase(
            caseId="CR-2026-0891",
            title="Operation Crosswire — Counterfeit Pharmaceuticals & Bulk SMS Smuggling",
            description="Supply chain infiltration involving unverified active pharmaceutical ingredients and automated spoofed dispatch notifications.",
            status="OPEN",
            classification="RESTRICTED",
            category="Counterfeit & Cyber",
            caseSource="Citizen Tip",
            incidentDate=datetime.utcnow() - timedelta(days=90),
            jurisdiction="Western Industrial Corridor",
            assignedInvestigator=inv_user.name,
            createdById=inv_user.id,
        ),
        InvestigationCase(
            caseId="CR-2026-1105",
            title="Operation Falcon — Coordinated Luxury Vehicle Thefts",
            description="Interstate ring altering chassis numbers and exporting high-end SUVs using fake registration paperwork.",
            status="CLOSED",
            classification="OPEN",
            category="Organized Theft",
            caseSource="Referral",
            incidentDate=datetime.utcnow() - timedelta(days=120),
            jurisdiction="National Capital Region",
            assignedInvestigator="Insp. K. Malhotra",
            createdById=admin_user.id,
        ),
    ]
    for c in cases:
        db.add(c)
    db.commit()

    c1, c2, c3 = cases[0], cases[1], cases[2]

    print("Seeding Case Notes & Activities...")
    db.add(CaseNote(caseId=c1.id, body="Initial intelligence report corroborated by field team in Sector 18.", author=inv_user.name, authorId=inv_user.id))
    db.add(CaseNote(caseId=c1.id, body="Subpoena served to ABC Logistics for transit manifests from Jan 10 to Feb 28.", author=inv_user.name, authorId=inv_user.id))
    db.add(CaseActivity(caseId=c1.id, action="SURVEILLANCE_LOGGED", detail="Target vehicle DL01AB1234 spotted near Central Market warehouse.", actor=inv_user.name))
    db.add(CaseActivity(caseId=c1.id, action="EVIDENCE_ATTACHED", detail="Bank ledger statements Exhibit-A added to docket.", actor=inv_user.name))
    db.commit()

    print("Seeding Entities...")
    entities = [
        Entity(name="Rahul Kumar", type="PERSON", aliases=json.dumps(["R. Kumar", "Rocky", "RK Logistics"]), riskScore=85, caseId=c1.id),
        Entity(name="Amit Sharma", type="PERSON", aliases=json.dumps(["A. Sharma", "Pandit"]), riskScore=70, caseId=c1.id),
        Entity(name="Suresh Verma", type="PERSON", aliases=json.dumps(["Verma Ji"]), riskScore=60, caseId=c1.id),
        Entity(name="Priya Singh", type="PERSON", aliases=json.dumps(["P. Singh"]), riskScore=45, caseId=c2.id),
        Entity(name="Arjun Mehta", type="PERSON", aliases=json.dumps(["A. Mehta", "Trader Arjun"]), riskScore=80, caseId=c2.id),
        
        Entity(name="+91 98765 12345", type="PHONE", value="9876512345", riskScore=80, caseId=c1.id),
        Entity(name="+91 98220 13345", type="PHONE", value="9822013345", riskScore=65, caseId=c1.id),
        Entity(name="+91 99887 76655", type="PHONE", value="9988776655", riskScore=50, caseId=c2.id),
        
        Entity(name="DL 01 AB 1234", type="VEHICLE", value="DL01AB1234", riskScore=75, caseId=c1.id),
        Entity(name="KA 05 XY 6789", type="VEHICLE", value="KA05XY6789", riskScore=60, caseId=c3.id),
        
        Entity(name="Sector 18 Warehouse", type="LOCATION", value="Sector 18", riskScore=70, caseId=c1.id),
        Entity(name="Central Market Hub", type="LOCATION", value="Central Market", riskScore=65, caseId=c1.id),
        Entity(name="Industrial Area Phase 2", type="LOCATION", value="Industrial Area", riskScore=55, caseId=c2.id),
        
        Entity(name="ABC Logistics Pvt Ltd", type="ORGANIZATION", riskScore=90, caseId=c1.id),
        Entity(name="Sharma Pharma Exports", type="ORGANIZATION", riskScore=75, caseId=c2.id),
        Entity(name="Mehta Global Trading", type="ORGANIZATION", riskScore=85, caseId=c1.id),

        Entity(name="A/C #9982-1002-441", type="BANK_ACCOUNT", value="99821002441", riskScore=85, caseId=c1.id),
        Entity(name="TXN-2026-99014", type="TRANSACTION", value="₹ 4,50,000", riskScore=80, caseId=c1.id),
    ]
    for e in entities:
        db.add(e)
    db.commit()

    e_rahul, e_amit, e_suresh, e_priya, e_arjun = entities[0], entities[1], entities[2], entities[3], entities[4]
    e_p1, e_p2, e_p3 = entities[5], entities[6], entities[7]
    e_v1, e_v2 = entities[8], entities[9]
    e_l1, e_l2, e_l3 = entities[10], entities[11], entities[12]
    e_org1, e_org2, e_org3 = entities[13], entities[14], entities[15]
    e_acc, e_txn = entities[16], entities[17]

    print("Seeding Relationships...")
    relationships = [
        Relationship(sourceId=e_rahul.id, targetId=e_p1.id, type="COMMUNICATION", label="Registered Subscriber", strength=90, count=45, caseId=c1.id),
        Relationship(sourceId=e_amit.id, targetId=e_p2.id, type="COMMUNICATION", label="Registered Subscriber", strength=85, count=38, caseId=c1.id),
        Relationship(sourceId=e_p1.id, targetId=e_p2.id, type="COMMUNICATION", label="42 Outgoing Calls recorded (Late Night)", strength=92, count=42, caseId=c1.id),
        Relationship(sourceId=e_rahul.id, targetId=e_v1.id, type="TRANSPORT", label="Frequent Driver & Toll Tag", strength=80, count=14, caseId=c1.id),
        Relationship(sourceId=e_amit.id, targetId=e_v1.id, type="TRANSPORT", label="Secondary Driver Toll Match", strength=70, count=8, caseId=c1.id),
        Relationship(sourceId=e_rahul.id, targetId=e_org1.id, type="CASE", label="Beneficial Director / Founder", strength=95, count=1, caseId=c1.id),
        Relationship(sourceId=e_org1.id, targetId=e_l1.id, type="LOCATION", label="Registered Storage Depot", strength=88, count=12, caseId=c1.id),
        Relationship(sourceId=e_org1.id, targetId=e_acc.id, type="FINANCIAL", label="Primary Operating Account", strength=95, count=1, caseId=c1.id),
        Relationship(sourceId=e_acc.id, targetId=e_txn.id, type="TRANSACTION", label="Originating Transfer: ₹ 4,50,000", strength=90, count=1, caseId=c1.id),
        Relationship(sourceId=e_txn.id, targetId=e_org3.id, type="FINANCIAL", label="Beneficiary Entity", strength=85, count=1, caseId=c1.id),
        Relationship(sourceId=e_arjun.id, targetId=e_org3.id, type="CASE", label="Authorized Signatory", strength=90, count=1, caseId=c1.id),
        Relationship(sourceId=e_priya.id, targetId=e_org2.id, type="CASE", label="Quality Assurance Lead", strength=75, count=1, caseId=c2.id),
        Relationship(sourceId=e_suresh.id, targetId=e_l2.id, type="LOCATION", label="Warehouse Coordinator", strength=65, count=6, caseId=c1.id),
    ]
    for r in relationships:
        db.add(r)
    db.commit()

    print("Seeding Entity Matches...")
    matches = [
        EntityMatch(
            entityAId=e_rahul.id,
            entityBId=e_suresh.id,
            confidence=78,
            reasons=json.dumps(["Shared vehicle utilization (DL01AB1234)", "Co-located at Sector 18 warehouse"]),
            status="PENDING",
        ),
        EntityMatch(
            entityAId=e_org1.id,
            entityBId=e_org3.id,
            confidence=89,
            reasons=json.dumps(["Direct transaction chain A/C 9982", "Common freight forwarder"]),
            status="CONFIRMED",
        )
    ]
    for m in matches:
        db.add(m)
    db.commit()

    print("Seeding Timeline Events...")
    base_time = datetime.utcnow() - timedelta(days=30)
    timeline_events = [
        TimelineEvent(type="COMMUNICATION", summary="First high-frequency call burst between target numbers", detail="32 calls within 4 hours recorded", eventAt=base_time + timedelta(days=2), entityId=e_p1.id, caseId=c1.id),
        TimelineEvent(type="LOCATION", summary="DL01AB1234 scanned at Sector 18 Toll Plaza", detail="Automatic number plate recognition match at 02:41 AM", eventAt=base_time + timedelta(days=8), entityId=e_v1.id, caseId=c1.id),
        TimelineEvent(type="FINANCIAL", summary="Wire transfer of ₹ 4,50,000 cleared to Mehta Trading", detail="Ref TXN-2026-99014 from ABC Logistics", eventAt=base_time + timedelta(days=14), entityId=e_txn.id, caseId=c1.id),
        TimelineEvent(type="VISIT", summary="Surveillance visual: Subject meeting at Central Market cafe", detail="Visual match confirmed by field unit", eventAt=base_time + timedelta(days=20), entityId=e_rahul.id, caseId=c1.id),
    ]
    for ev in timeline_events:
        db.add(ev)
    db.commit()

    print("Seeding Evidence & Blockchain Ledger...")
    # Genesis block
    gen_hash = genesis_data_hash()
    gen_ts = genesis_timestamp()
    b0_hash = hash_block(0, gen_ts, gen_hash, "0" * 64, "GENESIS")
    b0 = BlockchainRecord(
        index=0,
        timestamp=gen_ts,
        dataHash=gen_hash,
        previousHash="0" * 64,
        hash=b0_hash,
        action="GENESIS",
        note="CrimeIntel Genesis Ledger Block",
    )
    db.add(b0)
    db.flush()

    # Evidence doc 1
    d1_content = evidence_content("CDR_Analysis_Jan2026.pdf", c1.caseId)
    d1_hash = sha256(d1_content)
    d1 = EvidenceDocument(
        name="CDR_Analysis_Jan2026.pdf",
        description="Call detail records and cell tower triangulation for primary targets",
        contentType="application/pdf",
        sizeBytes=142800,
        sha256=d1_hash,
        verified=True,
        verifiedAt=datetime.utcnow(),
        status="ACTIVE",
        caseId=c1.id,
        uploadedById=inv_user.id,
    )
    db.add(d1)
    db.flush()

    b1_ts = datetime.utcnow() - timedelta(days=25)
    b1_hash = hash_block(1, b1_ts, d1_hash, b0_hash, "EVIDENCE_HASH")
    b1 = BlockchainRecord(
        index=1,
        timestamp=b1_ts,
        dataHash=d1_hash,
        previousHash=b0_hash,
        hash=b1_hash,
        action="EVIDENCE_HASH",
        note="CDR Analysis document notarized for Operation Silverline",
        evidenceId=d1.id,
    )
    db.add(b1)

    # Evidence doc 2
    d2_content = evidence_content("Bank_Statement_ABC_Logistics.pdf", c1.caseId)
    d2_hash = sha256(d2_content)
    d2 = EvidenceDocument(
        name="Bank_Statement_ABC_Logistics.pdf",
        description="Official certified transaction ledger for Account #9982-1002-441",
        contentType="application/pdf",
        sizeBytes=356000,
        sha256=d2_hash,
        verified=True,
        verifiedAt=datetime.utcnow(),
        status="ACTIVE",
        caseId=c1.id,
        uploadedById=inv_user.id,
    )
    db.add(d2)
    db.flush()

    b2_ts = datetime.utcnow() - timedelta(days=15)
    b2_hash = hash_block(2, b2_ts, d2_hash, b1_hash, "EVIDENCE_HASH")
    b2 = BlockchainRecord(
        index=2,
        timestamp=b2_ts,
        dataHash=d2_hash,
        previousHash=b1_hash,
        hash=b2_hash,
        action="EVIDENCE_HASH",
        note="Certified Bank Statement notarized to immutable ledger",
        evidenceId=d2.id,
    )
    db.add(b2)
    db.commit()

    print("Seeding AI Patterns & Alerts...")
    patterns = [
        Pattern(
            type="REPEATED_LOCATION",
            title="Multiple subjects co-located at Sector 18 Warehouse",
            summary="Rahul Kumar, Amit Sharma, and Suresh Verma were independently recorded at Sector 18 across multiple dates in January.",
            severity="HIGH",
            entities=json.dumps(["Rahul Kumar", "Amit Sharma", "Suresh Verma"]),
            reasons=json.dumps(["Toll scans match within 30 min window", "Cell tower overlap #18-A"]),
            evidence=json.dumps(["Exhibit #01 - CDR Report", "Exhibit #03 - Toll Logs"]),
            relevance=92,
        ),
        Pattern(
            type="TRANSACTION_CHAIN",
            title="Layered fund transfers via ABC Logistics to Mehta Trading",
            summary="Rapid pass-through transaction of ₹ 4,50,000 with matching date stamps across correspondent accounts.",
            severity="HIGH",
            entities=json.dumps(["ABC Logistics Pvt Ltd", "Mehta Global Trading"]),
            reasons=json.dumps(["Transaction amount symmetry", "Time delta under 2 hours"]),
            evidence=json.dumps(["Exhibit #02 - Bank Statements"]),
            relevance=88,
        ),
    ]
    for p in patterns:
        db.add(p)

    alerts = [
        AIAlert(
            type="NEW_RELATIONSHIP",
            severity="MEDIUM",
            message="New cross-case financial link detected between Operation Silverline and Operation Crosswire.",
            detail="Account #9982-1002-441 surfaced in both investigation case files.",
        ),
        AIAlert(
            type="PATTERN",
            severity="HIGH",
            message="Coordinated movement detected: Vehicle DL01AB1234 active in vicinity of Central Market.",
            detail="Toll plaza sensor alert triggered at 02:41 AM.",
        ),
    ]
    for a in alerts:
        db.add(a)

    print("Seeding Datasets...")
    dataset = Dataset(
        name="CDR_Transit_Batch_Jan2026.csv",
        sourceType="CSV",
        fileName="CDR_Transit_Batch_Jan2026.csv",
        status="READY",
        recordCount=3,
        analysisScope="COMBINED",
        createdById=inv_user.id,
        caseId=c1.id,
    )
    db.add(dataset)
    db.flush()

    d_records = [
        DatasetRecord(
            datasetId=dataset.id,
            rowIndex=0,
            raw=json.dumps({"caller": "9876512345", "receiver": "9822013345", "duration": "320", "location": "Sector 18"}),
            normalized=json.dumps({"caller": "9876512345", "receiver": "9822013345", "duration": "320", "location": "Sector 18"}),
            matchStatus="MERGED",
            matchConfidence=95,
            matchReasons=json.dumps(["Matched Subscriber: Rahul Kumar"]),
            matchCandidateId=e_rahul.id,
            mergedEntityId=e_rahul.id,
        ),
        DatasetRecord(
            datasetId=dataset.id,
            rowIndex=1,
            raw=json.dumps({"caller": "9822013345", "receiver": "9988776655", "duration": "180", "location": "Industrial Area"}),
            normalized=json.dumps({"caller": "9822013345", "receiver": "9988776655", "duration": "180", "location": "Industrial Area"}),
            matchStatus="CANDIDATE",
            matchConfidence=85,
            matchReasons=json.dumps(["Matched Subscriber: Amit Sharma"]),
            matchCandidateId=e_amit.id,
        ),
        DatasetRecord(
            datasetId=dataset.id,
            rowIndex=2,
            raw=json.dumps({"caller": "9811223344", "receiver": "9876512345", "duration": "95", "location": "Central Market"}),
            normalized=json.dumps({"caller": "9811223344", "receiver": "9876512345", "duration": "95", "location": "Central Market"}),
            matchStatus="UNMATCHED",
            matchConfidence=0,
            matchReasons=json.dumps([]),
        )
    ]
    for dr in d_records:
        db.add(dr)

    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
