from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user_optional
from backend.app.api.controllers.intelligence_controller import IntelligenceController
from backend.app.api.schemas.intelligence_schema import (
    NERRequest, NERResponse,
    EntityResolutionRequest, EntityResolutionResponse,
    MatchStatusUpdateSchema, MatchStatusUpdateResponse,
    EntityMatchItem,
    LocationAnalyzeRequest, LocationAnalyzeResponse,
    SummarizerRequest, SummarizerResponse,
    LeadGenerateRequest, LeadGenerateResponse,
    ExplainRequest, ExplainResponse,
    IntelligenceHealthResponse
)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.post("/ner", response_model=NERResponse, summary="Extract forensic named entities from text")
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
    ctrl = IntelligenceController(db)
    return ctrl.extract_ner(payload.text, case_id=caseId)


@router.post("/entity-resolution", response_model=EntityResolutionResponse, summary="Resolve multi-signal entity matches")
def resolve_entities_endpoint(
    payload: EntityResolutionRequest,
    caseId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    extracted_dicts = [e.model_dump() for e in payload.extracted_entities]
    candidate_dicts = [c.model_dump() for c in payload.registry_candidates] if payload.registry_candidates else None

    ctrl = IntelligenceController(db)
    results = ctrl.resolve_entities(
        extracted_entities=extracted_dicts,
        registry_candidates=candidate_dicts,
        case_id=caseId
    )
    return {"results": results}


@router.patch("/entity-matches/{match_id}", response_model=MatchStatusUpdateResponse, summary="Update entity match review status")
def update_entity_match_status_endpoint(
    match_id: str,
    payload: MatchStatusUpdateSchema,
    db: Session = Depends(get_db)
):
    ctrl = IntelligenceController(db)
    updated = ctrl.update_match_status(match_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Entity match not found")
    return {"success": True, "id": updated.id, "status": updated.status}


@router.get("/entity-matches", response_model=List[EntityMatchItem], summary="List entity matches requiring review")
def list_entity_matches_endpoint(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    ctrl = IntelligenceController(db)
    return ctrl.list_matches(status_filter=status)


@router.post("/location/analyze", response_model=LocationAnalyzeResponse, summary="Analyze location behavioral anomalies")
def analyze_location_endpoint(
    payload: LocationAnalyzeRequest,
    user: Optional[User] = Depends(get_current_user_optional)
):
    ctrl = IntelligenceController()
    return ctrl.analyze_location_anomalies(payload.person_id)


@router.post("/summarizer/summarize", response_model=SummarizerResponse, summary="Generate automated investigation summary")
def summarize_case_endpoint(
    payload: SummarizerRequest,
    user: Optional[User] = Depends(get_current_user_optional)
):
    ctrl = IntelligenceController()
    return ctrl.summarize_investigation(payload.case_context)


@router.post("/leads/generate", response_model=LeadGenerateResponse, summary="Score and rank investigative leads")
def generate_leads_endpoint(
    payload: LeadGenerateRequest,
    user: Optional[User] = Depends(get_current_user_optional)
):
    ctrl = IntelligenceController()
    leads = ctrl.generate_investigative_leads(person_id=payload.person_id, case_id=payload.case_id)
    return {"leads": leads}


@router.post("/explain/prediction", response_model=ExplainResponse, summary="Explain feature contributions and provenance")
def explain_prediction_endpoint(
    payload: ExplainRequest,
    user: Optional[User] = Depends(get_current_user_optional)
):
    ctrl = IntelligenceController()
    return ctrl.explain_feature_contribution(
        feature_name=payload.feature_name,
        feature_value=payload.feature_value,
        direction=payload.direction,
        person_id=payload.person_id
    )


@router.get("/health", response_model=IntelligenceHealthResponse, summary="Health status for ML services")
def intelligence_health_check_endpoint():
    return IntelligenceController.get_service_health()
