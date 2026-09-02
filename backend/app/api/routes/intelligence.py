from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.database.models import User
from backend.app.security.rbac import get_current_user
from backend.app.intelligence.ner.service import ner_service
from backend.app.intelligence.entity_resolution.resolver import entity_resolution_service
from backend.app.api.schemas.intelligence_schema import (
    NERRequest, NERResponse,
    EntityResolutionRequest, EntityResolutionResponse
)

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
