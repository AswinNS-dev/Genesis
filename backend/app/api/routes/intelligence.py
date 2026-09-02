from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.analysis_repository import AnalysisRepository
from backend.app.database.repositories.entity_repository import EntityRepository
from backend.app.intelligence.ner.service import ner_service
from backend.app.intelligence.entity_resolution.resolver import entity_resolution_service
from backend.app.api.schemas.intelligence_schema import (
    NERRequest, NERResponse,
    EntityResolutionRequest, EntityResolutionResponse
)
from pydantic import BaseModel

class MatchStatusUpdateSchema(BaseModel):
    status: str  # APPROVED or REJECTED

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
