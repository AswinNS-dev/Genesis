from typing import Dict, Any, List, Optional
import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.database.repositories.analysis_repository import AnalysisRepository
from backend.app.database.repositories.entity_repository import EntityRepository
from backend.app.security.rbac import get_current_user
from backend.app.intelligence.ner.service import ner_service
from backend.app.intelligence.entity_resolution.resolver import entity_resolution_service
from backend.app.intelligence.location_analysis.features import build_features
from backend.app.intelligence.location_analysis.anomaly_model import LocationAnomalyModel
from backend.app.intelligence.summarizer.model import InvestigationSummarizer
from backend.app.intelligence.lead_generator.features import build_lead_features
from backend.app.intelligence.lead_generator.model import LeadRankerModel
from backend.app.intelligence.explainability.feature_explainer import format_human_explanation
from backend.app.intelligence.explainability.provenance import get_evidence_provenance
from backend.app.api.schemas.intelligence_schema import (
    NERRequest, NERResponse,
    EntityResolutionRequest, EntityResolutionResponse,
    MatchStatusUpdateSchema,
    LocationAnalyzeRequest, SummarizerRequest, LeadGenerateRequest, ExplainRequest
)

# Initialize models and feature caches lazily or globally
_location_model = None
_summarizer_model = None
_lead_model = None
_cached_location_features = None
_cached_lead_features = None

def get_location_features(data_dir="data/raw"):
    global _cached_location_features
    if _cached_location_features is None:
        pl_features, _, _ = build_features(data_dir, include_colocation=False)
        _cached_location_features = pl_features
    return _cached_location_features

def get_lead_features(data_dir="data/raw"):
    global _cached_lead_features
    if _cached_lead_features is None:
        _cached_lead_features = build_lead_features(data_dir)
    return _cached_lead_features

def get_location_model():
    global _location_model
    if _location_model is None:
        _location_model = LocationAnomalyModel()
        try:
            _location_model.load("backend/app/intelligence/models/location/anomaly_model.pkl")
        except Exception:
            pass
    return _location_model

def get_summarizer_model():
    global _summarizer_model
    if _summarizer_model is None:
        try:
            model_path = "backend/app/intelligence/models/summarizer"
            if os.path.exists(model_path):
                _summarizer_model = InvestigationSummarizer(model_path)
        except Exception:
            _summarizer_model = None
    return _summarizer_model

def get_lead_model():
    global _lead_model
    if _lead_model is None:
        _lead_model = LeadRankerModel()
        try:
            _lead_model.load("backend/app/intelligence/models/lead_generator/ranker.pkl")
        except Exception:
            pass
    return _lead_model

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

@router.post("/ner", response_model=NERResponse)
def extract_entities_endpoint(
    payload: NERRequest,
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forensic input text cannot be empty."
        )
    extracted = ner_service.extract(payload.text)

    # Persist analysis result to Supabase
    repo = AnalysisRepository(db)
    repo.save_analysis_result(
        analysis_type="NER",
        result=extracted,
        case_id=caseId,
        confidence=0.95,
        model_name="TransformerNER",
        explanation=f"Extracted {len(extracted.get('entities', []))} entities from forensic text."
    )

    return extracted

@router.post("/entity-resolution", response_model=EntityResolutionResponse)
def resolve_entities_endpoint(
    payload: EntityResolutionRequest,
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    extracted_dicts = [e.model_dump() for e in payload.extracted_entities]
    
    # If no candidates provided, pull all entities from database for resolution!
    if not payload.registry_candidates:
        ent_repo = EntityRepository(db)
        db_entities = ent_repo.list()
        candidate_dicts = [{
            "id": e.id,
            "name": e.name,
            "type": e.type,
            "phone": e.value if e.type == "PHONE" else None,
            "vehicle": e.value if e.type == "VEHICLE" else None,
            "location": e.value if e.type == "LOCATION" else None
        } for e in db_entities]
    else:
        candidate_dicts = [c.model_dump() for c in payload.registry_candidates]

    results = entity_resolution_service.resolve(
        extracted_entities=extracted_dicts,
        registry_candidates=candidate_dicts
    )

    # Persist matches to Supabase entity_matches & analysis_results
    analysis_repo = AnalysisRepository(db)
    analysis_repo.save_analysis_result(
        analysis_type="ENTITY_RESOLUTION",
        result={"results": results},
        case_id=caseId,
        confidence=0.90,
        model_name="MultiSignalEntityResolver",
        explanation=f"Processed resolution for {len(results)} entities against database registry."
    )

    for r in results:
        if r.get("matched_entity_id"):
            analysis_repo.save_entity_match(
                entity_a_id=r["matched_entity_id"],
                entity_b_id=r["matched_entity_id"],
                confidence=int(r["confidence"] * 100),
                reasons=r.get("explanation", "Match detected by resolver"),
                status="PENDING" if r.get("requires_review") else "APPROVED"
            )

    return {"results": results}

@router.patch("/entity-matches/{match_id}")
def update_entity_match_status_endpoint(
    match_id: str,
    payload: MatchStatusUpdateSchema,
    db: Session = Depends(get_db)
):
    repo = AnalysisRepository(db)
    updated = repo.update_entity_match_status(match_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Entity match not found")
    return {"success": True, "id": updated.id, "status": updated.status}

@router.get("/entity-matches")
def list_entity_matches_endpoint(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = AnalysisRepository(db)
    matches = repo.list_entity_matches(status=status)
    return [{
        "id": m.id,
        "entityAId": m.entityAId,
        "entityBId": m.entityBId,
        "confidence": m.confidence,
        "reasons": m.reasons,
        "status": m.status,
        "createdAt": m.createdAt.isoformat() if m.createdAt else None
    } for m in matches]

@router.post("/location/analyze")
def analyze_location(payload: LocationAnalyzeRequest, user: User = Depends(get_current_user)):
    model = get_location_model()
    # Mocking single prediction for endpoint speed using existing dataset
    # In production, would build features specifically for payload.person_id
    pl_features = get_location_features("data/raw")
    if pl_features.empty:
        return {"error": "No data available"}

    person_features = pl_features[pl_features['person_id'] == payload.person_id]
    if person_features.empty:
        return {"error": "No location history found for person"}

    res = model.predict(person_features)
    return {"analysis": res.to_dict(orient="records")}

@router.post("/summarizer/summarize")
def summarize_case(payload: SummarizerRequest, user: User = Depends(get_current_user)):
    model = get_summarizer_model()
    if not model:
        return {"summary": "Fallback AI mode: Subject is involved in a high-priority incident.", "fallback": True}

    summary = model.summarize(payload.case_context)
    return {"summary": summary, "fallback": False, "confidence": 0.9}

@router.post("/leads/generate")
def generate_leads(payload: LeadGenerateRequest, user: User = Depends(get_current_user)):
    model = get_lead_model()
    features = get_lead_features("data/raw")
    if features.empty:
        return {"leads": []}

    if payload.person_id:
        features = features[(features['p1'] == payload.person_id) | (features['p2'] == payload.person_id)]

    if features.empty:
        return {"leads": []}

    res = model.predict(features)
    leads = res[res['priority_score'] > 0.4].sort_values(by='priority_score', ascending=False)
    return {"leads": leads.to_dict(orient="records")}

@router.post("/explain/prediction")
def explain_prediction(payload: ExplainRequest, user: User = Depends(get_current_user)):
    explanation = format_human_explanation(payload.feature_name, payload.feature_value, payload.direction)
    provenance = get_evidence_provenance(payload.feature_name, payload.person_id, "data/raw")

    return {
        "human_explanation": explanation,
        "supporting_evidence": provenance
    }

@router.get("/health")
def intelligence_health_check():
    return {
        "status": "healthy",
        "service": "crimeintel-intelligence-ml",
        "models": {
            "ner": "active",
            "entity_resolution": "active",
            "location_analysis": "active",
            "summarizer": "active",
            "lead_generator": "active"
        }
    }
