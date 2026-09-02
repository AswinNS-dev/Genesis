from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.repositories.case_repository import CaseRepository
from backend.app.database.models import CaseNote
from backend.app.api.schemas.case_schema import (
    CaseCreateSchema, CaseResponseSchema, CaseNoteCreateSchema, CaseNoteResponseSchema
)
from pydantic import BaseModel

class CasePatchSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    classification: Optional[str] = None
    category: Optional[str] = None
    jurisdiction: Optional[str] = None
    assignedInvestigator: Optional[str] = None

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("", response_model=List[CaseResponseSchema])
def list_cases_endpoint(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    repo = CaseRepository(db)
    cases = repo.list(status=status, search=search)
    return cases

@router.post("", response_model=CaseResponseSchema)
def create_case_endpoint(payload: CaseCreateSchema, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    from backend.app.database.models import InvestigationCase
    count = db.query(InvestigationCase).count()
    cid = payload.caseId or f"CR-2026-{1000 + count + 1}"
    case = repo.create(
        title=payload.title,
        caseId=cid,
        description=payload.description,
        category=payload.category or "Financial Fraud",
        classification=payload.classification or "RESTRICTED",
        caseSource=payload.caseSource,
        jurisdiction=payload.jurisdiction,
        assignedInvestigator=payload.assignedInvestigator,
        status="OPEN"
    )
    return case

# Specific Sub-resources first
@router.get("/{case_id:path}/summary")
def get_case_summary_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    summary = repo.get_summary(case_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Case not found")
    return summary

@router.get("/{case_id:path}/network")
def get_case_network_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    return repo.get_network(case_id)

@router.get("/{case_id:path}/timeline")
def get_case_timeline_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    return repo.get_timeline(case_id)

@router.get("/{case_id:path}/communications")
def get_case_communications_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    return repo.get_communications(case_id)

@router.get("/{case_id:path}/transactions")
def get_case_transactions_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    return repo.get_transactions(case_id)

@router.get("/{case_id:path}/locations")
def get_case_locations_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    return repo.get_locations(case_id)

@router.post("/{case_id:path}/notes", response_model=CaseNoteResponseSchema)
def add_case_note_endpoint(case_id: str, payload: CaseNoteCreateSchema, db: Session = Depends(get_db)):
    case_repo = CaseRepository(db)
    case = case_repo.get_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    note = CaseNote(caseId=case["id"], body=payload.body, author="Investigator")
    db.add(note)
    db.commit()
    db.refresh(note)
    return CaseNoteResponseSchema.model_validate(note)

# Generic {case_id:path} GET and PATCH
@router.get("/{case_id:path}", response_model=CaseResponseSchema)
def get_case_endpoint(case_id: str, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    case = repo.get_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.patch("/{case_id:path}", response_model=CaseResponseSchema)
def patch_case_endpoint(case_id: str, payload: CasePatchSchema, db: Session = Depends(get_db)):
    repo = CaseRepository(db)
    updated = repo.update(case_id, **payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Case not found")
    return updated
