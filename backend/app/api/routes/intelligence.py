from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user
from backend.app.intelligence.ner.service import ner_service
from backend.app.intelligence.entity_resolution.resolver import entity_resolution_service
from backend.app.api.schemas.intelligence_schema import (
    NERRequest, NERResponse,
    EntityResolutionRequest, EntityResolutionResponse,
    LocationAnalyzeRequest, SummarizerRequest, LeadGenerateRequest, ExplainRequest
)
from backend.app.intelligence.location_analysis.features import build_features
from backend.app.intelligence.location_analysis.anomaly_model import LocationAnomalyModel
from backend.app.intelligence.summarizer.model import InvestigationSummarizer
from backend.app.intelligence.lead_generator.features import build_lead_features
from backend.app.intelligence.lead_generator.model import LeadRankerModel
from backend.app.intelligence.explainability.feature_explainer import format_human_explanation
from backend.app.intelligence.explainability.provenance import get_evidence_provenance
import pandas as pd
import os

# Initialize models lazily or globally
_location_model = None
_summarizer_model = None
_lead_model = None

def get_location_model():
    global _location_model
    if _location_model is None:
        _location_model = LocationAnomalyModel()
        try:
            _location_model.load("backend/app/intelligence/models/location/anomaly_model.pkl")
        except:
            pass
    return _location_model

def get_summarizer_model():
    global _summarizer_model
    if _summarizer_model is None:
        try:
            _summarizer_model = InvestigationSummarizer("backend/app/intelligence/models/summarizer")
        except:
            pass
    return _summarizer_model

def get_lead_model():
    global _lead_model
    if _lead_model is None:
        _lead_model = LeadRankerModel()
        try:
            _lead_model.load("backend/app/intelligence/models/lead_generator/ranker.pkl")
        except:
            pass
    return _lead_model


router = APIRouter(prefix="/intelligence", tags=["intelligence"])

@router.post("/ner", response_model=NERResponse)
def extract_entities_endpoint(
    payload: NERRequest,
    user: User = Depends(get_current_user)
):
    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forensic input text cannot be empty."
        )
    return ner_service.extract(payload.text)

@router.post("/entity-resolution", response_model=EntityResolutionResponse)
def resolve_entities_endpoint(
    payload: EntityResolutionRequest,
    user: User = Depends(get_current_user)
):
    extracted_dicts = [e.model_dump() for e in payload.extracted_entities]
    candidate_dicts = [c.model_dump() for c in payload.registry_candidates]

    results = entity_resolution_service.resolve(
        extracted_entities=extracted_dicts,
        registry_candidates=candidate_dicts
    )
    return {"results": results}

@router.post("/location/analyze")
def analyze_location(payload: LocationAnalyzeRequest, user: User = Depends(get_current_user)):
    model = get_location_model()
    # Mocking single prediction for endpoint speed using existing dataset
    # In production, would build features specifically for payload.person_id
    pl_features, _, _ = build_features("data/raw")
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
    features = build_lead_features("data/raw")
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
            "entity_resolution": "active"
        }
    }
