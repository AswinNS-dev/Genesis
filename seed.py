import json
from datetime import datetime, timezone, timedelta
from backend.app.database.connection import engine, Base, SessionLocal, init_db
from backend.app.database.models import (
    InvestigationCase, CaseNote, CaseActivity,
    Entity, Relationship, TimelineEvent,
    CommunicationRecord, TransactionRecord, LocationRecord,
    EvidenceDocument, BlockchainRecord, EvidenceVerification,
    AnalysisResult, ExtractionCandidate, Pattern, AIAlert,
    EntityMatch, Dataset, DatasetRecord, DatasetEntity,
    AuditLog, User, LoginAttempt, SecurityAlert
)
from backend.app.blockchain.hashing import sha256, compute_block_hash as hash_block

def utc_now():
    return datetime.now(timezone.utc)

def seed_database():
    print("Initializing Supabase database tables...")
    try:
        AuditLog.__table__.drop(bind=engine, checkfirst=True)
    except Exception as e:
        print(f"Table drop notice: {e}")
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
    db.query(SecurityAlert).delete()
    db.query(LoginAttempt).delete()
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
    inv = User(
        email="investigator@crimeintel.demo",
        name="Insp. Vikram Patel",
        passwordHash=get_password_hash("Investigator@1234"),
        role="INVESTIGATOR"
    )
    analyst = User(
        email="analyst@crimeintel.demo",
        name="Analyst Priya Sharma",
        passwordHash=get_password_hash("Analyst@1234"),
        role="ANALYST"
    )
    viewer = User(
        email="viewer@crimeintel.demo",
        name="Officer Rajesh Kumar",
        passwordHash=get_password_hash("Viewer@1234"),
        role="VIEWER"
    )
    db.add_all([admin, inv, analyst, viewer])
    db.commit()
    for u in [admin, inv, analyst, viewer]:
        db.refresh(u)

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

    # 13. Entity Matches (Multi-Signal Entity Resolution)
    em1 = EntityMatch(
        entityAId=e1.id,
        entityBId=e2.id,
        confidence=91,
        reasons="✓ Same DOB: 1988-04-12 | ✓ Same phone: +919876512345 | ✓ Shared address: Sector 18 Noida | ⚠ Name variation (Ramu Kumar vs Ramesh Kumar)",
        status="APPROVED"
    )
    em2 = EntityMatch(
        entityAId=e2.id,
        entityBId=e3.id,
        confidence=82,
        reasons="✓ Corporate filing director overlap | ✓ Shared corporate bank account #9982-1002-441",
        status="PENDING"
    )
    em3 = EntityMatch(
        entityAId=e1.id,
        entityBId=e4.id,
        confidence=74,
        reasons="✓ Registered vehicle operator match | ✓ Frequent toll passings together",
        status="PENDING"
    )
    db.add_all([em1, em2, em3])

    # 14. Login Attempts
    att1 = LoginAttempt(email="admin@crimeintel.demo", success=True, ip="192.168.1.10", userId=admin.id, attemptAt=utc_now() - timedelta(hours=5))
    att2 = LoginAttempt(email="investigator@crimeintel.demo", success=True, ip="192.168.1.15", userId=inv.id, attemptAt=utc_now() - timedelta(hours=3))
    att3 = LoginAttempt(email="unknown_intruder@darknet.org", success=False, reason="Invalid credentials", ip="45.154.255.89", attemptAt=utc_now() - timedelta(hours=2))
    att4 = LoginAttempt(email="unknown_intruder@darknet.org", success=False, reason="Invalid credentials", ip="45.154.255.89", attemptAt=utc_now() - timedelta(hours=2, minutes=5))
    att5 = LoginAttempt(email="analyst@crimeintel.demo", success=True, ip="192.168.1.22", userId=analyst.id, attemptAt=utc_now() - timedelta(minutes=45))
    db.add_all([att1, att2, att3, att4, att5])

    # 15. Security Alerts
    sa1 = SecurityAlert(
        severity="HIGH",
        type="BRUTE_FORCE_ATTEMPT",
        message="Consecutive failed authentication attempts detected from unauthorized external IP 45.154.255.89",
        detail="Origin IP attempted multiple logins against non-existent and administrative accounts.",
        createdAt=utc_now() - timedelta(hours=2),
        resolved=False
    )
    sa2 = SecurityAlert(
        severity="MEDIUM",
        type="ANOMALOUS_DATA_QUERY",
        message="High-volume entity batch export requested during off-duty hours",
        detail="Bulk query requested for 200 records outside standard shift window.",
        createdAt=utc_now() - timedelta(days=1),
        resolved=True,
        resolvedAt=utc_now() - timedelta(hours=18),
        userId=analyst.id
    )
    db.add_all([sa1, sa2])

    # 16. Comprehensive Audit Logs
    audit_events = [
        AuditLog(
            action="CASE_INITIALIZED",
            detail="Seeded initial investigation dossier CR-2026-1048",
            status="SUCCESS",
            severity="INFO",
            resource="Case",
            resourceId=c1.id,
            role="ADMIN",
            userId=admin.id,
            caseId=c1.id,
            createdAt=utc_now() - timedelta(days=5)
        ),
        AuditLog(
            action="LOGIN_SUCCESS",
            detail="Chief Inspector Admin authenticated via Secure JWT Gateway",
            status="SUCCESS",
            severity="INFO",
            resource="Authentication",
            resourceId=admin.id,
            role="ADMIN",
            userId=admin.id,
            ip="192.168.1.10",
            createdAt=utc_now() - timedelta(hours=5)
        ),
        AuditLog(
            action="ENTITY_RESOLUTION_ANALYSIS",
            detail="AI Multi-Signal Entity Resolver executed on suspect Rahul Kumar against Registry",
            status="SUCCESS",
            severity="INFO",
            resource="EntityResolution",
            resourceId=e1.id,
            role="ANALYST",
            userId=analyst.id,
            caseId=c1.id,
            createdAt=utc_now() - timedelta(hours=4)
        ),
        AuditLog(
            action="ENTITY_MATCH_PROPOSED",
            detail="AI detected 91% match between Ramu Kumar and Ramesh Kumar based on DOB, Phone & Address",
            status="SUCCESS",
            severity="LOW",
            resource="EntityMatch",
            resourceId=em1.id,
            role="SYSTEM_AI",
            previousState="UNRESOLVED",
            newState="PROBABLE_MATCH",
            caseId=c1.id,
            createdAt=utc_now() - timedelta(hours=3, minutes=30)
        ),
        AuditLog(
            action="LOGIN_SUCCESS",
            detail="Insp. Vikram Patel authenticated into CrimeIntel console",
            status="SUCCESS",
            severity="INFO",
            resource="Authentication",
            resourceId=inv.id,
            role="INVESTIGATOR",
            userId=inv.id,
            ip="192.168.1.15",
            createdAt=utc_now() - timedelta(hours=3)
        ),
        AuditLog(
            action="DOSSIER_VIEWED",
            detail="Investigator accessed full 360-degree dossier for entity Rahul Kumar",
            status="SUCCESS",
            severity="INFO",
            resource="EntityDossier",
            resourceId=e1.id,
            role="INVESTIGATOR",
            userId=inv.id,
            caseId=c1.id,
            createdAt=utc_now() - timedelta(hours=2, minutes=45)
        ),
        AuditLog(
            action="ENTITY_MATCH_CONFIRMED",
            detail="Investigator verified supporting evidence (DOB match + telecom ping overlap). Resolved as same target.",
            status="SUCCESS",
            severity="MEDIUM",
            resource="EntityMatch",
            resourceId=em1.id,
            role="INVESTIGATOR",
            userId=inv.id,
            previousState="PROBABLE_MATCH",
            newState="CONFIRMED",
            caseId=c1.id,
            createdAt=utc_now() - timedelta(hours=2, minutes=30)
        ),
        AuditLog(
            action="LOGIN_FAILED",
            detail="Failed authentication attempt with invalid credentials from IP 45.154.255.89",
            status="FAILED",
            severity="HIGH",
            resource="Authentication",
            resourceId="unknown_intruder@darknet.org",
            role="UNKNOWN",
            ip="45.154.255.89",
            createdAt=utc_now() - timedelta(hours=2)
        ),
        AuditLog(
            action="EVIDENCE_VERIFIED",
            detail="CDR_Analysis_Jan2026.pdf verified against Blockchain Vault. SHA-256 hash valid.",
            status="SUCCESS",
            severity="INFO",
            resource="EvidenceDocument",
            resourceId=doc1.id,
            role="INVESTIGATOR",
            userId=inv.id,
            caseId=c1.id,
            createdAt=utc_now() - timedelta(hours=1, minutes=30)
        ),
        AuditLog(
            action="REPORT_GENERATED",
            detail="Generated comprehensive investigation dossier REP-CR-2026-1048",
            status="SUCCESS",
            severity="INFO",
            resource="Report",
            resourceId="REP-CR-2026-1048",
            role="INVESTIGATOR",
            userId=inv.id,
            caseId=c1.id,
            createdAt=utc_now() - timedelta(hours=1)
        ),
        AuditLog(
            action="PROXY_ASSOCIATION_REVIEW",
            detail="Investigator flagged DL01AB1234 vehicle driver as suspected proxy associate",
            status="SUCCESS",
            severity="MEDIUM",
            resource="Relationship",
            resourceId=r3.id,
            role="INVESTIGATOR",
            userId=inv.id,
            caseId=c1.id,
            createdAt=utc_now() - timedelta(minutes=30)
        ),
        AuditLog(
            action="UNAUTHORIZED_ACCESS_ATTEMPT",
            detail="Viewer role attempted to execute entity resolution merge on restricted records",
            status="UNAUTHORIZED",
            severity="HIGH",
            resource="SecurityPolicy",
            resourceId="RBAC_DENY",
            role="VIEWER",
            userId=viewer.id,
            createdAt=utc_now() - timedelta(minutes=15)
        )
    ]
    db.add_all(audit_events)

    db.commit()
    print("Supabase database successfully seeded with all 14 core application tables!")

if __name__ == "__main__":
    seed_database()
