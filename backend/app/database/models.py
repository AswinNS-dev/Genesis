import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base

def gen_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# ----------------- 1. Cases -----------------
class InvestigationCase(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=gen_id)
    caseId = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="OPEN", index=True)
    classification = Column(String, default="RESTRICTED")
    category = Column(String, nullable=True)
    caseSource = Column(String, nullable=True)
    incidentDate = Column(DateTime, nullable=True)
    jurisdiction = Column(String, nullable=True)
    assignedInvestigator = Column(String, nullable=True)
    createdById = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    activities = relationship("CaseActivity", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("EvidenceDocument", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="case")
    events = relationship("TimelineEvent", back_populates="case")
    relationships = relationship("Relationship", back_populates="case")
    communications = relationship("CommunicationRecord", back_populates="case", cascade="all, delete-orphan")
    transactions = relationship("TransactionRecord", back_populates="case", cascade="all, delete-orphan")
    locations = relationship("LocationRecord", back_populates="case", cascade="all, delete-orphan")
    analyses = relationship("AnalysisResult", back_populates="case", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="case")
    auditLogs = relationship("AuditLog", back_populates="case")

class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(String, primary_key=True, default=gen_id)
    body = Column(Text, nullable=False)
    author = Column(String, nullable=True)
    authorId = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="notes")

class CaseActivity(Base):
    __tablename__ = "case_activities"

    id = Column(String, primary_key=True, default=gen_id)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    actor = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="activities")

# ----------------- 2. Entities -----------------
class Entity(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    aliases = Column(Text, nullable=True)
    value = Column(String, nullable=True)
    metadata_json = Column("metadata", Text, nullable=True)
    riskScore = Column(Integer, default=0)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    case = relationship("InvestigationCase", back_populates="entities")

    sourceRelationships = relationship("Relationship", foreign_keys="Relationship.sourceId", back_populates="source", cascade="all, delete-orphan")
    targetRelationships = relationship("Relationship", foreign_keys="Relationship.targetId", back_populates="target", cascade="all, delete-orphan")
    matchesTargetA = relationship("EntityMatch", foreign_keys="EntityMatch.entityAId", back_populates="entityA", cascade="all, delete-orphan")
    matchesTargetB = relationship("EntityMatch", foreign_keys="EntityMatch.entityBId", back_populates="entityB", cascade="all, delete-orphan")
    timelineEvents = relationship("TimelineEvent", back_populates="entity")
    fromDatasets = relationship("DatasetEntity", back_populates="entity", cascade="all, delete-orphan")
    datasetMatches = relationship("DatasetRecord", foreign_keys="DatasetRecord.matchCandidateId", back_populates="matchCandidate")
    datasetMerges = relationship("DatasetRecord", foreign_keys="DatasetRecord.mergedEntityId", back_populates="mergedEntity")

# ----------------- 3. Relationships -----------------
class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False, index=True)
    label = Column(String, nullable=True)
    sourceId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    targetId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    strength = Column(Integer, default=50)
    count = Column(Integer, default=1)
    records = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)

    source = relationship("Entity", foreign_keys=[sourceId], back_populates="sourceRelationships")
    target = relationship("Entity", foreign_keys=[targetId], back_populates="targetRelationships")
    case = relationship("InvestigationCase", back_populates="relationships")

# ----------------- 4. Timeline Events -----------------
class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    eventAt = Column(DateTime, nullable=False)
    createdAt = Column(DateTime, default=utc_now)

    entityId = Column(String, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    caseId = Column(String, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)

    entity = relationship("Entity", back_populates="timelineEvents")
    case = relationship("InvestigationCase", back_populates="events")

# ----------------- 5. Communications -----------------
class CommunicationRecord(Base):
    __tablename__ = "communications"

    id = Column(String, primary_key=True, default=gen_id)
    caller = Column(String, nullable=False)
    receiver = Column(String, nullable=False)
    callerName = Column(String, nullable=True)
    receiverName = Column(String, nullable=True)
    type = Column(String, default="VOICE_CALL")
    durationSec = Column(Integer, default=0)
    timestamp = Column(DateTime, default=utc_now)
    cellTower = Column(String, nullable=True)
    isAnomaly = Column(Boolean, default=False)
    anomalyReason = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="communications")

# ----------------- 6. Transactions -----------------
class TransactionRecord(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=gen_id)
    sender = Column(String, nullable=False)
    receiver = Column(String, nullable=False)
    senderAccount = Column(String, nullable=True)
    receiverAccount = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    transactionType = Column(String, default="WIRE_TRANSFER")
    timestamp = Column(DateTime, default=utc_now)
    isSuspicious = Column(Boolean, default=False)
    suspiciousReason = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="transactions")

# ----------------- 7. Locations -----------------
class LocationRecord(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    subjectName = Column(String, nullable=True)
    timestamp = Column(DateTime, default=utc_now)
    sourceType = Column(String, default="TOLL_SCAN")
    speedKmh = Column(Float, default=0.0)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="locations")

# ----------------- 8. Evidence Documents -----------------
class EvidenceDocument(Base):
    __tablename__ = "evidence_documents"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    filePath = Column(String, nullable=True)
    contentType = Column(String, default="application/pdf")
    sizeBytes = Column(Integer, default=0)
    sha256 = Column(String, nullable=True)
    verified = Column(Boolean, default=False)
    verifiedAt = Column(DateTime, nullable=True)
    status = Column(String, default="ACTIVE")
    uploadedById = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="documents")
    blockchainRecords = relationship("BlockchainRecord", back_populates="evidence")
    verifications = relationship("EvidenceVerification", back_populates="evidence", cascade="all, delete-orphan")
    extraction = relationship("ExtractionCandidate", back_populates="document", cascade="all, delete-orphan")

# ----------------- 9. Blockchain Records -----------------
class BlockchainRecord(Base):
    __tablename__ = "blockchain_records"

    id = Column(String, primary_key=True, default=gen_id)
    index = Column(Integer, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    dataHash = Column(String, nullable=False)
    previousHash = Column(String, nullable=False)
    hash = Column(String, nullable=False)
    action = Column(String, default="EVIDENCE_HASH")
    note = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    evidenceId = Column(String, ForeignKey("evidence_documents.id", ondelete="SET NULL"), nullable=True)
    evidence = relationship("EvidenceDocument", back_populates="blockchainRecords")

# ----------------- 10. Evidence Verifications -----------------
class EvidenceVerification(Base):
    __tablename__ = "evidence_verifications"

    id = Column(String, primary_key=True, default=gen_id)
    evidenceId = Column(String, ForeignKey("evidence_documents.id", ondelete="CASCADE"), nullable=False)
    verifiedBy = Column(String, nullable=True)
    action = Column(String, default="VERIFY")
    result = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    evidence = relationship("EvidenceDocument", back_populates="verifications")

# ----------------- 11. Analysis Results -----------------
class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, default=gen_id)
    analysisType = Column(String, nullable=False)  # NER, ENTITY_RESOLUTION, ANOMALY, TIMELINE, PATTERN
    modelName = Column(String, nullable=True)
    modelVersion = Column(String, nullable=True)
    result = Column(Text, nullable=False)  # JSON string
    confidence = Column(Float, default=0.90)
    explanation = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=True)
    case = relationship("InvestigationCase", back_populates="analyses")

class ExtractionCandidate(Base):
    __tablename__ = "extraction_candidates"

    id = Column(String, primary_key=True, default=gen_id)
    documentId = Column(String, ForeignKey("evidence_documents.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    value = Column(String, nullable=False)
    context = Column(Text, nullable=True)
    status = Column(String, default="PENDING")
    editedValue = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    document = relationship("EvidenceDocument", back_populates="extraction")

class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    severity = Column(String, default="MEDIUM")
    entities = Column(Text, nullable=True)
    reasons = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    relevance = Column(Integer, default=0)
    createdAt = Column(DateTime, default=utc_now)
    resolved = Column(Boolean, default=False)

class AIAlert(Base):
    __tablename__ = "ai_alerts"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False)
    severity = Column(String, default="MEDIUM")
    message = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    read = Column(Boolean, default=False)

# ----------------- 12. Entity Matches -----------------
class EntityMatch(Base):
    __tablename__ = "entity_matches"

    id = Column(String, primary_key=True, default=gen_id)
    entityAId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    entityBId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    confidence = Column(Integer, nullable=False)
    reasons = Column(Text, nullable=False)
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED
    createdAt = Column(DateTime, default=utc_now)

    entityA = relationship("Entity", foreign_keys=[entityAId], back_populates="matchesTargetA")
    entityB = relationship("Entity", foreign_keys=[entityBId], back_populates="matchesTargetB")

# ----------------- 13. Datasets -----------------
class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    sourceType = Column(String, default="CSV")
    fileName = Column(String, nullable=True)
    storageLocation = Column(String, nullable=True)
    status = Column(String, default="UPLOADED")
    recordCount = Column(Integer, default=0)
    analysisScope = Column(String, default="COMBINED")
    mapping = Column(Text, nullable=True)
    normalizationRules = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    createdById = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    case = relationship("InvestigationCase", back_populates="datasets")
    records = relationship("DatasetRecord", back_populates="dataset", cascade="all, delete-orphan")
    datasetEntities = relationship("DatasetEntity", back_populates="dataset", cascade="all, delete-orphan")

class DatasetRecord(Base):
    __tablename__ = "dataset_records"

    id = Column(String, primary_key=True, default=gen_id)
    datasetId = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    rowIndex = Column(Integer, nullable=False)
    raw = Column(Text, nullable=True)
    normalized = Column(Text, nullable=True)
    matchStatus = Column(String, default="UNMATCHED")
    matchConfidence = Column(Integer, default=0)
    matchReasons = Column(Text, nullable=True)
    matchCandidateId = Column(String, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    mergedEntityId = Column(String, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    reviewedById = Column(String, nullable=True)
    reviewedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    dataset = relationship("Dataset", back_populates="records")
    matchCandidate = relationship("Entity", foreign_keys=[matchCandidateId], back_populates="datasetMatches")
    mergedEntity = relationship("Entity", foreign_keys=[mergedEntityId], back_populates="datasetMerges")
    datasetEntities = relationship("DatasetEntity", back_populates="record", cascade="all, delete-orphan")

class DatasetEntity(Base):
    __tablename__ = "dataset_entities"

    id = Column(String, primary_key=True, default=gen_id)
    role = Column(String, default="SOURCE")
    createdAt = Column(DateTime, default=utc_now)

    datasetId = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    recordId = Column(String, ForeignKey("dataset_records.id", ondelete="CASCADE"), nullable=False)
    entityId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)

    dataset = relationship("Dataset", back_populates="datasetEntities")
    record = relationship("DatasetRecord", back_populates="datasetEntities")
    entity = relationship("Entity", back_populates="fromDatasets")

    __table_args__ = (
        UniqueConstraint("datasetId", "recordId", "entityId", name="uq_dataset_record_entity"),
    )

# ----------------- 14. Audit Logs -----------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    ip = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    status = Column(String, default="SUCCESS")
    userId = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    case = relationship("InvestigationCase", back_populates="auditLogs")

# ----------------- Legacy/Compatibility User table -----------------
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    passwordHash = Column(String, nullable=False)
    role = Column(String, default="VIEWER")
    status = Column(String, default="ACTIVE")
    failedLogins = Column(Integer, default=0)
    lockedUntil = Column(DateTime, nullable=True)
    lastLoginAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, nullable=False, index=True)
    success = Column(Boolean, default=False)
    ip = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    attemptAt = Column(DateTime, default=utc_now)
    userId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(String, primary_key=True, default=gen_id)
    severity = Column(String, default="MEDIUM")
    type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    resolved = Column(Boolean, default=False)
    resolvedAt = Column(DateTime, nullable=True)
    userId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
