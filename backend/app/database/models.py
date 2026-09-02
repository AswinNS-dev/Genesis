import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base

def gen_id():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# ----------------- Auth & Security -----------------
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

    attempts = relationship("LoginAttempt", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("SecurityAlert", back_populates="user")
    auditLogs = relationship("AuditLog", back_populates="user")
    cases = relationship("InvestigationCase", back_populates="createdBy")
    documents = relationship("EvidenceDocument", back_populates="uploadedBy")
    notes = relationship("CaseNote", back_populates="authorUser")
    datasets = relationship("Dataset", back_populates="createdBy")
    datasetReviews = relationship("DatasetRecord", back_populates="reviewedBy")

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
    user = relationship("User", back_populates="attempts")

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
    user = relationship("User", back_populates="alerts")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="SET NULL"), nullable=True)
    ip = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    status = Column(String, default="SUCCESS")
    createdAt = Column(DateTime, default=utc_now)

    userId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user = relationship("User", back_populates="auditLogs")
    case = relationship("InvestigationCase", back_populates="auditLogs")

# ----------------- Investigation Cases -----------------
class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(String, primary_key=True, default=gen_id)
    caseId = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="OPEN")
    classification = Column(String, default="RESTRICTED")
    category = Column(String, nullable=True)
    caseSource = Column(String, nullable=True)
    incidentDate = Column(DateTime, nullable=True)
    jurisdiction = Column(String, nullable=True)
    assignedInvestigator = Column(String, nullable=True)
    createdById = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    createdBy = relationship("User", back_populates="cases")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    activities = relationship("CaseActivity", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("EvidenceDocument", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="case")
    events = relationship("TimelineEvent", back_populates="case")
    relationships = relationship("Relationship", back_populates="case")
    datasets = relationship("Dataset", back_populates="case")
    auditLogs = relationship("AuditLog", back_populates="case")

class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(String, primary_key=True, default=gen_id)
    body = Column(Text, nullable=False)
    author = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False)
    authorId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    case = relationship("InvestigationCase", back_populates="notes")
    authorUser = relationship("User", back_populates="notes")

class CaseActivity(Base):
    __tablename__ = "case_activities"

    id = Column(String, primary_key=True, default=gen_id)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    actor = Column(String, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False)
    case = relationship("InvestigationCase", back_populates="activities")

# ----------------- Evidence & Blockchain -----------------
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
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False)
    uploadedById = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    case = relationship("InvestigationCase", back_populates="documents")
    uploadedBy = relationship("User", back_populates="documents")
    blockchainRecords = relationship("BlockchainRecord", back_populates="evidence")
    verifications = relationship("EvidenceVerification", back_populates="evidence", cascade="all, delete-orphan")
    extraction = relationship("ExtractionCandidate", back_populates="document", cascade="all, delete-orphan")

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

# ----------------- Entities & Relationships -----------------
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

    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="SET NULL"), nullable=True)
    case = relationship("InvestigationCase", back_populates="entities")

    sourceRelationships = relationship("Relationship", foreign_keys="Relationship.sourceId", back_populates="source", cascade="all, delete-orphan")
    targetRelationships = relationship("Relationship", foreign_keys="Relationship.targetId", back_populates="target", cascade="all, delete-orphan")

    matchesTargetA = relationship("EntityMatch", foreign_keys="EntityMatch.entityAId", back_populates="entityA", cascade="all, delete-orphan")
    matchesTargetB = relationship("EntityMatch", foreign_keys="EntityMatch.entityBId", back_populates="entityB", cascade="all, delete-orphan")

    timelineEvents = relationship("TimelineEvent", back_populates="entity")
    fromDatasets = relationship("DatasetEntity", back_populates="entity", cascade="all, delete-orphan")
    datasetMatches = relationship("DatasetRecord", foreign_keys="DatasetRecord.matchCandidateId", back_populates="matchCandidate")
    datasetMerges = relationship("DatasetRecord", foreign_keys="DatasetRecord.mergedEntityId", back_populates="mergedEntity")

class EntityMatch(Base):
    __tablename__ = "entity_matches"

    id = Column(String, primary_key=True, default=gen_id)
    entityAId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    entityBId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    confidence = Column(Integer, nullable=False)
    reasons = Column(Text, nullable=False)
    status = Column(String, default="PENDING")
    createdAt = Column(DateTime, default=utc_now)

    entityA = relationship("Entity", foreign_keys=[entityAId], back_populates="matchesTargetA")
    entityB = relationship("Entity", foreign_keys=[entityBId], back_populates="matchesTargetB")

class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False, index=True)
    label = Column(String, nullable=True)
    sourceId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    targetId = Column(String, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    strength = Column(Integer, default=0)
    count = Column(Integer, default=0)
    records = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=utc_now)

    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="SET NULL"), nullable=True)

    source = relationship("Entity", foreign_keys=[sourceId], back_populates="sourceRelationships")
    target = relationship("Entity", foreign_keys=[targetId], back_populates="targetRelationships")
    case = relationship("InvestigationCase", back_populates="relationships")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    eventAt = Column(DateTime, nullable=False)
    createdAt = Column(DateTime, default=utc_now)

    entityId = Column(String, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="SET NULL"), nullable=True)

    entity = relationship("Entity", back_populates="timelineEvents")
    case = relationship("InvestigationCase", back_populates="events")

# ----------------- AI Models -----------------
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

# ----------------- Datasets -----------------
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
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    createdById = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    caseId = Column(String, ForeignKey("investigation_cases.id", ondelete="SET NULL"), nullable=True)

    createdBy = relationship("User", back_populates="datasets")
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
    reviewedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=utc_now)
    updatedAt = Column(DateTime, default=utc_now, onupdate=utc_now)

    matchCandidateId = Column(String, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    mergedEntityId = Column(String, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True)
    reviewedById = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    dataset = relationship("Dataset", back_populates="records")
    matchCandidate = relationship("Entity", foreign_keys=[matchCandidateId], back_populates="datasetMatches")
    mergedEntity = relationship("Entity", foreign_keys=[mergedEntityId], back_populates="datasetMerges")
    reviewedBy = relationship("User", back_populates="datasetReviews")
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
        UniqueConstraint("datasetId", "recordId", "entityId", name="uq_backend_app_dataset_record_entity"),
    )
