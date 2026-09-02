from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

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
    registry_candidates: List[EntityProfileInput]

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

class LocationAnalyzeRequest(BaseModel):
    person_id: str
    
class SummarizerRequest(BaseModel):
    case_context: str
    
class LeadGenerateRequest(BaseModel):
    person_id: Optional[str] = None
    case_id: Optional[str] = None
    
class ExplainRequest(BaseModel):
    feature_name: str
    feature_value: Any
    direction: str
    person_id: str
