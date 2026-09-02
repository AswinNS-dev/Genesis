import json
from datetime import datetime, timezone, timedelta
from backend.app.database import SessionLocal, init_db
from backend.app.database.models import (
    InvestigationCase, CaseNote, CaseActivity,
    Entity, Relationship, TimelineEvent,
    CommunicationRecord, TransactionRecord, LocationRecord,
    EvidenceDocument, BlockchainRecord, EvidenceVerification,
    AnalysisResult, ExtractionCandidate, Pattern, AIAlert,
    EntityMatch, Dataset, DatasetRecord, DatasetEntity,
    AuditLog, User
)
from backend.app.blockchain.hashing import sha256, compute_block_hash as hash_block

def utc_now():
    return datetime.now(timezone.utc)

def seed_database():
    print("Initializing Supabase database tables...")
    init_db()
    db = SessionLocal()

    print("Clearing existing records...")
    db.query(DatasetEntity).delete()
    db.query(DatasetRecord).delete()
    db.query(Dataset).delete()
    db.query(ExtractionCandidate).delete()
    db.query(Pattern).delete()
    db.query(AIAlert).delete()
    db.query(AnalysisResult).delete()
    db.query(EntityMatch).delete()
    db.query(TimelineEvent).delete()
    db.query(CommunicationRecord).delete()
    db.query(TransactionRecord).delete()
    db.query(LocationRecord).delete()
    db.query(Relationship).delete()
    db.query(Entity).delete()
    db.query(EvidenceVerification).delete()
    db.query(BlockchainRecord).delete()
    db.query(EvidenceDocument).delete()
    db.query(CaseActivity).delete()
    db.query(CaseNote).delete()
    db.query(InvestigationCase).delete()
    db.query(AuditLog).delete()
    db.query(User).delete()
    db.commit()

    print("Seeding Users...")
    from backend.app.security.authentication import get_password_hash
    admin = User(
        email="admin@crimeintel.demo",
        name="Chief Inspector Admin",
        passwordHash=get_password_hash("Admin@1234"),
        role="ADMIN"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    print("Seeding 14 Core Tables into Supabase...")

    # 1. Cases
    c1 = InvestigationCase(
        caseId="CR-2026-1048",
        title="Operation Silverline Syndicate",
        description="Cross-jurisdictional financial fraud and unauthorized Hawala transactions.",
        status="ACTIVE",
        classification="RESTRICTED",
        category="Financial Fraud",
        jurisdiction="Delhi NCR / Mumbai",
        assignedInvestigator="Insp. Vikram Patel"
    )
    c2 = InvestigationCase(
        caseId="CR-2026-1049",
        title="Apex Global Crypto Intercept",
        description="Illicit cryptocurrency off-ramping linked to unregistered shell entities.",
        status="OPEN",
        classification="CONFIDENTIAL",
        category="Money Laundering",
        jurisdiction="Cyber Crime Cell",
        assignedInvestigator="Officer Priya Singh"
    )
    db.add_all([c1, c2])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)

    # 2. Case Notes & Activities
    n1 = CaseNote(caseId=c1.id, body="Initial CDR dump received from telecom provider.", author="Insp. Vikram Patel")
    act1 = CaseActivity(caseId=c1.id, action="DOCKET_INITIALIZED", detail="Case registered with priority HIGH", actor="Chief Admin")
    db.add_all([n1, act1])

    # 3. Entities
    e1 = Entity(name="Rahul Kumar", type="PERSON", value="+919876512345", riskScore=85, caseId=c1.id)
    e2 = Entity(name="Amit Sharma", type="PERSON", value="+919822013345", riskScore=72, caseId=c1.id)
    e3 = Entity(name="ABC Logistics", type="ORGANIZATION", value="GSTIN-07AAAAA0000A1Z5", riskScore=90, caseId=c1.id)
    e4 = Entity(name="DL01AB1234", type="VEHICLE", value="Toyota Fortuner (Black)", riskScore=65, caseId=c1.id)
    e5 = Entity(name="Sector 18 Warehouse", type="LOCATION", value="Noida Phase II", riskScore=50, caseId=c1.id)
    e6 = Entity(name="Account #9982-1002-441", type="ACCOUNT", value="HDFC Bank", riskScore=80, caseId=c1.id)
    db.add_all([e1, e2, e3, e4, e5, e6])
    db.commit()
    for e in [e1, e2, e3, e4, e5, e6]:
        db.refresh(e)

    # 4. Relationships
    r1 = Relationship(sourceId=e1.id, targetId=e2.id, type="CO_CONSPIRATOR", label="Frequent Calls", strength=85, caseId=c1.id)
    r2 = Relationship(sourceId=e1.id, targetId=e3.id, type="DIRECTOR", label="Beneficial Owner", strength=95, caseId=c1.id)
    r3 = Relationship(sourceId=e1.id, targetId=e4.id, type="OPERATES_VEHICLE", label="Driver", strength=70, caseId=c1.id)
    r4 = Relationship(sourceId=e2.id, targetId=e5.id, type="CO_LOCATED", label="Toll Ping Match", strength=78, caseId=c1.id)
    r5 = Relationship(sourceId=e3.id, targetId=e6.id, type="HOLDS_ACCOUNT", label="Primary Corporate Account", strength=100, caseId=c1.id)
    db.add_all([r1, r2, r3, r4, r5])

    # 5. Timeline Events
    t1 = TimelineEvent(caseId=c1.id, entityId=e1.id, type="CDR_BURST", summary="Off-hours 3AM call spike", detail="14 incoming calls from burner handset", eventAt=utc_now() - timedelta(days=2))
    t2 = TimelineEvent(caseId=c1.id, entityId=e4.id, type="TOLL_PASSAGE", summary="Vehicle DL01AB1234 passed Toll Plaza #4", detail="Recorded at 23:45 heading towards Sector 18", eventAt=utc_now() - timedelta(days=1))
    db.add_all([t1, t2])

    # 6. Communications
    comm1 = CommunicationRecord(caseId=c1.id, caller="+919876512345", receiver="+919822013345", callerName="Rahul Kumar", receiverName="Amit Sharma", type="VOICE_CALL", durationSec=412, cellTower="Tower Sector 18-A", isAnomaly=True, anomalyReason="Late Night Call")
    comm2 = CommunicationRecord(caseId=c1.id, caller="+919876512345", receiver="+919988776655", callerName="Rahul Kumar", receiverName="Unknown Associate", type="ENCRYPTED_SMS", durationSec=0, cellTower="Tower CP-South", isAnomaly=False)
    db.add_all([comm1, comm2])

    # 7. Transactions
    txn1 = TransactionRecord(caseId=c1.id, sender="Rahul Kumar", receiver="ABC Logistics", senderAccount="SBIN0001234", receiverAccount="Account #9982-1002-441", amount=500000, currency="INR", transactionType="RTGS", isSuspicious=True, suspiciousReason="Structuring Threshold Exceeded")
    db.add(txn1)

    # 8. Locations
    loc1 = LocationRecord(caseId=c1.id, name="Sector 18 Warehouse", address="Noida Phase II", latitude=28.5700, longitude=77.3200, subjectName="Rahul Kumar", sourceType="GPS_PING", speedKmh=45.0)
    db.add(loc1)

    # 9. Evidence Documents
    doc1_content = b"Forensic Call Detail Records for Operation Silverline"
    doc1_hash = sha256(doc1_content)
    doc1 = EvidenceDocument(
        caseId=c1.id,
        name="CDR_Analysis_Jan2026.pdf",
        description="Cell tower triangulation and contact logs",
        contentType="application/pdf",
        sizeBytes=len(doc1_content),
        sha256=doc1_hash,
        verified=True,
        verifiedAt=utc_now(),
        status="ACTIVE"
    )
    db.add(doc1)
    db.flush()

    # 10. Blockchain Records
    gen_hash = sha256("GENESIS_DATA")
    b0_hash = hash_block(0, utc_now(), gen_hash, "0" * 64, "GENESIS")
    b0 = BlockchainRecord(index=0, timestamp=utc_now(), dataHash=gen_hash, previousHash="0" * 64, hash=b0_hash, action="GENESIS", note="Genesis Block")
    db.add(b0)
    db.flush()

    b1_hash = hash_block(1, utc_now(), doc1_hash, b0_hash, "EVIDENCE_HASH")
    b1 = BlockchainRecord(index=1, timestamp=utc_now(), dataHash=doc1_hash, previousHash=b0_hash, hash=b1_hash, action="EVIDENCE_HASH", note="CDR Analysis Notarization", evidenceId=doc1.id)
    db.add(b1)

    # 11. Evidence Verifications
    verif = EvidenceVerification(evidenceId=doc1.id, verifiedBy="Forensic Validator", action="VERIFY", result="MATCH", detail="SHA-256 integrity intact")
    db.add(verif)

    # 12. Analysis Results
    ar1 = AnalysisResult(
        caseId=c1.id,
        analysisType="NER",
        modelName="TransformerNER",
        result=json.dumps({"entities": [{"text": "Rahul Kumar", "label": "PERSON"}]}),
        confidence=0.95,
        explanation="Extracted high confidence primary targets."
    )
    db.add(ar1)

    # 13. Entity Matches
    em1 = EntityMatch(entityAId=e1.id, entityBId=e2.id, confidence=78, reasons="Investigative lead: Co-location and phone overlap", status="PENDING")
    db.add(em1)

    # 14. Audit Logs
    audit = AuditLog(caseId=c1.id, action="CASE_INITIALIZED", detail="Seeded initial Supabase record set", status="SUCCESS")
    db.add(audit)

    db.commit()
    print("Supabase database successfully seeded with all 14 core application tables!")

if __name__ == "__main__":
    seed_database()
