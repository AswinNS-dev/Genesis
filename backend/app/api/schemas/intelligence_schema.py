from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- NER Schemas ---

class NERRequest(BaseModel):
    text: str = Field(..., description="Unstructured text to extract forensic entities from")

class ExtractedEntityItem(BaseModel):
    text: str
    label: str
    start: int
    end: int
    confidence: float

class NERResponse(BaseModel):
    text: str
    entities: List[ExtractedEntityItem]


# --- Entity Resolution Schemas ---

class EntityProfileInput(BaseModel):
    id: Optional[str] = None
    type: Optional[str] = "PERSON"
    name: Optional[str] = None
    alias: Optional[str] = None
    aliases: Optional[List[str]] = []
    phone: Optional[str] = None
    vehicle: Optional[str] = None
    location: Optional[str] = None

class EntityResolutionRequest(BaseModel):
    extracted_entities: List[EntityProfileInput]
    registry_candidates: List[EntityProfileInput] = []

class ResolutionResultItem(BaseModel):
    input_entity: str
    matched_entity_id: Optional[str] = None
    canonical_name: Optional[str] = None
    decision: str
    confidence: float
    requires_review: bool
    explanation: str
    signals: Dict[str, float]

class EntityResolutionResponse(BaseModel):
    results: List[ResolutionResultItem]


# --- Entity Match Management Schemas ---

class MatchStatusUpdateSchema(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED")

class MatchStatusUpdateResponse(BaseModel):
    success: bool
    id: str
    status: str

class EntityMatchItem(BaseModel):
    id: str
    entityAId: str
    entityBId: str
    confidence: int
    reasons: Optional[str] = None
    status: str
    createdAt: Optional[str] = None


# --- Location Analysis Schemas ---

class LocationAnalyzeRequest(BaseModel):
    person_id: str

class LocationAnomalyItem(BaseModel):
    person_id: Optional[str] = None
    location_id: Optional[str] = None
    visit_count: Optional[int] = None
    unique_days: Optional[int] = None
    average_time_between_visits_sec: Optional[float] = None
    night_visit_ratio: Optional[float] = None
    weekend_visit_ratio: Optional[float] = None
    unique_event_types: Optional[int] = None
    unique_cases: Optional[int] = None
    duration_days: Optional[int] = None
    location_entropy: Optional[float] = None
    anomaly_score: Optional[float] = None
    is_anomaly: Optional[int] = None
    risk_band: Optional[str] = None

class LocationAnalyzeResponse(BaseModel):
    analysis: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


# --- Summarizer Schemas ---

class SummarizerRequest(BaseModel):
    case_context: str

class SummarizerResponse(BaseModel):
    summary: str
    fallback: bool = False
    confidence: Optional[float] = 0.9


# --- Lead Generator Schemas ---

class LeadGenerateRequest(BaseModel):
    person_id: Optional[str] = None
    case_id: Optional[str] = None

class LeadItem(BaseModel):
    p1: Optional[str] = None
    p2: Optional[str] = None
    communication_frequency: Optional[int] = None
    average_call_duration: Optional[float] = None
    transaction_count: Optional[int] = None
    total_amount: Optional[float] = None
    average_amount: Optional[float] = None
    shared_case_count: Optional[int] = None
    evidence_count: Optional[int] = None
    multi_source_support: Optional[int] = None
    priority_score: Optional[float] = None
    priority_band: Optional[str] = None

class LeadGenerateResponse(BaseModel):
    leads: List[Dict[str, Any]] = []


# --- Explainability Schemas ---

class ExplainRequest(BaseModel):
    feature_name: str
    feature_value: Any
    direction: str
    person_id: str

class ExplainResponse(BaseModel):
    human_explanation: str
    supporting_evidence: Dict[str, Any]


# --- Health Schema ---

class IntelligenceHealthResponse(BaseModel):
    status: str
    service: str
    models: Dict[str, str]
